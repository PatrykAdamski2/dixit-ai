require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString =
    process.env.NODE_ENV === 'test' && process.env.DATABASE_URL_TEST
        ? process.env.DATABASE_URL_TEST
        : process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error(
        'Missing database connection string. Set DATABASE_URL (or DATABASE_URL_TEST when NODE_ENV=test).'
    );
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'test') {
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('❌ Błąd połączenia z bazą danych PostgreSQL:', err.message);
        } else {
            console.log('✅ Połączono z bazą danych. Czas serwera DB:', res.rows[0].now);
        }
    });
}

// Expose pool for clean shutdown in tests.
prisma.__pool = pool;
prisma.__closePool = () => pool.end();

module.exports = prisma;
