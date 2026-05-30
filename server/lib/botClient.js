/**
 * Klient HTTP do serwisu AI bota (Python FastAPI @ BOT_SERVICE_URL).
 * Używa trybu image_b64 — czyta image_data bezpośrednio z Prisma,
 * więc działa nawet gdy karta ma null image_url (seeded cards).
 */
const prisma = require('../config/db');

const getBotUrl = () => process.env.BOT_SERVICE_URL || 'http://bot:8000';

async function getCardImageB64(cardId) {
    const card = await prisma.cards.findUnique({ where: { id: cardId } });
    if (!card) throw new Error(`Card ${cardId} not found`);

    if (card.image_data) {
        return Buffer.from(card.image_data).toString('base64');
    }

    if (card.image_url?.startsWith('http')) {
        const res = await fetch(card.image_url);
        if (!res.ok) throw new Error(`Failed to fetch image: ${card.image_url} → ${res.status}`);
        const buf = await res.arrayBuffer();
        return Buffer.from(buf).toString('base64');
    }

    throw new Error(`Card ${cardId} has no image_data in DB`);
}

/**
 * Wywołuje bot narratora: generuje hasło dla danej karty.
 * @param {string} cardId
 * @returns {Promise<string>} clue
 */
async function narratorPrompt(cardId) {
    const image_b64 = await getCardImageB64(cardId);
    const res = await fetch(`${getBotUrl()}/generate-prompt/pl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_b64 })
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[BotClient] narratorPrompt FAIL cardId=${cardId} status=${res.status} body=${text}`);
        throw new Error(`Bot /generate-prompt error ${res.status}: ${text}`);
    }
    const data = await res.json();
    console.log(`[BotClient] narratorPrompt cardId=${cardId} clue="${data.clue}"`);
    return data.clue;
}

/**
 * Wywołuje bot gracza: wybiera najlepszą kartę do hasła.
 * @param {string} clue
 * @param {string[]} cardIds
 * @returns {Promise<number>} index wybranej karty
 */
async function chooseCard(clue, cardIds) {
    const images_b64 = await Promise.all(cardIds.map(getCardImageB64));
    const res = await fetch(`${getBotUrl()}/choose-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clue, images_b64 })
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Bot /choose-card error ${res.status}: ${text}`);
    }
    const data = await res.json();
    return data.best_index;
}

module.exports = { narratorPrompt, chooseCard };
