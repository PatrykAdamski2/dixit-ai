const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');
const lobbyRoutes = require('./routes/lobby');
const statsRoutes = require('./routes/stats');
const gameRoutes = require('./routes/game');
const cardRoutes = require('./routes/cards');
const personalizationRoutes = require('./routes/personalization');
const userRoutes = require('./routes/user');

function createApp() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.use('/api/auth', authRoutes);
    app.use('/api/webhooks', webhookRoutes);
    app.use('/api/lobby', lobbyRoutes);
    app.use('/api/stats', statsRoutes);
    app.use('/api/game', gameRoutes);
    app.use('/api/cards', cardRoutes);
    app.use('/api/personalization', personalizationRoutes);
    app.use('/api/user', userRoutes);

    app.use(express.static('public'));

    return app;
}

module.exports = { createApp };
