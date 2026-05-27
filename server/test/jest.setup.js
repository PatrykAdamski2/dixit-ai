const path = require('path');
const fs = require('fs');

// Jest runs this in each test file context.
// Load test env if present, and ensure required env vars exist.
const testEnv = path.join(__dirname, '..', '.env.test');
const devEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(testEnv)) {
    require('dotenv').config({ path: testEnv });
} else if (fs.existsSync(devEnv)) {
    require('dotenv').config({ path: devEnv });
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
