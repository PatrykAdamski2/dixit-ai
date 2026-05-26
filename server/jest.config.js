module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
    globalSetup: '<rootDir>/test/globalSetup.js',
    // Keep tests deterministic and avoid connection contention.
    maxWorkers: 1,
    testTimeout: 60_000,
};
