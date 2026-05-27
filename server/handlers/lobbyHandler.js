const prisma = require('../config/db');

module.exports = (io, socket) => {
    // Dołącz do kanału lobby (po create/join przez REST)
    socket.on('join_room', async ({ roomCode }) => {
        try {
            if (!roomCode) return socket.emit('error', { message: 'Brak kodu pokoju' });

            const code = roomCode.toUpperCase();
            const userId = socket.user.id;

            const room = await prisma.rooms.findUnique({
                where: { code },
                include: { room_players: { include: { users: true } } }
            });

            if (!room) return socket.emit('error', { message: 'Pokój nie istnieje' });

            // Sprawdź czy gracz jest w pokoju (może też być bot-only ale wtedy brak user_id)
            const isInRoom = room.room_players.some(rp => rp.user_id === userId);
            if (!isInRoom) return socket.emit('error', { message: 'Nie jesteś uczestnikiem tego pokoju' });

            const lobbyRoom = `lobby:${code}`;
            socket.join(lobbyRoom);
            socket.lobbyCode = code;

            const playersDto = room.room_players.map(rp => ({
                id: rp.id,
                username: rp.is_bot ? `Bot (${rp.bot_difficulty ?? 'medium'})` : (rp.users?.username ?? null),
                is_bot: rp.is_bot ?? false,
                is_connected: true,
                score: 0
            }));

            // Wyślij aktualną listę graczy do pokoju
            io.to(lobbyRoom).emit('lobbyUpdate', { players: playersDto });
        } catch (err) {
            console.error(err);
            socket.emit('error', { message: 'Błąd dołączania do lobby' });
        }
    });

    socket.on('leave_room', async () => {
        try {
            const code = socket.lobbyCode;
            if (!code) return;

            const userId = socket.user.id;
            const lobbyRoom = `lobby:${code}`;

            const room = await prisma.rooms.findUnique({
                where: { code },
                include: { room_players: { include: { users: true } } }
            });

            if (room && room.status === 'waiting') {
                // Usuń gracza z pokoju
                await prisma.room_players.deleteMany({
                    where: { room_id: room.id, user_id: userId }
                });

                // Jeśli gracz był hostem i w pokoju są inni — usuń cały pokój
                if (room.host_user_id === userId) {
                    await prisma.rooms.delete({ where: { id: room.id } });
                    io.to(lobbyRoom).emit('lobby_closed', { reason: 'Host opuścił pokój' });
                    io.socketsLeave(lobbyRoom);
                    return;
                }

                const remaining = await prisma.room_players.findMany({
                    where: { room_id: room.id },
                    include: { users: true }
                });

                const playersDto = remaining.map(rp => ({
                    id: rp.id,
                    username: rp.is_bot ? `Bot (${rp.bot_difficulty ?? 'medium'})` : (rp.users?.username ?? null),
                    is_bot: rp.is_bot ?? false,
                    is_connected: true,
                    score: 0
                }));

                io.to(lobbyRoom).emit('lobbyUpdate', { players: playersDto });
            }

            socket.leave(lobbyRoom);
            socket.lobbyCode = null;
        } catch (err) {
            console.error(err);
            socket.emit('error', { message: 'Błąd opuszczania lobby' });
        }
    });
};
