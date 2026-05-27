const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/game/:id — stan gry (do reconnektu)
router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const game = await prisma.games.findUnique({
            where: { id },
            include: {
                rooms: { include: { room_players: true } }
            }
        });

        if (!game) return res.status(404).json({ error: 'Gra nie istnieje' });

        // Sprawdź czy gracz jest uczestnikiem
        const player = game.rooms.room_players.find(p => p.user_id === userId);
        if (!player) return res.status(403).json({ error: 'Nie jesteś uczestnikiem tej gry' });

        const currentRound = await prisma.rounds.findFirst({
            where: { game_id: id },
            orderBy: { round_number: 'desc' }
        });

        const hand = await prisma.player_hands.findMany({
            where: { game_id: id, player_id: player.id },
            include: { cards: true }
        });

        const scores = await prisma.game_scores.findMany({
            where: { game_id: id },
            include: { room_players: { include: { users: { select: { username: true } } } } },
            orderBy: { score: 'desc' }
        });

        return res.json({
            game_id: game.id,
            status: game.status,
            current_round: game.current_round,
            player_id: player.id,
            round: currentRound ? {
                id: currentRound.id,
                round_number: currentRound.round_number,
                status: currentRound.status,
                narrator_player_id: currentRound.narrator_player_id,
                prompt: currentRound.prompt
            } : null,
            hand: hand.map(h => h.cards),
            scores: scores.map(s => ({
                player_id: s.player_id,
                username: s.room_players.users?.username ?? null,
                is_bot: s.room_players.is_bot,
                score: s.score
            }))
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd pobierania stanu gry' });
    }
});

module.exports = router;
