const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// GET /api/stats/global — leaderboard w formacie oczekiwanym przez FE
// Zwraca: { topPlayers: [{rank, name, wins, avatar}], currentUserRank: {...} | null }
router.get('/global', async (req, res) => {
    try {
        const stats = await prisma.user_stats.findMany({
            orderBy: { total_points: 'desc' },
            take: 10,
            include: { users: { select: { username: true } } }
        });

        const topPlayers = stats.map((s, i) => ({
            rank: i + 1,
            name: s.users.username,
            wins: s.games_won ?? 0,
            avatar: s.users.username.slice(0, 2).toUpperCase()
        }));

        // Opcjonalny auth — currentUserRank gdy zalogowany
        let currentUserRank = null;
        try {
            const token = req.cookies?.token;
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userStat = await prisma.user_stats.findFirst({
                    where: { user_id: decoded.id },
                    include: { users: { select: { username: true } } }
                });
                if (userStat) {
                    const rank = await prisma.user_stats.count({
                        where: { total_points: { gt: userStat.total_points } }
                    }) + 1;
                    currentUserRank = {
                        rank,
                        name: userStat.users.username,
                        wins: userStat.games_won ?? 0,
                        avatar: userStat.users.username.slice(0, 2).toUpperCase()
                    };
                }
            }
        } catch { /* brak sesji — pomijamy */ }

        return res.json({ topPlayers, currentUserRank });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd pobierania rankingu' });
    }
});

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

// GET /api/stats/my-games — historia zakończonych gier zalogowanego gracza
// Zwraca: [{game_id, started_at, ended_at, total_rounds, score, rank, players:[{username,is_bot,score,rank}]}]
router.get('/my-games', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = parseInt(req.query.offset) || 0;

        // Znajdź wszystkich room_players tego usera
        const playerRecords = await prisma.room_players.findMany({
            where: { user_id: userId },
            select: { id: true, room_id: true }
        });
        const playerIds = playerRecords.map(p => p.id);

        if (!playerIds.length) return res.json([]);

        // Znajdź wyniki z zakończonych gier gdzie gracz brał udział
        const myScores = await prisma.game_scores.findMany({
            where: {
                player_id: { in: playerIds },
                games: { status: 'finished' }
            },
            include: {
                games: {
                    select: {
                        id: true,
                        started_at: true,
                        ended_at: true,
                        current_round: true,
                        game_scores: {
                            orderBy: { score: 'desc' },
                            include: {
                                room_players: {
                                    include: { users: { select: { username: true } } }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { games: { ended_at: 'desc' } },
            take: limit,
            skip: offset
        });

        const result = myScores.map(gs => ({
            game_id: gs.game_id,
            started_at: gs.games.started_at,
            ended_at: gs.games.ended_at,
            total_rounds: gs.games.current_round,
            score: gs.score,
            rank: gs.rank,
            players: gs.games.game_scores.map(s => ({
                username: s.room_players.users?.username ?? null,
                is_bot: s.room_players.is_bot,
                score: s.score,
                rank: s.rank
            }))
        }));

        return res.json(result);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd pobierania historii gier' });
    }
});

module.exports = router;
