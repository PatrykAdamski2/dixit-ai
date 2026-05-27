require('dotenv').config();
const { createServer } = require('http');
const { Server } = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');

const gameHandler = require('./handlers/gameHandler');
const lobbyHandler = require('./handlers/lobbyHandler');
const { createApp } = require('./appFactory');
const { setIo } = require('./lib/socketBus');

const app = createApp();

const server = createServer(app);
const io = new Server(server, {
    cors: { origin: true, credentials: true }
});

// Udostępnij io dla REST routes (broadcast z lobby routes)
setIo(io);

io.use((socket, next) => {
    try {
        const cookies = cookie.parse(socket.request.headers.cookie || "");
        const token = cookies.token;

        if (!token)
            return next(new Error('Brak tokena'));
        const result = jwt.verify(token, process.env.JWT_SECRET);

        socket.user = result;
        next();
    } catch (err) {
        next(new Error('Niezalogowany'));
    }
});

io.on('connection', (socket) => {
    lobbyHandler(io, socket);
    gameHandler(io, socket);
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Connect to Redis if uncommented
        // await redisClient.connect();
        // console.log('Connected to Redis');

        server.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        // await prisma.$disconnect();
        process.exit(1);
    }
}

startServer();

module.exports = { app, server, io, startServer };
