const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

function loadDotenvIfPresent() {
    const dotenvPath = path.join(__dirname, '..', '.env.test');
    if (fs.existsSync(dotenvPath)) {
        require('dotenv').config({ path: dotenvPath });
    }
}

module.exports = async () => {
    loadDotenvIfPresent();

    const databaseUrlTest = process.env.DATABASE_URL_TEST;
    if (!databaseUrlTest) {
        throw new Error(
            'DATABASE_URL_TEST is not set. Create server/.env.test (or set env var) before running API tests.'
        );
    }

    // Prisma CLI uses DATABASE_URL; point it at the test DB.
    const env = {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: databaseUrlTest,
    };

    // Prisma Client must exist before app code imports @prisma/client.
    execFileSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        [
            'prisma',
            'generate',
            '--schema',
            path.join(__dirname, '..', 'prisma', 'schema.prisma'),
        ],
        { stdio: 'inherit', env }
    );

    // Ensure schema exists and is clean for the test run.
    execFileSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        [
            'prisma',
            'db',
            'push',
            '--schema',
            path.join(__dirname, '..', 'prisma', 'schema.prisma'),
            '--force-reset',
            '--accept-data-loss',
        ],
        { stdio: 'inherit', env }
    );
};
