const path = require('path');
const fs = require('fs');

function loadDotenvIfPresent() {
    const serverDir = path.join(__dirname, '..');
    const testEnv = path.join(serverDir, '.env.test');
    const devEnv = path.join(serverDir, '.env');
    if (fs.existsSync(testEnv)) {
        require('dotenv').config({ path: testEnv, override: true });
    }
    if (fs.existsSync(devEnv)) {
        require('dotenv').config({ path: devEnv });
    }
}

module.exports = async () => {
    loadDotenvIfPresent();

    const databaseUrlTest = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
    if (!databaseUrlTest) {
        console.warn('\n⚠️  Brak DATABASE_URL_TEST ani DATABASE_URL — testy DB będą fail.\n');
        return;
    }

    // Ustaw DATABASE_URL_TEST jeśli nie było (fallback na dev DB)
    process.env.DATABASE_URL_TEST = databaseUrlTest;
    process.env.DATABASE_URL = databaseUrlTest;

    console.log('\n✅ Baza danych skonfigurowana dla testów.\n');
};
