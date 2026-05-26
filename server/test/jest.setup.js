const path = require('path');
const fs = require('fs');

// Jest runs this in each test file context.
// Load test env if present, and ensure required env vars exist.
const dotenvPath = path.join(__dirname, '..', '.env.test');
if (fs.existsSync(dotenvPath)) {
	require('dotenv').config({ path: dotenvPath });
}

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
