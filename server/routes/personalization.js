const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// Statyczna lista motywów (brak tabeli w DB — rozszerzalne)
const THEMES = [
    { id: 'default', name: 'Default', preview_color: '#6b5b93', unlocked: true },
    { id: 'ocean', name: 'Ocean', preview_color: '#0077b6', unlocked: false },
    { id: 'forest', name: 'Forest', preview_color: '#2d6a4f', unlocked: false },
    { id: 'dark', name: 'Dark', preview_color: '#1a1a2e', unlocked: false }
];

// GET /api/personalization/themes
router.get('/themes', auth, (req, res) => {
    return res.json(THEMES);
});

// POST /api/personalization/buy  — stub (schemat monet nieimplementowany)
router.post('/buy', auth, (req, res) => {
    return res.status(501).json({ error: 'System walut nie jest jeszcze dostępny' });
});

// POST /api/personalization/select
router.post('/select', auth, (req, res) => {
    const { theme_id } = req.body;
    if (!THEMES.find(t => t.id === theme_id)) {
        return res.status(404).json({ error: 'Nie znaleziono motywu' });
    }
    // TODO: zapisać wybrany motyw do user_settings gdy schemat zostanie rozszerzony
    return res.json({ selected: theme_id });
});

module.exports = router;
