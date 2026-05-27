const request = require('supertest');
const { createApp } = require('../appFactory');
const prisma = require('../config/db');

describe('API auth (register/login)', () => {
    const app = createApp();
    // Unikalny suffix per test run — nie czyścimy bazy, nie kolidujemy z istniejącymi danymi
    const RUN = Math.random().toString(36).slice(2, 8);
    const u = (name) => `${name}_auth_${RUN}`;

    afterAll(async () => {
        await prisma.$disconnect();
        if (typeof prisma.__closePool === 'function') {
            await prisma.__closePool();
        }
    });

    test('POST /api/auth/register returns 400 when missing fields', async () => {
        const res = await request(app).post('/api/auth/register').send({ login: 'a' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });

    test('POST /api/auth/register creates user (201)', async () => {
        const login = u('testuser');
        const res = await request(app)
            .post('/api/auth/register')
            .send({ login, password: 'secret123' });

        expect(res.status).toBe(201);

        const user = await prisma.users.findUnique({ where: { username: login } });
        expect(user).toBeTruthy();
        expect(user.password_hash).not.toBe('secret123');
    });

    test('POST /api/auth/register returns 409 for duplicate username', async () => {
        const login = u('dup');
        await request(app)
            .post('/api/auth/register')
            .send({ login, password: 'secret123' })
            .expect(201);

        const res = await request(app)
            .post('/api/auth/register')
            .send({ login, password: 'secret123' });

        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('error');
    });

    test('POST /api/auth/login returns 404 for unknown user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ login: u('nobody'), password: 'secret123' });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    test('POST /api/auth/login returns 401 for wrong password', async () => {
        const login = u('user1');
        await request(app)
            .post('/api/auth/register')
            .send({ login, password: 'secret123' })
            .expect(201);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ login, password: 'badpass' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    test('POST /api/auth/login sets token cookie (200)', async () => {
        const login = u('user2');
        await request(app)
            .post('/api/auth/register')
            .send({ login, password: 'secret123' })
            .expect(201);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ login, password: 'secret123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('response', 'Zalogowany');
        expect(res.body).toHaveProperty('username', login);

        const setCookie = res.headers['set-cookie'] || [];
        expect(setCookie.join(';')).toMatch(/token=/);
    });

    test('GET /api/auth/me zwraca dane zalogowanego (200)', async () => {
        const login = u('meuser');
        await request(app).post('/api/auth/register').send({ login, password: 'secret123' }).expect(201);
        const loginRes = await request(app).post('/api/auth/login').send({ login, password: 'secret123' }).expect(200);
        const cookie = loginRes.headers['set-cookie'];

        const res = await request(app).get('/api/auth/me').set('Cookie', cookie).expect(200);
        expect(res.body).toHaveProperty('username', login);
        expect(res.body).toHaveProperty('id');
    });

    test('GET /api/auth/me zwraca 401 bez tokena', async () => {
        await request(app).get('/api/auth/me').expect(401);
    });

    test('POST /api/auth/logout czyści cookie', async () => {
        const login = u('logout');
        await request(app).post('/api/auth/register').send({ login, password: 'secret123' }).expect(201);
        const loginRes = await request(app).post('/api/auth/login').send({ login, password: 'secret123' }).expect(200);
        const cookie = loginRes.headers['set-cookie'];

        const res = await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(200);
        const setCookie = res.headers['set-cookie']?.join(';') ?? '';
        expect(setCookie).toMatch(/token=;/);
    });
});
