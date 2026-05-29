/**
 * Orchestrator ruchów botów.
 *
 * Trzy fazy:
 *   handleNarratorIfBot   — gdy runda zaczyna się od narratora-bota
 *   handleBotSubmissions  — boty (nie-narrator) przesyłają karty
 *   handleBotVotes        — boty głosują na submission
 *
 * Uwaga: _endRound importowane lazy (wymagany do require w funkcji),
 * aby uniknąć circular dep z gameHandler.js.
 */
const prisma = require('../config/db');
const botClient = require('./botClient');
const { startPhaseTimer } = require('./gameTimer');

const BOT_THINK_MS = 1200;
const delay = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Faza 1: narrator = bot
// ─────────────────────────────────────────────────────────────────────────────
async function handleNarratorIfBot(io, gameId, round) {
    const narrator = await prisma.room_players.findUnique({ where: { id: round.narrator_player_id } });
    if (!narrator?.is_bot) return;

    // Idempotency: nie ruszaj jeśli submission już istnieje
    const existingSub = await prisma.round_submissions.findFirst({
        where: { round_id: round.id, player_id: narrator.id }
    });
    if (existingSub) return;

    await delay(BOT_THINK_MS);

    try {
        const hand = await prisma.player_hands.findMany({
            where: { game_id: gameId, player_id: narrator.id }
        });
        if (!hand.length) {
            console.error('[Bot] Narrator bot has no cards in hand');
            return;
        }

        // Wybierz kartę losowo (fallback jeśli AI zawiedzie)
        const chosenCardId = hand[Math.floor(Math.random() * hand.length)].card_id;

        let clue;
        try {
            clue = await botClient.narratorPrompt(chosenCardId);
        } catch (err) {
            console.error('[Bot] narratorPrompt failed, using fallback:', err.message);
            clue = 'mystery';
        }

        await prisma.$transaction(async tx => {
            await tx.rounds.update({
                where: { id: round.id },
                data: { prompt: clue, narrator_card_id: chosenCardId, status: 'submitting' }
            });
            await tx.round_submissions.create({
                data: { round_id: round.id, player_id: narrator.id, card_id: chosenCardId, is_narrator_card: true }
            });
        });

        io.to(gameId).emit('prompt_submitted', { prompt: clue, narrator_player_id: narrator.id });
        startPhaseTimer(io, gameId, 'submitting');

        await handleBotSubmissions(io, gameId, round.id, clue);
    } catch (err) {
        console.error('[Bot] handleNarratorIfBot error:', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Faza 2: boty (nie-narrator) przesyłają karty
// ─────────────────────────────────────────────────────────────────────────────
async function handleBotSubmissions(io, gameId, roundId, clue) {
    // Re-query dla aktualnego statusu
    const round = await prisma.rounds.findUnique({
        where: { id: roundId },
        include: { games: { include: { rooms: { include: { room_players: true } } } } }
    });
    if (!round || round.status !== 'submitting') return;

    const allPlayers = round.games.rooms.room_players;
    const botSubmitters = allPlayers.filter(p => p.is_bot && p.id !== round.narrator_player_id);

    for (const bot of botSubmitters) {
        const existing = await prisma.round_submissions.findFirst({
            where: { round_id: roundId, player_id: bot.id }
        });
        if (existing) continue;

        await delay(BOT_THINK_MS);

        try {
            const hand = await prisma.player_hands.findMany({
                where: { game_id: gameId, player_id: bot.id }
            });
            if (!hand.length) continue;

            let chosenCardId;
            try {
                const cardIds = hand.map(h => h.card_id);
                const idx = await botClient.chooseCard(clue, cardIds);
                chosenCardId = cardIds[Math.max(0, Math.min(idx, cardIds.length - 1))];
            } catch {
                chosenCardId = hand[Math.floor(Math.random() * hand.length)].card_id;
            }

            await prisma.round_submissions.create({
                data: { round_id: roundId, player_id: bot.id, card_id: chosenCardId, is_narrator_card: false }
            });

            io.to(gameId).emit('player_submitted_card', { player_id: bot.id });

            // Sprawdź czy wszyscy przesłali
            const submissionCount = await prisma.round_submissions.count({ where: { round_id: roundId } });
            if (submissionCount >= allPlayers.length) {
                await _transitionToVoting(io, gameId, round, allPlayers);
                return;
            }
        } catch (err) {
            console.error('[Bot] handleBotSubmissions error for', bot.id, ':', err);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pomocnik: przejście do fazy głosowania (współdzielony z socket handlerem)
// ─────────────────────────────────────────────────────────────────────────────
async function _transitionToVoting(io, gameId, round, allPlayers) {
    await prisma.rounds.update({ where: { id: round.id }, data: { status: 'voting' } });

    const allSubmissions = await prisma.round_submissions.findMany({
        where: { round_id: round.id },
        include: { cards: true }
    });

    const shuffled = allSubmissions
        .map(s => ({ submission_id: s.id, card: s.cards }))
        .sort(() => Math.random() - 0.5);

    io.to(gameId).emit('start_voting', { cards: shuffled });
    startPhaseTimer(io, gameId, 'voting');

    await handleBotVotes(io, gameId, round, allSubmissions, allPlayers);
}

// ─────────────────────────────────────────────────────────────────────────────
// Faza 3: boty głosują
// ─────────────────────────────────────────────────────────────────────────────
async function handleBotVotes(io, gameId, round, allSubmissions, allPlayers) {
    const clue = round.prompt;
    const narratorId = round.narrator_player_id;
    const botVoters = allPlayers.filter(p => p.is_bot && p.id !== narratorId);

    for (const bot of botVoters) {
        const existing = await prisma.round_votes.findFirst({
            where: { round_id: round.id, voter_player_id: bot.id }
        });
        if (existing) continue;

        await delay(BOT_THINK_MS);

        try {
            // Bot nie może głosować na swoją kartę
            const votable = allSubmissions.filter(s => s.player_id !== bot.id);
            if (!votable.length) continue;

            let chosenSubmissionId;
            try {
                const cardIds = votable.map(s => s.card_id);
                const idx = await botClient.chooseCard(clue, cardIds);
                chosenSubmissionId = votable[Math.max(0, Math.min(idx, votable.length - 1))].id;
            } catch {
                chosenSubmissionId = votable[Math.floor(Math.random() * votable.length)].id;
            }

            await prisma.round_votes.create({
                data: { round_id: round.id, voter_player_id: bot.id, voted_submission_id: chosenSubmissionId }
            });

            io.to(gameId).emit('player_voted', { player_id: bot.id });

            const voteCount = await prisma.round_votes.count({ where: { round_id: round.id } });
            if (voteCount >= allPlayers.length - 1) {
                // Lazy require — unika circular dep z gameHandler
                const { _endRound } = require('../handlers/gameHandler');
                await _endRound(io, gameId, round, allPlayers);
                return;
            }
        } catch (err) {
            console.error('[Bot] handleBotVotes error for', bot.id, ':', err);
        }
    }
}

module.exports = { handleNarratorIfBot, handleBotSubmissions, handleBotVotes, _transitionToVoting };
