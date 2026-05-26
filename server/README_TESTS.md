## API tests (Jest + Supertest)

### 1) Configure test database

- Create a disposable Postgres database (recommended name: `dixit_ai_test`).
- Create `server/.env.test` based on `server/.env.test.example` and set `DATABASE_URL_TEST`.

### 2) Install deps

From `server/`:

- `npm install`

### 3) Run tests

From `server/`:

- `npm run test:api`

What happens:
- Jest `globalSetup` runs `npx prisma db push --force-reset` against `DATABASE_URL_TEST`.
- Tests run against the Express app via Supertest (no real HTTP server is started).

Troubleshooting:
- If you see `DATABASE_URL_TEST is not set`, ensure `server/.env.test` exists or export the env var.
- If tests hang, make sure nothing else is holding DB connections; the suite closes the pg pool in `afterAll`.
