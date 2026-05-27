/**
 * Kompletny test wszystkich endpointów REST backendu.
 *
 * Pokrycie:
 *   Auth:  POST /register, /login, /logout, GET /me
 *   Lobby: POST /create, /join, /start, /add-bot, GET /default-settings, GET /:code
 *   Game:  GET /api/game/:id
 *   Stats: GET /api/stats/leaderboard, /api/stats/me, /api/stats/game/:id
 *   Socket lobby: join_room, leave_room (lobbyUpdate broadcast)
 */

const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { io: ioc } = require('socket.io-client');
const cookieLib = require('cookie');
const jwt = require('jsonwebtoken');

const { createApp } = require('../appFactory');
const { setIo } = require('../lib/socketBus');
const lobbyHandler = require('../handlers/lobbyHandler');
const gameHandler = require('../handlers/gameHandler');
const prisma = require('../config/db');

const app = createApp();
const RUN = Math.random().toString(36).slice(2, 8);
const u = (n) => `${n}_${RUN}`;

// ─── server setup dla socket testów ──────────────────────────────────────────
let httpServer, ioServer, serverUrl;

beforeAll(async () => {
    await ensureCardSet();

    httpServer = createServer(app);
    ioServer = new Server(httpServer, { cors: { origin: true, credentials: true } });
    setIo(ioServer);

    ioServer.use((socket, next) => {
        try {
            const cookies = cookieLib.parse(socket.request.headers.cookie || '');
            const payload = jwt.verify(cookies.token, process.env.JWT_SECRET || 'test-jwt-secret');
            socket.user = payload;
            next();
        } catch { next(new Error('Niezalogowany')); }
    });

    ioServer.on('connection', (socket) => {
        lobbyHandler(ioServer, socket);
        gameHandler(ioServer, socket);
    });

    await new Promise(r => httpServer.listen(0, r));
    serverUrl = `http://localhost:${httpServer.address().port}`;
});

afterAll(async () => {
    ioServer?.close();
    await new Promise(r => httpServer.close(r));
    await prisma.$disconnect();
    if (typeof prisma.__closePool === 'function') await prisma.__closePool();
});

// ─── helpers ──────────────────────────────────────────────────────────────────

async function ensureCardSet() {
    const existing = await prisma.card_sets.findFirst();
    if (existing) return existing.id;
    const set = await prisma.card_sets.create({ data: { name: `AllTestSet_${RUN}` } });
    for (let i = 1; i <= 30; i++) {
        await prisma.cards.create({ data: { set_id: set.id, image_url: `/Karty/KartaNr${i}.png` } });
    }
    return set.id;
}

async function registerAndLogin(login) {
    await request(app).post('/api/auth/register').send({ login, password: 'secret123' }).expect(201);
    const res = await request(app).post('/api/auth/login').send({ login, password: 'secret123' }).expect(200);
    const setCookie = res.headers['set-cookie'] || [];
    const tokenCookie = setCookie.find(c => c.startsWith('token='));
    return { cookie: tokenCookie, token: cookieLib.parse(tokenCookie).token };
}

let _lobbyCallIdx = 0;
async function createLobbyWith3Players() {
    const idx = ++_lobbyCallIdx;
    const authA = await registerAndLogin(u(`h${idx}`));
    const authB = await registerAndLogin(u(`p1x${idx}`));
    const authC = await registerAndLogin(u(`p2x${idx}`));

    const createRes = await request(app).post('/api/lobby/create').set('Cookie', authA.cookie).send({}).expect(201);
    const { roomCode } = createRes.body;

    await request(app).post('/api/lobby/join').set('Cookie', authB.cookie).send({ roomCode }).expect(200);
    await request(app).post('/api/lobby/join').set('Cookie', authC.cookie).send({ roomCode }).expect(200);

    return { authA, authB, authC, roomCode };
}

function makeSocket(token) {
    return ioc(serverUrl, {
        extraHeaders: { cookie: `token=${token}` },
        autoConnect: false,
        transports: ['websocket']
    });
}

function waitFor(sock, event, ms = 5000) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`Timeout: ${event}`)), ms);
        sock.once(event, data => { clearTimeout(t); resolve(data); });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

describe('Auth', () => {
    test('POST /api/auth/register — 201 nowy użytkownik', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ login: u('reg'), password: 'secret123' }).expect(201);
        expect(res.body).toHaveProperty('response');
    });

    test('POST /api/auth/register — 400 brak hasła', async () => {
        await request(app).post('/api/auth/register').send({ login: u('x') }).expect(400);
    });

    test('POST /api/auth/register — 409 duplikat', async () => {
        const login = u('dup');
        await request(app).post('/api/auth/register').send({ login, password: '123' }).expect(201);
        await request(app).post('/api/auth/register').send({ login, password: '123' }).expect(409);
    });

    test('POST /api/auth/login — 200 token w cookie', async () => {
        const login = u('login');
        await request(app).post('/api/auth/register').send({ login, password: 'abc' }).expect(201);
        const res = await request(app).post('/api/auth/login').send({ login, password: 'abc' }).expect(200);
        expect(res.headers['set-cookie']?.join('')).toMatch(/token=/);
        expect(res.body.username).toBe(login);
    });

    test('POST /api/auth/login — 401 złe hasło', async () => {
        const login = u('wrongpw');
        await request(app).post('/api/auth/register').send({ login, password: 'correct' }).expect(201);
        await request(app).post('/api/auth/login').send({ login, password: 'wrong' }).expect(401);
    });

    test('POST /api/auth/login — 404 nieznany użytkownik', async () => {
        await request(app).post('/api/auth/login').send({ login: u('nobody'), password: 'x' }).expect(404);
    });

    test('GET /api/auth/me — 200 dane zalogowanego', async () => {
        const login = u('me');
        await request(app).post('/api/auth/register').send({ login, password: 'x' }).expect(201);
        const loginRes = await request(app).post('/api/auth/login').send({ login, password: 'x' }).expect(200);
        const res = await request(app).get('/api/auth/me').set('Cookie', loginRes.headers['set-cookie']).expect(200);
        expect(res.body.username).toBe(login);
        expect(res.body).toHaveProperty('id');
    });

    test('GET /api/auth/me — 401 bez tokena', async () => {
        await request(app).get('/api/auth/me').expect(401);
    });

    test('POST /api/auth/logout — czyści cookie', async () => {
        const login = u('out');
        await request(app).post('/api/auth/register').send({ login, password: 'x' }).expect(201);
        const loginRes = await request(app).post('/api/auth/login').send({ login, password: 'x' }).expect(200);
        const res = await request(app).post('/api/auth/logout').set('Cookie', loginRes.headers['set-cookie']).expect(200);
        expect(res.headers['set-cookie']?.join('')).toMatch(/token=;/);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOBBY REST
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lobby REST', () => {
    let authA, authB;

    beforeAll(async () => {
        authA = await registerAndLogin(u('lhostA'));
        authB = await registerAndLogin(u('lplayB'));
    });

    test('GET /api/lobby/default-settings — 200', async () => {
        const res = await request(app).get('/api/lobby/default-settings').set('Cookie', authA.cookie).expect(200);
        expect(res.body).toMatchObject({ max_players: expect.any(Number), end_condition: expect.any(String) });
    });

    test('GET /api/lobby/default-settings — 401 bez tokena', async () => {
        await request(app).get('/api/lobby/default-settings').expect(401);
    });

    test('POST /api/lobby/create — 201, roomCode 6 znaków', async () => {
        const res = await request(app).post('/api/lobby/create').set('Cookie', authA.cookie).send({}).expect(201);
        expect(res.body.roomCode).toHaveLength(6);
        expect(res.body.players).toHaveLength(1);
        expect(res.body.players[0].username).toBe(u('lhostA'));
    });

    test('POST /api/lobby/create — 401 bez tokena', async () => {
        await request(app).post('/api/lobby/create').send({}).expect(401);
    });

    test('POST /api/lobby/join — dołącza gracza (200)', async () => {
        const { body: { roomCode } } = await request(app).post('/api/lobby/create').set('Cookie', authA.cookie).send({}).expect(201);
        const res = await request(app).post('/api/lobby/join').set('Cookie', authB.cookie).send({ roomCode }).expect(200);
        expect(res.body.players).toHaveLength(2);
    });

    test('POST /api/lobby/join — idempotentne (nie duplikuje)', async () => {
        const { body: { roomCode } } = await request(app).post('/api/lobby/create').set('Cookie', authA.cookie).send({}).expect(201);
        await request(app).post('/api/lobby/join').set('Cookie', authB.cookie).send({ roomCode }).expect(200);
        const res = await request(app).post('/api/lobby/join').set('Cookie', authB.cookie).send({ roomCode }).expect(200);
        expect(res.body.players).toHaveLength(2);
    });

    test('POST /api/lobby/join — 404 zły kod', async () => {
        await request(app).post('/api/lobby/join').set('Cookie', authB.cookie).send({ roomCode: 'ZZZZZZ' }).expect(404);
    });

    test('POST /api/lobby/join — 400 brak kodu', async () => {
        await request(app).post('/api/lobby/join').set('Cookie', authB.cookie).send({}).expect(400);
    });

    test('POST /api/lobby/join — 409 pełny pokój', async () => {
        const { body: { roomCode } } = await request(app).post('/api/lobby/create').set('Cookie', authA.cookie).send({ max_players: 1 }).expect(201);
        await request(app).post('/api/lobby/join').set('Cookie', authB.cookie).send({ roomCode }).expect(409);
    });

    test('GET /api/lobby/:code — 200 zwraca listę graczy', async () => {
        const { body: { roomCode } } = await request(app).post('/api/lobby/create').set('Cookie', authA.cookie).send({}).expect(201);
        await request(app).post('/api/lobby/join').set('Cookie', authB.cookie).send({ roomCode }).expect(200);
        const res = await request(app).get(`/api/lobby/${roomCode}`).set('Cookie', authA.cookie).expect(200);
        expect(res.body.roomCode).toBe(roomCode);
        expect(res.body.players).toHaveLength(2);
        expect(res.body).toHaveProperty('status', 'waiting');
    });

    test('GET /api/lobby/:code — 404 zły kod', async () => {
        await request(app).get('/api/lobby/ZZZZZZ').set('Cookie', authA.cookie).expect(404);
    });

    test('POST /api/lobby/add-bot — host dodaje bota (201)', async () => {
        const { body: { roomCode } } = await request(app).post('/api/lobby/create').set('Cookie', authA.cookie).send({}).expect(201);
        const res = await request(app).post('/api/lobby/add-bot').set('Cookie', authA.cookie).send({ roomCode }).expect(201);
        expect(res.body.players.some(p => p.is_bot)).toBe(true);
    });

    test('POST /api/lobby/add-bot — 403 nie-host', async () => {
        const { body: { roomCode } } = await request(app).post('/api/lobby/create').set('Cookie', authA.cookie).send({}).expect(201);
        await request(app).post('/api/lobby/add-bot').set('Cookie', authB.cookie).send({ roomCode }).expect(403);
    });

    test('POST /api/lobby/start — 200, zwraca gameId', async () => {
        const { authA, roomCode } = await createLobbyWith3Players();
        const res = await request(app).post('/api/lobby/start').set('Cookie', authA.cookie).send({ roomCode }).expect(200);
        expect(res.body).toHaveProperty('gameId');
    });

    test('POST /api/lobby/start — 403 nie-host', async () => {
        const { authB, roomCode } = await createLobbyWith3Players();
        await request(app).post('/api/lobby/start').set('Cookie', authB.cookie).send({ roomCode }).expect(403);
    });

    test('POST /api/lobby/start — 400 za mało graczy', async () => {
        const { body: { roomCode } } = await request(app).post('/api/lobby/create').set('Cookie', authA.cookie).send({}).expect(201);
        await request(app).post('/api/lobby/start').set('Cookie', authA.cookie).send({ roomCode }).expect(400);
    });

    test('POST /api/lobby/start — 409 drugi start', async () => {
        const { authA, roomCode } = await createLobbyWith3Players();
        await request(app).post('/api/lobby/start').set('Cookie', authA.cookie).send({ roomCode }).expect(200);
        await request(app).post('/api/lobby/start').set('Cookie', authA.cookie).send({ roomCode }).expect(409);
    });

    test('POST /api/lobby/start — karty rozdane (6 × 3)', async () => {
        const { authA, roomCode } = await createLobbyWith3Players();
        const { body: { gameId } } = await request(app).post('/api/lobby/start').set('Cookie', authA.cookie).send({ roomCode }).expect(200);
        const hands = await prisma.player_hands.findMany({ where: { game_id: gameId } });
        expect(hands).toHaveLength(18);
    });

    test('POST /api/lobby/start — runda 1 w fazie prompting', async () => {
        const { authA, roomCode } = await createLobbyWith3Players();
        const { body: { gameId } } = await request(app).post('/api/lobby/start').set('Cookie', authA.cookie).send({ roomCode }).expect(200);
        const round = await prisma.rounds.findFirst({ where: { game_id: gameId } });
        expect(round.status).toBe('prompting');
        expect(round.narrator_player_id).not.toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GAME REST
// ═══════════════════════════════════════════════════════════════════════════════

describe('Game REST', () => {
    let authA, authB, authC, gameId;

    beforeAll(async () => {
        const lobby = await createLobbyWith3Players();
        authA = lobby.authA; authB = lobby.authB; authC = lobby.authC;
        const res = await request(app).post('/api/lobby/start').set('Cookie', authA.cookie).send({ roomCode: lobby.roomCode }).expect(200);
        gameId = res.body.gameId;
    });

    test('GET /api/game/:id — 200 zwraca stan gry z ręką', async () => {
        const res = await request(app).get(`/api/game/${gameId}`).set('Cookie', authA.cookie).expect(200);
        expect(res.body).toHaveProperty('game_id', gameId);
        expect(res.body).toHaveProperty('status', 'active');
        expect(res.body.hand.length).toBeGreaterThanOrEqual(6);
        expect(res.body.round).toHaveProperty('status', 'prompting');
        expect(res.body.scores).toHaveLength(3);
    });

    test('GET /api/game/:id — 403 nie-uczestnik', async () => {
        const stranger = await registerAndLogin(u('stranger'));
        await request(app).get(`/api/game/${gameId}`).set('Cookie', stranger.cookie).expect(403);
    });

    test('GET /api/game/:id — 401 bez tokena', async () => {
        await request(app).get(`/api/game/${gameId}`).expect(401);
    });

    test('GET /api/game/nieistniejace-id — 404', async () => {
        await request(app).get('/api/game/00000000-0000-0000-0000-000000000000').set('Cookie', authA.cookie).expect(404);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STATS REST
// ═══════════════════════════════════════════════════════════════════════════════

describe('Stats REST', () => {
    let auth;

    beforeAll(async () => {
        auth = await registerAndLogin(u('stats'));
    });

    test('GET /api/stats/leaderboard — 200 lista graczy', async () => {
        const res = await request(app).get('/api/stats/leaderboard').expect(200);
        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('username');
            expect(res.body[0]).toHaveProperty('total_points');
            expect(res.body[0]).toHaveProperty('rank', 1);
        }
    });

    test('GET /api/stats/leaderboard?limit=3 — max 3 wyniki', async () => {
        const res = await request(app).get('/api/stats/leaderboard?limit=3').expect(200);
        expect(res.body.length).toBeLessThanOrEqual(3);
    });

    test('GET /api/stats/me — 200 dla nowego gracza (0 gier)', async () => {
        const res = await request(app).get('/api/stats/me').set('Cookie', auth.cookie).expect(200);
        expect(res.body).toMatchObject({ games_played: 0, games_won: 0, total_points: 0 });
    });

    test('GET /api/stats/me — 401 bez tokena', async () => {
        await request(app).get('/api/stats/me').expect(401);
    });

    test('GET /api/stats/game/:id — wyniki istniejącej gry', async () => {
        const { authA, roomCode } = await createLobbyWith3Players();
        const { body: { gameId } } = await request(app).post('/api/lobby/start').set('Cookie', authA.cookie).send({ roomCode }).expect(200);
        const res = await request(app).get(`/api/stats/game/${gameId}`).set('Cookie', authA.cookie).expect(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(3);
        res.body.forEach(s => {
            expect(s).toHaveProperty('score');
            expect(s).toHaveProperty('player_id');
        });
    });

    test('GET /api/stats/game/:id — 404 nieznana gra', async () => {
        await request(app).get('/api/stats/game/00000000-0000-0000-0000-000000000000').set('Cookie', auth.cookie).expect(404);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOBBY SOCKET
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lobby Socket', () => {
    let authA, authB, roomCode;

    beforeAll(async () => {
        authA = await registerAndLogin(u('lsA'));
        authB = await registerAndLogin(u('lsB'));
        const res = await request(app).post('/api/lobby/create').set('Cookie', authA.cookie).send({}).expect(201);
        roomCode = res.body.roomCode;
    });

    test('join_room → lobbyUpdate z listą graczy', async () => {
        const sockA = makeSocket(authA.token);

        const updatePromise = waitFor(sockA, 'lobbyUpdate');
        sockA.connect();
        await new Promise(r => sockA.once('connect', r));
        sockA.emit('join_room', { roomCode });

        const update = await updatePromise;
        expect(update.players).toHaveLength(1);
        expect(update.players[0].username).toBe(u('lsA'));
        sockA.disconnect();
    });

    test('join_room zły kod → error', async () => {
        const sockA = makeSocket(authA.token);
        const errPromise = waitFor(sockA, 'error', 3000);
        sockA.connect();
        await new Promise(r => sockA.once('connect', r));
        sockA.emit('join_room', { roomCode: 'ZZZZZZ' });
        const err = await errPromise;
        expect(err.message).toBeTruthy();
        sockA.disconnect();
    });

    test('Dołączenie przez REST + join_room → lobbyUpdate z 2 graczami', async () => {
        await request(app).post('/api/lobby/join').set('Cookie', authB.cookie).send({ roomCode }).expect(200);

        const sockA = makeSocket(authA.token);
        const sockB = makeSocket(authB.token);

        sockA.connect();
        sockB.connect();
        await Promise.all([
            new Promise(r => sockA.once('connect', r)),
            new Promise(r => sockB.once('connect', r))
        ]);

        // Obaj dołączają do socket room
        const updateA = waitFor(sockA, 'lobbyUpdate');
        sockA.emit('join_room', { roomCode });
        await updateA;

        const updateB = waitFor(sockB, 'lobbyUpdate');
        sockB.emit('join_room', { roomCode });
        const update = await updateB;

        expect(update.players).toHaveLength(2);

        sockA.disconnect();
        sockB.disconnect();
    });
});
