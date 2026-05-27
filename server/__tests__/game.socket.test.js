const { createServer } = require('http');
const { Server } = require('socket.io');
const { io: ioc } = require('socket.io-client');
const request = require('supertest');
const cookieLib = require('cookie');
const jwt = require('jsonwebtoken');

const { createApp } = require('../appFactory');
const { setIo } = require('../lib/socketBus');
const gameHandler = require('../handlers/gameHandler');
const lobbyHandler = require('../handlers/lobbyHandler');
const prisma = require('../config/db');

const RUN = Math.random().toString(36).slice(2, 8);
const u = (name) => `${name}_${RUN}`;

const app = createApp();
let httpServer, ioServer, serverAddress;

async function ensureCardSet() {
    const existing = await prisma.card_sets.findFirst();
    if (existing) return existing.id;
    const set = await prisma.card_sets.create({ data: { name: `SocketTestSet_${RUN}` } });
    for (let i = 1; i <= 30; i++) {
        await prisma.cards.create({ data: { set_id: set.id, image_url: `/Karty/KartaNr${i}.png` } });
    }
    return set.id;
}

beforeAll(async () => {
    await ensureCardSet();

    httpServer = createServer(app);
    ioServer = new Server(httpServer, { cors: { origin: true, credentials: true } });
    setIo(ioServer);

    ioServer.use((socket, next) => {
        try {
            const cookies = cookieLib.parse(socket.request.headers.cookie || '');
            const token = cookies.token;
            if (!token) return next(new Error('Brak tokena'));
            const payload = jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret');
            socket.user = payload;
            next();
        } catch {
            next(new Error('Niezalogowany'));
        }
    });

    ioServer.on('connection', (socket) => {
        lobbyHandler(ioServer, socket);
        gameHandler(ioServer, socket);
    });

    await new Promise(resolve => httpServer.listen(0, resolve));
    serverAddress = `http://localhost:${httpServer.address().port}`;
});

afterAll(async () => {
    ioServer.close();
    await new Promise(resolve => httpServer.close(resolve));
    await prisma.$disconnect();
    if (typeof prisma.__closePool === 'function') await prisma.__closePool();
});

// ─── helpers ──────────────────────────────────────────────────────────────────

async function registerAndLogin(login) {
    await request(app).post('/api/auth/register').send({ login, password: 'secret123' }).expect(201);
    const res = await request(app).post('/api/auth/login').send({ login, password: 'secret123' }).expect(200);
    const setCookie = res.headers['set-cookie'] || [];
    const tokenCookie = setCookie.find(c => c.startsWith('token='));
    const tokenValue = cookieLib.parse(tokenCookie).token;
    return { cookie: tokenCookie, token: tokenValue };
}

function makeSocket(token) {
    return ioc(serverAddress, {
        extraHeaders: { cookie: `token=${token}` },
        autoConnect: false,
        transports: ['websocket']
    });
}

function waitFor(sock, event, ms = 5000) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`Timeout czekając na: ${event}`)), ms);
        sock.once(event, data => { clearTimeout(t); resolve(data); });
    });
}

function connectToGame(sock, gameId) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Timeout connect_to_game')), 5000);
        sock.connect();
        sock.once('connect', () => sock.emit('connect_to_game', { game_id: gameId }));
        sock.once('connected_to_game', data => { clearTimeout(t); resolve(data); });
        sock.once('error', err => { clearTimeout(t); reject(new Error(err.message)); });
    });
}

// ─── testy ────────────────────────────────────────────────────────────────────

describe('Game socket — pełna runda z 3 graczami', () => {
    let authA, authB, authC;
    let sockA, sockB, sockC;
    let gameId;
    let narratorSock, player1Sock, player2Sock;
    let narratorAuth, player1Auth;

    beforeAll(async () => {
        authA = await registerAndLogin(u('sockA'));
        authB = await registerAndLogin(u('sockB'));
        authC = await registerAndLogin(u('sockC'));

        // Stwórz i uruchom lobby
        const createRes = await request(app)
            .post('/api/lobby/create').set('Cookie', authA.cookie).send({}).expect(201);
        const roomCode = createRes.body.roomCode;

        await request(app).post('/api/lobby/join').set('Cookie', authB.cookie).send({ roomCode }).expect(200);
        await request(app).post('/api/lobby/join').set('Cookie', authC.cookie).send({ roomCode }).expect(200);

        const startRes = await request(app)
            .post('/api/lobby/start').set('Cookie', authA.cookie).send({ roomCode }).expect(200);
        gameId = startRes.body.gameId;

        // Połącz sockety
        sockA = makeSocket(authA.token);
        sockB = makeSocket(authB.token);
        sockC = makeSocket(authC.token);

        await Promise.all([
            connectToGame(sockA, gameId),
            connectToGame(sockB, gameId),
            connectToGame(sockC, gameId),
        ]);

        // Ustal kto jest narratorem
        const firstRound = await prisma.rounds.findFirst({ where: { game_id: gameId } });
        const narratorRp = await prisma.room_players.findUnique({
            where: { id: firstRound.narrator_player_id },
            include: { users: true }
        });
        const narratorLogin = narratorRp.users.username;

        const loginToAuth = { [u('sockA')]: authA, [u('sockB')]: authB, [u('sockC')]: authC };
        const loginToSock = { [u('sockA')]: sockA, [u('sockB')]: sockB, [u('sockC')]: sockC };

        narratorAuth = loginToAuth[narratorLogin];
        narratorSock = loginToSock[narratorLogin];

        const others = [authA, authB, authC].filter(a => a !== narratorAuth);
        const otherSocks = [sockA, sockB, sockC].filter(s => s !== narratorSock);
        player1Auth = others[0];
        player1Sock = otherSocks[0];
        player2Sock = otherSocks[1];
    });

    afterAll(() => {
        [sockA, sockB, sockC].forEach(s => { try { s.disconnect(); } catch {} });
    });

    test('Gracze dostali ręce (6 kart każdy)', async () => {
        const hands = await prisma.player_hands.findMany({ where: { game_id: gameId } });
        expect(hands.length).toBe(18); // 3 × 6
    });

    test('Narrator przesyła prompt → broadcast prompt_submitted', async () => {
        const narratorToken = jwt.decode(narratorAuth.token);
        const narratorRp = await prisma.room_players.findFirst({
            where: { user_id: narratorToken.id, rooms: { games: { some: { id: gameId } } } },
            include: { player_hands: { where: { game_id: gameId } } }
        });
        const cardId = narratorRp.player_hands[0].card_id;

        const [notif] = await Promise.all([
            waitFor(player1Sock, 'prompt_submitted'),
            (async () => {
                await new Promise(r => setTimeout(r, 50));
                narratorSock.emit('submit_prompt', { card_id: cardId, prompt: 'Kosmiczna odyseja' });
            })()
        ]);

        expect(notif.prompt).toBe('Kosmiczna odyseja');

        const round = await prisma.rounds.findFirst({ where: { game_id: gameId } });
        expect(round.status).toBe('submitting');
    });

    test('Nie-narrator dostaje błąd przy submit_prompt', async () => {
        // Runda jest już w fazie submitting — narrator nie może ponownie submitować
        const errPromise = waitFor(player1Sock, 'error', 3000);
        player1Sock.emit('submit_prompt', { card_id: 'fake', prompt: 'test' });
        const err = await errPromise;
        expect(err.message).toBeTruthy();
    });

    test('Gracze przesyłają karty → start_voting gdy wszyscy prześlą', async () => {
        const p1Token = jwt.decode(player1Auth.token);
        const p1Rp = await prisma.room_players.findFirst({
            where: { user_id: p1Token.id, rooms: { games: { some: { id: gameId } } } },
            include: { player_hands: { where: { game_id: gameId } } }
        });

        // Drugi gracz
        const otherAuths = [authA, authB, authC].filter(a => a !== narratorAuth && a !== player1Auth);
        const p2Token = jwt.decode(otherAuths[0].token);
        const p2Rp = await prisma.room_players.findFirst({
            where: { user_id: p2Token.id, rooms: { games: { some: { id: gameId } } } },
            include: { player_hands: { where: { game_id: gameId } } }
        });

        const votingPromise = waitFor(narratorSock, 'start_voting', 6000);

        player1Sock.emit('submit_card', { card_id: p1Rp.player_hands[0].card_id });
        await waitFor(narratorSock, 'player_submitted_card');

        player2Sock.emit('submit_card', { card_id: p2Rp.player_hands[0].card_id });

        const voting = await votingPromise;
        expect(voting.cards).toHaveLength(3); // narrator + 2 graczy
        voting.cards.forEach(c => {
            expect(c).toHaveProperty('submission_id');
            expect(c).toHaveProperty('card');
        });

        const round = await prisma.rounds.findFirst({ where: { game_id: gameId } });
        expect(round.status).toBe('voting');
    });

    test('Głosowanie → round_ended z wynikami i new_round', async () => {
        const round = await prisma.rounds.findFirst({ where: { game_id: gameId } });
        const submissions = await prisma.round_submissions.findMany({ where: { round_id: round.id } });

        const p1Token = jwt.decode(player1Auth.token);
        const p1Rp = await prisma.room_players.findFirst({
            where: { user_id: p1Token.id, rooms: { games: { some: { id: gameId } } } }
        });

        const otherAuths = [authA, authB, authC].filter(a => a !== narratorAuth && a !== player1Auth);
        const p2Token = jwt.decode(otherAuths[0].token);
        const p2Rp = await prisma.room_players.findFirst({
            where: { user_id: p2Token.id, rooms: { games: { some: { id: gameId } } } }
        });

        const p1CanVote = submissions.filter(s => s.player_id !== p1Rp.id);
        const p2CanVote = submissions.filter(s => s.player_id !== p2Rp.id);

        const roundEndedPromise = waitFor(narratorSock, 'round_ended', 8000);
        const newRoundPromise = waitFor(narratorSock, 'new_round', 8000);

        player1Sock.emit('submit_vote', { submission_id: p1CanVote[0].id });
        player2Sock.emit('submit_vote', { submission_id: p2CanVote[0].id });

        const [roundEnded, newRound] = await Promise.all([roundEndedPromise, newRoundPromise]);

        expect(roundEnded.scores).toHaveLength(3);
        roundEnded.scores.forEach(s => {
            expect(s).toHaveProperty('player_id');
            expect(typeof s.round_points).toBe('number');
            expect(s.round_points).toBeGreaterThanOrEqual(0);
        });

        expect(newRound.round_number).toBe(2);
        expect(newRound.status).toBe('prompting');

        const game = await prisma.games.findUnique({ where: { id: gameId } });
        expect(game.current_round).toBe(2);
    });
});
