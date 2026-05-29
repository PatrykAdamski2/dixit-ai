const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const auth = require('../middleware/auth');
const { getIo } = require('../lib/socketBus');
const { startPhaseTimer } = require('../lib/gameTimer');
const botOrchestrator = require('../lib/botOrchestrator');

const HAND_SIZE = 6; // karty na rękę na początku gry

// Generuje losowy 6-znakowy kod (A-Z, 0-9)
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // pomijamy mylące znaki I,O,1,0
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// Losuje N unikalnych kart z puli, które gracz jeszcze nie ma w ręce
async function dealCards(gameId, playerId, count, usedCardIds = []) {
    const game = await prisma.games.findUnique({
        where: { id: gameId },
        include: { rooms: { include: { card_sets: { include: { cards: true } } } } }
    });

    const allCards = game.rooms.card_sets?.cards ?? [];
    const existingHandIds = new Set(usedCardIds);

    // Karty które gracz już zagrał w tej grze
    const usedInGame = await prisma.player_card_history.findMany({
        where: { game_id: gameId, player_id: playerId }
    });
    usedInGame.forEach(h => existingHandIds.add(h.card_id));

    // Karty już w ręce gracza
    const currentHand = await prisma.player_hands.findMany({
        where: { game_id: gameId, player_id: playerId }
    });
    currentHand.forEach(h => existingHandIds.add(h.card_id));

    const available = allCards.filter(c => !existingHandIds.has(c.id));

    // Przetasuj i weź potrzebną liczbę
    const shuffled = available.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// Pomocnik budujący DTO gracza dla frontendu
function buildPlayerDto(rp) {
    return {
        id: rp.id,
        username: rp.users?.username ?? null,
        is_bot: rp.is_bot ?? false,
        is_connected: true,
        score: 0
    };
}

// POST /api/lobby/create
router.post('/create', auth, async (req, res) => {
    const { max_players = 6, end_condition = 'points', point_limit = 30, round_limit = null } = req.body;
    const userId = req.user.id;

    if (end_condition === 'rounds' && (round_limit === null || round_limit < 2)) {
        return res.status(400).json({ error: 'Tryb rund wymaga minimum 2 rund' });
    }

    try {
        // Generuj unikalny kod (ponów jeśli kolizja)
        let code;
        let attempts = 0;
        while (attempts < 10) {
            code = generateRoomCode();
            const existing = await prisma.rooms.findUnique({ where: { code } });
            if (!existing) break;
            attempts++;
        }
        if (!code) return res.status(500).json({ error: 'Nie można wygenerować kodu pokoju' });

        // Użyj domyślnego zestawu kart jeśli jest (lub pierwszego dostępnego)
        const defaultSetId = process.env.DEFAULT_CARD_SET_ID || null;
        let activeSetId = defaultSetId;
        if (!activeSetId) {
            const firstSet = await prisma.card_sets.findFirst();
            activeSetId = firstSet?.id ?? null;
        }

        // Utwórz pokój i dodaj hosta jako room_player w jednej transakcji
        const room = await prisma.$transaction(async (tx) => {
            const newRoom = await tx.rooms.create({
                data: {
                    host_user_id: userId,
                    code,
                    active_set_id: activeSetId,
                    max_players,
                    end_condition,
                    point_limit,
                    round_limit,
                    status: 'waiting'
                }
            });

            await tx.room_players.create({
                data: { room_id: newRoom.id, user_id: userId }
            });

            return newRoom;
        });

        const players = await prisma.room_players.findMany({
            where: { room_id: room.id },
            include: { users: true }
        });

        return res.status(201).json({
            roomCode: room.code,
            roomId: room.id,
            players: players.map(buildPlayerDto)
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd tworzenia pokoju' });
    }
});

// POST /api/lobby/join
router.post('/join', auth, async (req, res) => {
    // FE wysyła { code } (lobbyApi.ts), backend histocyznie oczekiwał { roomCode }
    const { roomCode, code } = req.body;
    const roomCodeValue = (roomCode || code)?.toUpperCase();
    const userId = req.user.id;

    if (!roomCodeValue) return res.status(400).json({ error: 'Brak kodu pokoju' });

    try {
        const room = await prisma.rooms.findUnique({
            where: { code: roomCodeValue },
            include: { room_players: { include: { users: true } } }
        });

        if (!room) return res.status(404).json({ error: 'Pokój nie istnieje' });
        if (room.status !== 'waiting') return res.status(409).json({ error: 'Gra już się rozpoczęła' });
        if (room.room_players.length >= room.max_players)
            return res.status(409).json({ error: 'Pokój jest pełny' });

        // Sprawdź czy już jest w pokoju
        const alreadyIn = room.room_players.find(rp => rp.user_id === userId);
        if (alreadyIn) {
            return res.status(200).json({
                roomCode: room.code,
                roomId: room.id,
                players: room.room_players.map(buildPlayerDto)
            });
        }

        await prisma.room_players.create({
            data: { room_id: room.id, user_id: userId }
        });

        const updatedPlayers = await prisma.room_players.findMany({
            where: { room_id: room.id },
            include: { users: true }
        });

        const playersDto = updatedPlayers.map(buildPlayerDto);

        // Broadcast lobbyUpdate przez socket
        const io = getIo();
        if (io) {
            io.to(`lobby:${room.code}`).emit('lobbyUpdate', { players: playersDto });
        }

        return res.status(200).json({
            roomCode: room.code,
            roomId: room.id,
            players: playersDto
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd dołączania do pokoju' });
    }
});

// POST /api/lobby/start
router.post('/start', auth, async (req, res) => {
    const { roomCode } = req.body;
    const userId = req.user.id;

    if (!roomCode) return res.status(400).json({ error: 'Brak kodu pokoju' });

    try {
        const room = await prisma.rooms.findUnique({
            where: { code: roomCode.toUpperCase() },
            include: {
                room_players: { include: { users: true } },
                card_sets: { include: { cards: true } }
            }
        });

        if (!room) return res.status(404).json({ error: 'Pokój nie istnieje' });
        if (room.host_user_id !== userId) return res.status(403).json({ error: 'Tylko host może rozpocząć grę' });
        if (room.status !== 'waiting') return res.status(409).json({ error: 'Gra już się rozpoczęła' });
        if (room.room_players.length < 3)
            return res.status(400).json({ error: 'Potrzeba minimum 3 graczy' });
        if (!room.card_sets || room.card_sets.cards.length === 0)
            return res.status(400).json({ error: 'Brak kart w wybranym zestawie. Uruchom seed.' });

        const allCards = room.card_sets.cards;
        const players = room.room_players;

        const gameId = await prisma.$transaction(async (tx) => {
            // Utwórz grę
            const game = await tx.games.create({
                data: {
                    room_id: room.id,
                    current_round: 1,
                    status: 'active'
                }
            });

            // Utwórz game_scores dla każdego gracza
            for (const player of players) {
                await tx.game_scores.create({
                    data: { game_id: game.id, player_id: player.id, score: 0 }
                });
            }

            // Rozdaj karty (HAND_SIZE kart na gracza)
            let cardPool = [...allCards].sort(() => Math.random() - 0.5);
            const usedCardIds = new Set();

            for (const player of players) {
                const hand = cardPool.filter(c => !usedCardIds.has(c.id)).slice(0, HAND_SIZE);
                hand.forEach(c => usedCardIds.add(c.id));

                for (const card of hand) {
                    await tx.player_hands.create({
                        data: { game_id: game.id, player_id: player.id, card_id: card.id }
                    });
                }
            }

            // Hotfix: pierwszy narrator zawsze człowiek (boty nie mogą zacząć)
            const humanPlayers = players.filter(p => !p.is_bot);
            const narratorPool = humanPlayers.length > 0 ? humanPlayers : players;
            const firstNarrator = narratorPool[Math.floor(Math.random() * narratorPool.length)];

            // Utwórz pierwszą rundę
            await tx.rounds.create({
                data: {
                    game_id: game.id,
                    round_number: 1,
                    narrator_player_id: firstNarrator.id,
                    status: 'prompting'
                }
            });

            // Zaktualizuj status pokoju
            await tx.rooms.update({
                where: { id: room.id },
                data: { status: 'in_game' }
            });

            return game.id;
        });

        // Poinformuj graczy w lobby
        const io = getIo();
        if (io) {
            io.to(`lobby:${room.code}`).emit('game_started', { gameId });
            startPhaseTimer(io, gameId, 'prompting');

            // Jeśli narrator rundy 1 to bot — zadziała dopiero po hotfixie (narrator = człowiek),
            // ale zostawiamy trigger na wypadek gdyby wszyscy gracze byli botami
            const firstRound = await prisma.rounds.findFirst({ where: { game_id: gameId } });
            if (firstRound) {
                botOrchestrator.handleNarratorIfBot(io, gameId, firstRound)
                    .catch(err => console.error('[Bot] round 1 narrator error:', err));
            }
        }

        return res.status(200).json({ gameId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd rozpoczęcia gry' });
    }
});

// POST /api/lobby/add-bot
router.post('/add-bot', auth, async (req, res) => {
    const { roomCode, difficulty = 'medium' } = req.body;
    const userId = req.user.id;

    if (!roomCode) return res.status(400).json({ error: 'Brak kodu pokoju' });

    try {
        const room = await prisma.rooms.findUnique({
            where: { code: roomCode.toUpperCase() },
            include: { room_players: { include: { users: true } } }
        });

        if (!room) return res.status(404).json({ error: 'Pokój nie istnieje' });
        if (room.host_user_id !== userId) return res.status(403).json({ error: 'Tylko host może dodać bota' });
        if (room.status !== 'waiting') return res.status(409).json({ error: 'Gra już się rozpoczęła' });
        if (room.room_players.length >= room.max_players)
            return res.status(409).json({ error: 'Pokój jest pełny' });

        const bot = await prisma.room_players.create({
            data: { room_id: room.id, is_bot: true, bot_difficulty: difficulty }
        });

        const updatedPlayers = await prisma.room_players.findMany({
            where: { room_id: room.id },
            include: { users: true }
        });

        const playersDto = updatedPlayers.map(rp => ({
            id: rp.id,
            username: rp.is_bot ? `Bot (${rp.bot_difficulty})` : rp.users?.username ?? null,
            is_bot: rp.is_bot ?? false,
            is_connected: true,
            score: 0
        }));

        const io = getIo();
        if (io) {
            io.to(`lobby:${room.code}`).emit('lobbyUpdate', { players: playersDto });
        }

        return res.status(201).json({ players: playersDto });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd dodawania bota' });
    }
});

// GET /api/lobby/default-settings — camelCase dla FE (LobbySettings interface)
router.get('/default-settings', auth, (req, res) => {
    return res.json({
        maxPlayers: 6,
        endCondition: 'points',
        endLimit: 30
    });
});

// GET /api/lobby/:code — stan lobby (gracze, ustawienia)
router.get('/:code', auth, async (req, res) => {
    try {
        const code = req.params.code.toUpperCase();

        const room = await prisma.rooms.findUnique({
            where: { code },
            include: { room_players: { include: { users: { select: { username: true } } } } }
        });

        if (!room) return res.status(404).json({ error: 'Pokój nie istnieje' });

        return res.json({
            roomCode: room.code,
            roomId: room.id,
            status: room.status,
            max_players: room.max_players,
            end_condition: room.end_condition,
            point_limit: room.point_limit,
            round_limit: room.round_limit,
            players: room.room_players.map(rp => ({
                id: rp.id,
                username: rp.is_bot ? `Bot (${rp.bot_difficulty ?? 'medium'})` : (rp.users?.username ?? null),
                is_bot: rp.is_bot ?? false,
                is_connected: true
            }))
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Błąd pobierania lobby' });
    }
});

module.exports = router;
