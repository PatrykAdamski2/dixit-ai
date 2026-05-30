const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const prisma = require('../config/db');

// Statyczna lista motywów (brak tabeli w DB)
// preview/accent to klasy Tailwind — identyczne z mockPersonalization.ts po stronie FE
const THEMES = [
    {
        id: 'classic',
        name: 'Classic',
        price: 0,
        preview: 'bg-gradient-to-br from-amber-100 to-orange-200',
        accent: 'orange'
    },
    {
        id: 'ocean',
        name: 'Ocean',
        price: 100,
        preview: 'bg-gradient-to-br from-blue-200 to-cyan-400',
        accent: 'blue'
    },
    {
        id: 'forest',
        name: 'Forest',
        price: 100,
        preview: 'bg-gradient-to-br from-green-200 to-emerald-500',
        accent: 'green'
    },
    {
        id: 'dark',
        name: 'Dark',
        price: 200,
        preview: 'bg-gradient-to-br from-gray-700 to-gray-900',
        accent: 'gray'
    }
];

// GET /api/personalization/themes
// Zwraca { themes: [...] } — FE oczekuje wrappera
router.get('/themes', auth, (req, res) => {
    return res.json({ themes: THEMES });
});

// POST /api/personalization/buy — odejmij coiny i zablokuj zakup
router.post('/buy', auth, async (req, res) => {
    const themeId = req.body.themeId ?? req.body.theme_id;
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return res.status(404).json({ error: 'Nie znaleziono motywu' });

    try {
        const userId = req.user.id;
        const stats = await prisma.user_stats.findFirst({ where: { user_id: userId } });
        const currentCoins = stats?.coins ?? 0;

        if (currentCoins < theme.price) {
            return res.status(400).json({ error: 'Niewystarczające monety' });
        }

        if (stats) {
            await prisma.user_stats.update({
                where: { id: stats.id },
                data: { coins: { decrement: theme.price } }
            });
        }

        return res.json({ themeId, newBalance: currentCoins - theme.price });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd zakupu' });
    }
});

// POST /api/personalization/select — przyjmuje { themeId } lub { theme_id }
router.post('/select', auth, (req, res) => {
    const themeId = req.body.themeId ?? req.body.theme_id;
    if (!THEMES.find(t => t.id === themeId)) {
        return res.status(404).json({ error: 'Nie znaleziono motywu' });
    }
    // TODO: zapisać do user_settings gdy schemat zostanie rozszerzony
    return res.json({ selected: themeId });
});

module.exports = router;
