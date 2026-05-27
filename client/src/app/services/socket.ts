import { io, Socket } from 'socket.io-client';
import { registerGameSocketHandlers } from './gameSocket';
import { useGameStore } from '../store/useGameStore';
import { navigateToGameIfNeeded } from './gameNavigation';
import type { GamePhase, Player } from '../store/useGameStore';

export const socket: Socket = io({
  withCredentials: true,
  autoConnect: false,
});

let listenersReady = false;

export const initSocketListeners = () => {
  if (listenersReady) return;
  listenersReady = true;

  socket.on('connect', () => {
    console.log('Połączono z serwerem przez Socket.io');
  });

  socket.on('disconnect', () => {
    console.log('Rozłączono z serwerem Socket.io');
  });

  registerGameSocketHandlers(socket);

  socket.on('lobbyUpdate', (data: {
    players?: Player[];
    roomCode?: string;
    gameId?: string;
    phase?: GamePhase;
  }) => {
    const patch: Record<string, unknown> = {};
    if (data.players) patch.players = data.players;
    if (data.roomCode) patch.roomCode = data.roomCode;
    if (data.gameId) patch.gameId = data.gameId;
    if (data.phase) patch.currentPhase = data.phase;
    if (Object.keys(patch).length > 0) {
      useGameStore.getState().setGameState(patch);
    }
    navigateToGameIfNeeded(data.phase);
  });
};
