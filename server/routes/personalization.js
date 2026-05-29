const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

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

// POST /api/personalization/buy — stub (system walut niezaimplementowany)
// FE sprawdza response.ok — 501 = fallback do mocka
router.post('/buy', auth, (req, res) => {
    return res.status(501).json({ error: 'System walut nie jest jeszcze dostępny' });
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
