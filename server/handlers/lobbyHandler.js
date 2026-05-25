/**
 * WebSocket lobby — szkielet (MVP faza 2 w docs/PLAN_MVP_PODSTAWOWY.md).
 * REST /api/lobby/* — osobno w routes/lobby.js (jeszcze brak).
 */
module.exports = (io, socket) => {
    socket.on('join_room', ({ roomCode } = {}) => {
        if (!roomCode) {
            return socket.emit('error', { message: 'Brak kodu pokoju' });
        }
        const code = String(roomCode).toUpperCase();
        socket.join(`lobby:${code}`);
        console.log(
            `[lobby] ${socket.user?.login ?? socket.id} dołączył do lobby:${code} (stub)`
        );
        socket.emit('lobbyUpdate', {
            roomCode: code,
            phase: 'waiting',
            players: [],
        });
    });

    socket.on('leave_room', ({ roomCode } = {}) => {
        if (roomCode) {
            socket.leave(`lobby:${String(roomCode).toUpperCase()}`);
        }
    });
};
