const prisma = require('../config/db');

// Map to hold in-memory state or timeouts if necessary
// const activeGames = new Map();

module.exports = (io, socket) => {
    socket.on('connect_to_game', async ({ game_id }) => {
        try {
            if (socket.game_id)
                return socket.emit('error', { message: 'Nie można dołączyć do więcej niż jednej gry naraz' });

            const user_id = socket.user.id; // From JWT payload

            // Find if player is in the game's room
            const game = await prisma.games.findUnique({
                where: { id: game_id },
                include: {
                    rooms: {
                        include: { room_players: true }
                    }
                }
            });

            if (!game) {
                return socket.emit('error', { message: 'Gra nie istnieje' });
            }

            const player = game.rooms.room_players.find(p => p.user_id === user_id);
            if (!player) {
                return socket.emit('error', { message: 'Nie jesteś uczestnikiem tej gry' });
            }

            // Fetch current round state
            const currentRound = await prisma.rounds.findFirst({
                where: { game_id: game_id },
                orderBy: { round_number: 'desc' },
                include: {
                    round_submissions: true,
                    round_votes: true
                }
            });

            // Fetch player's hand
            const hand = await prisma.player_hands.findMany({
                where: { game_id: game_id, player_id: player.id },
                include: { cards: true }
            });

            socket.emit('connected_to_game', {
                game_state: {
                    status: game.status,
                    current_round: game.current_round,
                },
                round_state: currentRound,
                hand: hand.map(h => h.cards),
                player_id: player.id
            });

            socket.player_id = player.id;
            socket.game_id = game_id;
            socket.join(game_id);
            console.log(`Gracz ${socket.user.login} (Socket ${socket.id}) dołączył do pokoju gry ${game_id}`);
        } catch (err) {
            console.error(err);
            socket.emit('error', { message: 'Błąd podczas dołączania do gry' });
        }
    });

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

            // Update round with prompt and narrator's card
            await prisma.rounds.update({
                where: { id: round.id },
                data: {
                    prompt: prompt,
                    narrator_card_id: card_id,
                    status: 'submitting'
                }
            });

            // Create a submission for the narrator
            await prisma.round_submissions.create({
                data: {
                    round_id: round.id,
                    player_id: socket.player_id,
                    card_id: card_id,
                    is_narrator_card: true
                }
            });

            io.to(socket.game_id).emit('prompt_submitted', { prompt });
        } catch (err) {
            console.error(err);
            socket.emit('error', { message: 'Błąd podczas przesyłania hasła' });
        }
    });

    socket.on('submit_card', async ({ card_id }) => {
        try {
            if (!socket.player_id || !socket.game_id)
                return socket.emit('error', { message: 'Nie jesteś połączony z żadną grą' });

            const round = await prisma.rounds.findFirst({
                where: { game_id: socket.game_id, status: 'submitting' },
                orderBy: { round_number: 'desc' },
                include: {
                    games: {
                        include: {
                            rooms: { include: { room_players: true } }
                        }
                    },
                    round_submissions: true
                }
            });

            if (!round) return socket.emit('error', { message: 'Aktualnie nie można przesyłać kart' });
            
            // Sprawdź czy gracz już przesłał kartę
            if (round.round_submissions.some(s => s.player_id === socket.player_id)) {
                return socket.emit('error', { message: 'Już przesłałeś kartę w tej rundzie' });
            }

            await prisma.round_submissions.create({
                data: {
                    round_id: round.id,
                    player_id: socket.player_id,
                    card_id: card_id,
                    is_narrator_card: false
                }
            });

            io.to(socket.game_id).emit('player_submitted_card', { player_id: socket.player_id });

            // Sprawdź czy wszyscy gracze przesłali karty
            const totalPlayers = round.games.rooms.room_players.length;
            const currentSubmissions = round.round_submissions.length + 1; // +1 includes current submission

            if (currentSubmissions >= totalPlayers) {
                // Przejście do fazy głosowania
                await prisma.rounds.update({
                    where: { id: round.id },
                    data: { status: 'voting' }
                });
                
                const allSubmissions = await prisma.round_submissions.findMany({
                    where: { round_id: round.id },
                    include: { cards: true }
                });

                // Zwróć potasowane karty do głosowania bez ID graczy
                const shuffledCards = allSubmissions.map(s => ({
                    submission_id: s.id,
                    card: s.cards
                })).sort(() => Math.random() - 0.5);

                io.to(socket.game_id).emit('start_voting', { cards: shuffledCards });
            }

        } catch (err) {
            console.error(err);
            socket.emit('error', { message: 'Błąd podczas przesyłania karty' });
        }
    });

    socket.on('submit_vote', async ({ submission_id }) => {
        try {
             if (!socket.player_id || !socket.game_id)
                return socket.emit('error', { message: 'Nie jesteś połączony z żadną grą' });

            const round = await prisma.rounds.findFirst({
                where: { game_id: socket.game_id, status: 'voting' },
                orderBy: { round_number: 'desc' },
                include: {
                    games: {
                        include: {
                            rooms: { include: { room_players: true } }
                        }
                    },
                    round_votes: true,
                    round_submissions: true
                }
            });

            if (!round) return socket.emit('error', { message: 'Głosowanie nie jest teraz aktywne' });

            // Check if voted card exists in submissions
            const submission = round.round_submissions.find(s => s.id === submission_id);
            if (!submission) return socket.emit('error', { message: 'Taka karta nie została zgłoszona' });
            
            // Cannot vote for own card
            if (submission.player_id === socket.player_id) {
                 return socket.emit('error', { message: 'Nie możesz głosować na swoją kartę' });
            }

            // Narrator nie może głosować
            if (socket.player_id === round.narrator_player_id) {
                 return socket.emit('error', { message: 'Narrator nie może głosować' });
            }

            // Check if already voted
            if (round.round_votes.some(v => v.voter_player_id === socket.player_id)) {
                 return socket.emit('error', { message: 'Już oddałeś głos w tej rundzie' });
            }

            await prisma.round_votes.create({
                data: {
                    round_id: round.id,
                    voter_player_id: socket.player_id,
                    voted_submission_id: submission_id
                }
            });

            io.to(socket.game_id).emit('player_voted', { player_id: socket.player_id });

            // Check if everyone except narrator voted
            const totalPlayers = round.games.rooms.room_players.length;
            const currentVotes = round.round_votes.length + 1; // +1 includes current vote

            if (currentVotes >= totalPlayers - 1) { // Narrator nie głosuje
                // Koniec rundy
                await prisma.rounds.update({
                    where: { id: round.id },
                    data: { status: 'ended' }
                });

                // Tutaj normalnie byłaby logika podliczania punktów (scoring)

                io.to(socket.game_id).emit('round_ended', { 
                    round_id: round.id 
                });
            }

        } catch (err) {
            console.error(err);
            socket.emit('error', { message: 'Błąd podczas głosowania' });
        }
    });

    socket.on('disconnect_from_game', () => {
        if (!socket.game_id) return;
        socket.leave(socket.game_id);
        console.log(`Gracz (Socket ${socket.id}) opuścił pokój gry ${socket.game_id}`);
        socket.player_id = null;
        socket.game_id = null;
    });
};
