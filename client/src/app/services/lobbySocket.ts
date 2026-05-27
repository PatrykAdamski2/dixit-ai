import { socket } from './socket';

/** Dołączenie do pokoju lobby (handler stub na serwerze — gotowe pod pełne API). */
export function emitJoinRoom(roomCode: string) {
  const code = roomCode.trim().toUpperCase();
  if (!code || code === '------') return;
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('join_room', { roomCode: code });
}

export function emitLeaveRoom(roomCode: string) {
  const code = roomCode.trim().toUpperCase();
  if (!code) return;
  socket.emit('leave_room', { roomCode: code });
}
