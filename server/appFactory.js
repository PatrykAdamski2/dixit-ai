const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');

function createApp() {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());

    app.use('/api/auth', authRoutes);
    app.use('/api/webhooks', webhookRoutes);

    app.use(express.static('public'));

    return app;
}

module.exports = { createApp };
