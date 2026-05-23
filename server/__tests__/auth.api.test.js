const request = require('supertest');

const { createApp } = require('../appFactory');
const prisma = require('../config/db');

describe('API auth (register/login)', () => {
    const app = createApp();

    beforeEach(async () => {
        // Keep tests isolated; we only touch users here.
        await prisma.users.deleteMany();
    });

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
        const res = await request(app)
            .post('/api/auth/register')
            .send({ login: 'testuser', password: 'secret123' });

        expect(res.status).toBe(201);

        const user = await prisma.users.findUnique({ where: { username: 'testuser' } });
        expect(user).toBeTruthy();
        expect(user.email).toBe('testuser@placeholder.dixit-ai.com');
        expect(user.password_hash).not.toBe('secret123');
    });

    test('POST /api/auth/register returns 409 for duplicate username', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ login: 'dup', password: 'secret123' })
            .expect(201);

        const res = await request(app)
            .post('/api/auth/register')
            .send({ login: 'dup', password: 'secret123' });

        expect(res.status).toBe(409);
        expect(res.body).toHaveProperty('error');
    });

    test('POST /api/auth/login returns 404 for unknown user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ login: 'nope', password: 'secret123' });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    test('POST /api/auth/login returns 401 for wrong password', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ login: 'user1', password: 'secret123' })
            .expect(201);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ login: 'user1', password: 'badpass' });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    test('POST /api/auth/login sets token cookie (200)', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ login: 'user2', password: 'secret123' })
            .expect(201);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ login: 'user2', password: 'secret123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('response', 'Zalogowany');
        expect(res.body).toHaveProperty('username', 'user2');

        const setCookie = res.headers['set-cookie'] || [];
        expect(setCookie.join(';')).toMatch(/token=/);
    });
});
