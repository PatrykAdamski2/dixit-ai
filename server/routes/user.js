const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/user/profile
// FE oczekuje: { username, coins, avatar, activeThemeId, ownedThemeIds, ... }
router.get('/profile', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { id: true, username: true, email: true, created_at: true, last_login_at: true }
        });

        if (!user) return res.status(404).json({ error: 'Użytkownik nie istnieje' });

        const stats = await prisma.user_stats.findFirst({ where: { user_id: userId } });

        return res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            // Monety nieimplementowane w schemacie — domyślnie 0
            coins: 0,
            avatar: user.username.slice(0, 2).toUpperCase(),
            // Personalizacja niezaimplementowana w schemacie — domyślne wartości
            activeThemeId: 'classic',
            ownedThemeIds: ['classic'],
            created_at: user.created_at,
            last_login_at: user.last_login_at,
            stats: {
                games_played: stats?.games_played ?? 0,
                games_won: stats?.games_won ?? 0,
                total_points: stats?.total_points ?? 0
            }
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd pobierania profilu' });
    }
});

module.exports = router;
