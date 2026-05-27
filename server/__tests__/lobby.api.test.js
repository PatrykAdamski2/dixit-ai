const request = require('supertest');
const { createApp } = require('../appFactory');
const prisma = require('../config/db');

const app = createApp();

// Losowy suffix żeby nie kolidować z istniejącymi danymi
const RUN = Math.random().toString(36).slice(2, 8);
const u = (name) => `${name}_${RUN}`;

async function registerAndLogin(login) {
    await request(app)
        .post('/api/auth/register')
        .send({ login, password: 'secret123' })
        .expect(201);

    const res = await request(app)
        .post('/api/auth/login')
        .send({ login, password: 'secret123' })
        .expect(200);

    const setCookie = res.headers['set-cookie'] || [];
    return setCookie.find(c => c.startsWith('token='));
}

async function ensureCardSet() {
    const existing = await prisma.card_sets.findFirst();
    if (existing) return existing.id;

    const set = await prisma.card_sets.create({ data: { name: `TestSet_${RUN}` } });
    for (let i = 1; i <= 30; i++) {
        await prisma.cards.create({ data: { set_id: set.id, image_url: `/Karty/KartaNr${i}.png` } });
    }
    return set.id;
}

afterAll(async () => {
    await prisma.$disconnect();
    if (typeof prisma.__closePool === 'function') await prisma.__closePool();
});

describe('Lobby API', () => {
    let cookieA, cookieB, cookieC;

    beforeAll(async () => {
        await ensureCardSet();
        cookieA = await registerAndLogin(u('hostA'));
        cookieB = await registerAndLogin(u('playerB'));
        cookieC = await registerAndLogin(u('playerC'));
    });

    // ── GET default-settings ──────────────────────────────────────────────────

    test('GET /api/lobby/default-settings zwraca ustawienia (200)', async () => {
        const res = await request(app)
            .get('/api/lobby/default-settings')
            .set('Cookie', cookieA)
            .expect(200);

        expect(res.body).toMatchObject({
            max_players: expect.any(Number),
            end_condition: expect.any(String),
            point_limit: expect.any(Number)
        });
    });

    test('GET /api/lobby/default-settings zwraca 401 bez tokena', async () => {
        await request(app).get('/api/lobby/default-settings').expect(401);
    });

    // ── POST /create ──────────────────────────────────────────────────────────

    describe('POST /api/lobby/create', () => {
        test('Tworzy pokój i zwraca roomCode (201)', async () => {
            const res = await request(app)
                .post('/api/lobby/create')
                .set('Cookie', cookieA)
                .send({})
                .expect(201);

            expect(res.body).toHaveProperty('roomCode');
            expect(res.body.roomCode).toHaveLength(6);
            expect(res.body).toHaveProperty('roomId');
            expect(res.body.players).toHaveLength(1);
            expect(res.body.players[0].username).toBe(u('hostA'));
        });

        test('Wymaga autoryzacji (401 bez tokena)', async () => {
            await request(app).post('/api/lobby/create').send({}).expect(401);
        });
    });

    // ── POST /join ────────────────────────────────────────────────────────────

    describe('POST /api/lobby/join', () => {
        let roomCode;

        beforeEach(async () => {
            const res = await request(app)
                .post('/api/lobby/create')
                .set('Cookie', cookieA)
                .send({})
                .expect(201);
            roomCode = res.body.roomCode;
        });

        test('Gracz dołącza do pokoju (200)', async () => {
            const res = await request(app)
                .post('/api/lobby/join')
                .set('Cookie', cookieB)
                .send({ roomCode })
                .expect(200);

            expect(res.body.roomCode).toBe(roomCode);
            expect(res.body.players).toHaveLength(2);
            const names = res.body.players.map(p => p.username);
            expect(names).toContain(u('hostA'));
            expect(names).toContain(u('playerB'));
        });

        test('Dołączenie drugi raz nie duplikuje gracza (200)', async () => {
            await request(app).post('/api/lobby/join').set('Cookie', cookieB).send({ roomCode }).expect(200);
            const res = await request(app).post('/api/lobby/join').set('Cookie', cookieB).send({ roomCode }).expect(200);
            expect(res.body.players).toHaveLength(2);
        });

        test('Zły kod pokoju → 404', async () => {
            await request(app).post('/api/lobby/join').set('Cookie', cookieB).send({ roomCode: 'ZZZZZZ' }).expect(404);
        });

        test('Brak kodu → 400', async () => {
            await request(app).post('/api/lobby/join').set('Cookie', cookieB).send({}).expect(400);
        });

        test('Pełny pokój → 409', async () => {
            const small = await request(app)
                .post('/api/lobby/create')
                .set('Cookie', cookieA)
                .send({ max_players: 1 })
                .expect(201);

            await request(app)
                .post('/api/lobby/join')
                .set('Cookie', cookieB)
                .send({ roomCode: small.body.roomCode })
                .expect(409);
        });
    });

    // ── POST /start ───────────────────────────────────────────────────────────

    describe('POST /api/lobby/start', () => {
        let roomCode;

        beforeEach(async () => {
            const res = await request(app)
                .post('/api/lobby/create')
                .set('Cookie', cookieA)
                .send({})
                .expect(201);
            roomCode = res.body.roomCode;

            await request(app).post('/api/lobby/join').set('Cookie', cookieB).send({ roomCode }).expect(200);
            await request(app).post('/api/lobby/join').set('Cookie', cookieC).send({ roomCode }).expect(200);
        });

        test('Host startuje grę z 3 graczami (200)', async () => {
            const res = await request(app)
                .post('/api/lobby/start')
                .set('Cookie', cookieA)
                .send({ roomCode })
                .expect(200);

            expect(res.body).toHaveProperty('gameId');

            const game = await prisma.games.findUnique({ where: { id: res.body.gameId } });
            expect(game).toBeTruthy();
            expect(game.status).toBe('active');
            expect(game.current_round).toBe(1);

            const round = await prisma.rounds.findFirst({ where: { game_id: res.body.gameId } });
            expect(round.status).toBe('prompting');
            expect(round.narrator_player_id).not.toBeNull();

            const hands = await prisma.player_hands.findMany({ where: { game_id: res.body.gameId } });
            expect(hands.length).toBeGreaterThanOrEqual(18); // 3 × 6

            const scores = await prisma.game_scores.findMany({ where: { game_id: res.body.gameId } });
            expect(scores).toHaveLength(3);
            scores.forEach(s => expect(s.score).toBe(0));
        });

        test('Nie-host nie może wystartować (403)', async () => {
            await request(app).post('/api/lobby/start').set('Cookie', cookieB).send({ roomCode }).expect(403);
        });

        test('Za mało graczy → 400', async () => {
            const solo = await request(app)
                .post('/api/lobby/create')
                .set('Cookie', cookieA)
                .send({})
                .expect(201);

            await request(app).post('/api/lobby/start').set('Cookie', cookieA).send({ roomCode: solo.body.roomCode }).expect(400);
        });

        test('Drugi start tego samego pokoju → 409', async () => {
            await request(app).post('/api/lobby/start').set('Cookie', cookieA).send({ roomCode }).expect(200);
            await request(app).post('/api/lobby/start').set('Cookie', cookieA).send({ roomCode }).expect(409);
        });

        test('Brak kodu → 400', async () => {
            await request(app).post('/api/lobby/start').set('Cookie', cookieA).send({}).expect(400);
        });
    });

    // ── POST /add-bot ─────────────────────────────────────────────────────────

    describe('POST /api/lobby/add-bot', () => {
        let roomCode;

        beforeEach(async () => {
            const res = await request(app)
                .post('/api/lobby/create')
                .set('Cookie', cookieA)
                .send({})
                .expect(201);
            roomCode = res.body.roomCode;
        });

        test('Host dodaje bota (201)', async () => {
            const res = await request(app)
                .post('/api/lobby/add-bot')
                .set('Cookie', cookieA)
                .send({ roomCode })
                .expect(201);

            const bot = res.body.players.find(p => p.is_bot);
            expect(bot).toBeTruthy();
            expect(bot.username).toMatch(/Bot/);
        });

        test('Nie-host nie może dodać bota (403)', async () => {
            await request(app).post('/api/lobby/add-bot').set('Cookie', cookieB).send({ roomCode }).expect(403);
        });
    });
});
