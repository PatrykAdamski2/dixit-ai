const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const authenticateToken = require('../middleware/auth');
const prisma = require('../config/db');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
            cb(null, true);
        } else {
            cb(new Error('Akceptowane formaty: PNG, WebP'));
        }
    }
});

// Literalne trasy PRZED parametrycznymi (Express 5)

// Lista własnych kart
router.get('/mine', authenticateToken, async (req, res) => {
    try {
        const cards = await prisma.cards.findMany({
            where: { created_by_user_id: req.user.id }
        });
        return res.json(cards.map(formatCard));
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// Własne zestawy kart
router.get('/sets/mine', authenticateToken, async (req, res) => {
    try {
        const sets = await prisma.card_sets.findMany({
            where: { owner_user_id: req.user.id },
            include: { cards: { select: { id: true, tags: true } } }
        });
        const result = sets.map(s => ({
            ...s,
            cards: s.cards.map(c => ({ ...c, image_url: `/api/cards/${c.id}/image` }))
        }));
        return res.json(result);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// Upload pliku PNG/WebP (multipart) → bytea
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Brak pliku (pole: image)' });

        const { tags } = req.body;
        const setId = await getOrCreatePersonalSet(req.user.id);

        const card = await prisma.cards.create({
            data: {
                set_id: setId,
                image_data: req.file.buffer,
                image_url: null,
                tags: tags ? JSON.parse(tags) : null,
                created_by_user_id: req.user.id
            }
        });
        return res.status(201).json(formatCard(card));
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// Zapis karty z canvas (base64 PNG) → bytea
router.post('/canvas', authenticateToken, async (req, res) => {
    try {
        const { image_base64, tags } = req.body;
        if (!image_base64) return res.status(400).json({ error: 'Brak pola image_base64' });

        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        if (buffer.length > 2 * 1024 * 1024) {
            return res.status(400).json({ error: 'Obraz za duży (max 2 MB)' });
        }

        const setId = await getOrCreatePersonalSet(req.user.id);

        const card = await prisma.cards.create({
            data: {
                set_id: setId,
                image_data: buffer,
                image_url: null,
                tags: tags || null,
                created_by_user_id: req.user.id
            }
        });
        return res.status(201).json(formatCard(card));
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// Serwuje obrazek karty z bazy jako image/png — musi być PO literalnych trasach
router.get('/:id/image', async (req, res) => {
    try {
        const card = await prisma.cards.findUnique({ where: { id: req.params.id } });
        if (!card) return res.status(404).json({ error: 'Karta nie istnieje' });

        // Priorytet: binarne dane z DB
        if (card.image_data) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(card.image_data);
        }

        // Fallback: absolutny URL (redirect)
        if (card.image_url?.startsWith('http')) {
            return res.redirect(302, card.image_url);
        }

        // Fallback: relatywna ścieżka do pliku statycznego (np. /Karty/KartaNr1.png)
        if (card.image_url) {
            const filePath = path.join(__dirname, '../public', card.image_url);
            return res.sendFile(filePath, err => {
                if (err) res.status(404).json({ error: 'Brak danych obrazka' });
            });
        }

        return res.status(404).json({ error: 'Brak danych obrazka' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

// Pomocnicze: znajdź lub utwórz osobisty zestaw użytkownika
async function getOrCreatePersonalSet(userId) {
    const name = `personal_${userId}`;
    let set = await prisma.card_sets.findFirst({ where: { name, owner_user_id: userId } });
    if (!set) {
        set = await prisma.card_sets.create({
            data: { name, owner_user_id: userId, is_user_generated: true }
        });
    }
    return set.id;
}

// Nie zwracamy binarnych danych w odpowiedziach JSON — tylko URL do pobrania
function formatCard(card) {
    const { image_data, ...rest } = card;
    return { ...rest, image_url: `/api/cards/${card.id}/image` };
}

module.exports = router;
