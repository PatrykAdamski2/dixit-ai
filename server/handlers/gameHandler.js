const prisma = require('../config/db');
const { calculateScores } = require('../lib/scoring');

const HAND_SIZE = 6; // docelowa liczba kart w ręce

// ---------------------------------------------------------------------------
// Pomocnik: uzupełnij rękę gracza do HAND_SIZE kart
// ---------------------------------------------------------------------------
async function drawCards(tx, gameId, playerId, count) {
    const game = await tx.games.findUnique({
        where: { id: gameId },
        include: { rooms: { include: { card_sets: { include: { cards: true } } } } }
    });

    const allCards = game.rooms.card_sets?.cards ?? [];

    // Karty już w ręce
    const currentHand = await tx.player_hands.findMany({
        where: { game_id: gameId, player_id: playerId }
    });
    const inHand = new Set(currentHand.map(h => h.card_id));

    // Karty użyte w historii tej gry
    const history = await tx.player_card_history.findMany({
        where: { game_id: gameId, player_id: playerId }
    });
    history.forEach(h => inHand.add(h.card_id));

    const available = allCards.filter(c => !inHand.has(c.id));
    const shuffled = available.sort(() => Math.random() - 0.5);
    const toDeal = shuffled.slice(0, count);

    for (const card of toDeal) {
        await tx.player_hands.create({
            data: { game_id: gameId, player_id: playerId, card_id: card.id }
        });
    }
    return toDeal;
}

// ---------------------------------------------------------------------------
// Pomocnik: sprawdź warunek końca gry
// ---------------------------------------------------------------------------
function isGameOver(room, totalScores) {
    if (room.end_condition === 'points' && room.point_limit) {
        return Object.values(totalScores).some(s => s >= room.point_limit);
    }
    return false;
}

// ---------------------------------------------------------------------------
module.exports = (io, socket) => {

    socket.on('connect_to_game', async ({ game_id }) => {
        try {
            if (socket.game_id)
                return socket.emit('error', { message: 'Nie można dołączyć do więcej niż jednej gry naraz' });

            const user_id = socket.user.id;

            const game = await prisma.games.findUnique({
                where: { id: game_id },
                include: {
                    rooms: { include: { room_players: true } }
                }
            });

            if (!game) return socket.emit('error', { message: 'Gra nie istnieje' });

            const player = game.rooms.room_players.find(p => p.user_id === user_id);
            if (!player) return socket.emit('error', { message: 'Nie jesteś uczestnikiem tej gry' });

            const currentRound = await prisma.rounds.findFirst({
                where: { game_id },
                orderBy: { round_number: 'desc' },
                include: { round_submissions: true, round_votes: true }
            });

            const hand = await prisma.player_hands.findMany({
                where: { game_id, player_id: player.id },
                include: { cards: true }
            });

            const scores = await prisma.game_scores.findMany({
                where: { game_id },
                include: { room_players: { include: { users: true } } }
            });

            socket.emit('connected_to_game', {
                game_state: {
                    status: game.status,
                    current_round: game.current_round,
                },
                round_state: currentRound,
                hand: hand.map(h => h.cards),
                player_id: player.id,
                scores: scores.map(s => ({
                    player_id: s.player_id,
                    username: s.room_players.users?.username ?? null,
                    score: s.score
                }))
            });

            socket.player_id = player.id;
            socket.game_id = game_id;
            socket.join(game_id);
            console.log(`Gracz ${socket.user.login} dołączył do gry ${game_id}`);
        } catch (err) {
            console.error(err);
            socket.emit('error', { message: 'Błąd podczas dołączania do gry' });
        }
    });

    // -----------------------------------------------------------------------
    socket.on('submit_prompt', async ({ card_id, prompt }) => {
        try {
            if (!socket.player_id || !socket.game_id)
                return socket.emit('error', { message: 'Nie jesteś połączony z żadną grą' });

            const round = await prisma.rounds.findFirst({
                where: {
                    game_id: socket.game_id,
                    status: 'prompting',
                    narrator_player_id: socket.player_id
                },
                orderBy: { round_number: 'desc' }
            });

            if (!round) return socket.emit('error', { message: 'To nie twój ruch jako narratora, albo runda jest w innej fazie' });

            // Sprawdź czy gracz ma tę kartę w ręce
            const handCard = await prisma.player_hands.findFirst({
                where: { game_id: socket.game_id, player_id: socket.player_id, card_id }
            });
            if (!handCard) return socket.emit('error', { message: 'Nie masz tej karty w ręce' });

            await prisma.rounds.update({
                where: { id: round.id },
                data: { prompt, narrator_card_id: card_id, status: 'submitting' }
            });

            await prisma.round_submissions.create({
                data: {
                    round_id: round.id,
                    player_id: socket.player_id,
                    card_id,
                    is_narrator_card: true
                }
            });

            io.to(socket.game_id).emit('prompt_submitted', {
                prompt,
                narrator_player_id: socket.player_id
            });
        } catch (err) {
            console.error(err);
            socket.emit('error', { message: 'Błąd podczas przesyłania hasła' });
        }
    });

    // -----------------------------------------------------------------------
    socket.on('submit_card', async ({ card_id }) => {
        try {
            if (!socket.player_id || !socket.game_id)
                return socket.emit('error', { message: 'Nie jesteś połączony z żadną grą' });

            const round = await prisma.rounds.findFirst({
                where: { game_id: socket.game_id, status: 'submitting' },
                orderBy: { round_number: 'desc' },
                include: {
                    games: {
                        include: { rooms: { include: { room_players: true } } }
                    },
                    round_submissions: true
                }
            });

            if (!round) return socket.emit('error', { message: 'Aktualnie nie można przesyłać kart' });

            // Narrator nie może submit_card (już zrobił submit_prompt)
            if (socket.player_id === round.narrator_player_id)
                return socket.emit('error', { message: 'Narrator już wybrał kartę przez submit_prompt' });

            if (round.round_submissions.some(s => s.player_id === socket.player_id))
                return socket.emit('error', { message: 'Już przesłałeś kartę w tej rundzie' });

            const handCard = await prisma.player_hands.findFirst({
                where: { game_id: socket.game_id, player_id: socket.player_id, card_id }
            });
            if (!handCard) return socket.emit('error', { message: 'Nie masz tej karty w ręce' });

            await prisma.round_submissions.create({
                data: {
                    round_id: round.id,
                    player_id: socket.player_id,
                    card_id,
                    is_narrator_card: false
                }
            });

            io.to(socket.game_id).emit('player_submitted_card', { player_id: socket.player_id });

            // Licz submissiony z DB po insercie — unika race condition
            const totalPlayers = round.games.rooms.room_players.length;
            const currentSubmissionCount = await prisma.round_submissions.count({
                where: { round_id: round.id }
            });

            if (currentSubmissionCount >= totalPlayers) {
                await prisma.rounds.update({
                    where: { id: round.id },
                    data: { status: 'voting' }
                });

                const allSubmissions = await prisma.round_submissions.findMany({
                    where: { round_id: round.id },
                    include: { cards: true }
                });

                const shuffledCards = allSubmissions
                    .map(s => ({ submission_id: s.id, card: s.cards }))
                    .sort(() => Math.random() - 0.5);

                io.to(socket.game_id).emit('start_voting', { cards: shuffledCards });
            }
        } catch (err) {
            console.error(err);
            socket.emit('error', { message: 'Błąd podczas przesyłania karty' });
        }
    });

    // -----------------------------------------------------------------------
    socket.on('submit_vote', async ({ submission_id }) => {
        try {
            if (!socket.player_id || !socket.game_id)
                return socket.emit('error', { message: 'Nie jesteś połączony z żadną grą' });

            const round = await prisma.rounds.findFirst({
                where: { game_id: socket.game_id, status: 'voting' },
                orderBy: { round_number: 'desc' },
                include: {
                    games: {
                        include: { rooms: { include: { room_players: true } } }
                    },
                    round_votes: true,
                    round_submissions: true
                }
            });

            if (!round) return socket.emit('error', { message: 'Głosowanie nie jest teraz aktywne' });

            const submission = round.round_submissions.find(s => s.id === submission_id);
            if (!submission) return socket.emit('error', { message: 'Taka karta nie została zgłoszona' });

            if (submission.player_id === socket.player_id)
                return socket.emit('error', { message: 'Nie możesz głosować na swoją kartę' });

            if (socket.player_id === round.narrator_player_id)
                return socket.emit('error', { message: 'Narrator nie może głosować' });

            if (round.round_votes.some(v => v.voter_player_id === socket.player_id))
                return socket.emit('error', { message: 'Już oddałeś głos w tej rundzie' });

            await prisma.round_votes.create({
                data: {
                    round_id: round.id,
                    voter_player_id: socket.player_id,
                    voted_submission_id: submission_id
                }
            });

            io.to(socket.game_id).emit('player_voted', { player_id: socket.player_id });

            const allPlayers = round.games.rooms.room_players;
            const totalPlayers = allPlayers.length;

            // Licz głosy bezpośrednio z DB po insercie — unika race condition
            const currentVoteCount = await prisma.round_votes.count({
                where: { round_id: round.id }
            });

            if (currentVoteCount >= totalPlayers - 1) { // narrator nie głosuje
                await _endRound(io, socket.game_id, round, allPlayers);
            }
        } catch (err) {
            console.error(err);
            socket.emit('error', { message: 'Błąd podczas głosowania' });
        }
    });

    // -----------------------------------------------------------------------
    socket.on('disconnect_from_game', () => {
        if (!socket.game_id) return;
        socket.leave(socket.game_id);
        socket.player_id = null;
        socket.game_id = null;
    });
};

// ---------------------------------------------------------------------------
// Zakończenie rundy: punktacja → następna runda lub koniec gry
// ---------------------------------------------------------------------------
async function _endRound(io, gameId, round, allPlayers) {
    const allSubmissions = await prisma.round_submissions.findMany({
        where: { round_id: round.id },
        include: { cards: true }
    });
    const allVotes = await prisma.round_votes.findMany({
        where: { round_id: round.id }
    });

    const roundScores = calculateScores(round, allSubmissions, allVotes, allPlayers);

    // Zaktualizuj game_scores i historię kart w transakcji
    const updatedTotals = await prisma.$transaction(async (tx) => {
        // Oznacz rundę jako zakończoną
        await tx.rounds.update({
            where: { id: round.id },
            data: { status: 'ended' }
        });

        const totals = {};

        for (const [playerId, pts] of Object.entries(roundScores)) {
            const updated = await tx.game_scores.update({
                where: { game_id_player_id: { game_id: gameId, player_id: playerId } },
                data: { score: { increment: pts } }
            });
            totals[playerId] = updated.score;

            // Przenieś zagrane karty do historii i usuń z ręki
            const sub = allSubmissions.find(s => s.player_id === playerId);
            if (sub) {
                // Sprawdź czy wpis historii już istnieje (unikaj duplikatu bez .catch w transakcji)
                const existingHistory = await tx.player_card_history.findFirst({
                    where: { game_id: gameId, player_id: playerId, card_id: sub.card_id }
                });
                if (!existingHistory) {
                    await tx.player_card_history.create({
                        data: { game_id: gameId, player_id: playerId, card_id: sub.card_id }
                    });
                }

                await tx.player_hands.deleteMany({
                    where: { game_id: gameId, player_id: playerId, card_id: sub.card_id }
                });
            }
        }

        return totals;
    });

    // Uzupełnij ręce graczy (dociągnij 1 kartę każdy)
    try {
        await prisma.$transaction(async (tx) => {
            for (const player of allPlayers) {
                await drawCards(tx, gameId, player.id, 1);
            }
        });
    } catch (err) {
        console.error('Błąd dobierania kart:', err);
    }

    // Przygotuj wyniki do wysłania
    const roundResultScores = allPlayers.map(p => ({
        player_id: p.id,
        round_points: roundScores[p.id] ?? 0,
        total_score: updatedTotals[p.id] ?? 0
    }));

    // Sprawdź warunek końca gry
    const game = await prisma.games.findUnique({
        where: { id: gameId },
        include: { rooms: true }
    });

    const gameOver = isGameOver(game.rooms, updatedTotals);

    if (gameOver || (game.rooms.end_condition === 'rounds' && game.current_round >= game.rooms.round_limit)) {
        // Zakończ grę
        await prisma.$transaction(async (tx) => {
            await tx.games.update({
                where: { id: gameId },
                data: { status: 'finished', ended_at: new Date() }
            });
            await tx.rooms.update({
                where: { id: game.room_id },
                data: { status: 'finished' }
            });

            // Aktualizuj user_stats
            const scores = await tx.game_scores.findMany({
                where: { game_id: gameId },
                include: { room_players: true },
                orderBy: { score: 'desc' }
            });

            const maxScore = scores[0]?.score ?? 0;

            for (let i = 0; i < scores.length; i++) {
                const gs = scores[i];
                const userId = gs.room_players.user_id;
                if (!userId) continue; // bot

                await tx.game_scores.update({
                    where: { id: gs.id },
                    data: { rank: i + 1 }
                });

                const isWinner = gs.score === maxScore && i === 0;
                const existingStat = await tx.user_stats.findFirst({ where: { user_id: userId } });
                if (existingStat) {
                    await tx.user_stats.update({
                        where: { id: existingStat.id },
                        data: {
                            games_played: { increment: 1 },
                            games_won: { increment: isWinner ? 1 : 0 },
                            total_points: { increment: gs.score }
                        }
                    });
                } else {
                    await tx.user_stats.create({
                        data: {
                            user_id: userId,
                            games_played: 1,
                            games_won: isWinner ? 1 : 0,
                            total_points: gs.score
                        }
                    });
                }
            }
        });

        io.to(gameId).emit('round_ended', {
            round_id: round.id,
            scores: roundResultScores,
            narrator_submission_id: allSubmissions.find(s => s.is_narrator_card)?.id,
            submissions: allSubmissions.map(s => ({
                submission_id: s.id,
                player_id: s.player_id,
                card: s.cards
            })),
            votes: allVotes
        });

        io.to(gameId).emit('game_over', {
            scores: roundResultScores.sort((a, b) => b.total_score - a.total_score)
        });
        return;
    }

    // Następna runda
    const newRoundNumber = game.current_round + 1;
    const narratorIndex = allPlayers.findIndex(p => p.id === round.narrator_player_id);
    const nextNarrator = allPlayers[(narratorIndex + 1) % allPlayers.length];

    await prisma.$transaction(async (tx) => {
        await tx.games.update({
            where: { id: gameId },
            data: { current_round: newRoundNumber }
        });

        await tx.rounds.create({
            data: {
                game_id: gameId,
                round_number: newRoundNumber,
                narrator_player_id: nextNarrator.id,
                status: 'prompting'
            }
        });
    });

    io.to(gameId).emit('round_ended', {
        round_id: round.id,
        scores: roundResultScores,
        narrator_submission_id: allSubmissions.find(s => s.is_narrator_card)?.id,
        submissions: allSubmissions.map(s => ({
            submission_id: s.id,
            player_id: s.player_id,
            card: s.cards
        })),
        votes: allVotes
    });

    io.to(gameId).emit('new_round', {
        round_number: newRoundNumber,
        narrator_player_id: nextNarrator.id,
        status: 'prompting'
    });
}
