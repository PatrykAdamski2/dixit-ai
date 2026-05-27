const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/stats/leaderboard — top 10 graczy wg total_points
router.get('/leaderboard', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 100);

        const stats = await prisma.user_stats.findMany({
            orderBy: { total_points: 'desc' },
            take: limit,
            include: { users: { select: { username: true } } }
        });

        return res.json(stats.map((s, i) => ({
            rank: i + 1,
            username: s.users.username,
            total_points: s.total_points,
            games_played: s.games_played,
            games_won: s.games_won
        })));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd pobierania leaderboardu' });
    }
});

// GET /api/stats/me — statystyki zalogowanego gracza
router.get('/me', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const stats = await prisma.user_stats.findFirst({
            where: { user_id: userId }
        });

        if (!stats) {
            return res.json({
                games_played: 0,
                games_won: 0,
                total_points: 0
            });
        }

        return res.json({
            games_played: stats.games_played,
            games_won: stats.games_won,
            total_points: stats.total_points,
            updated_at: stats.updated_at
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd pobierania statystyk' });
    }
});

// GET /api/stats/game/:id — wyniki zakończonej gry
router.get('/game/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const scores = await prisma.game_scores.findMany({
            where: { game_id: id },
            orderBy: { score: 'desc' },
            include: {
                room_players: {
                    include: { users: { select: { username: true } } }
                }
            }
        });

        if (!scores.length) return res.status(404).json({ error: 'Gra nie istnieje' });

        return res.json(scores.map(s => ({
            player_id: s.player_id,
            username: s.room_players.users?.username ?? null,
            is_bot: s.room_players.is_bot,
            score: s.score,
            rank: s.rank
        })));
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd pobierania wyników gry' });
    }
});

module.exports = router;
