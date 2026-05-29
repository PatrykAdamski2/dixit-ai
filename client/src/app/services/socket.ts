import { io, Socket } from 'socket.io-client';
import { emitConnectToGame, registerGameSocketHandlers } from './gameSocket';
import { useGameStore } from '../store/useGameStore';
import { navigateToGameIfNeeded } from './gameNavigation';
import type { GamePhase, Player } from '../store/useGameStore';
import { mapLobbyPlayer } from './lobbyApi';

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
    players?: Array<{
      id: string;
      username: string;
      score?: number;
      is_narrator?: boolean;
      is_connected?: boolean;
      is_bot?: boolean;
    }>;
    roomCode?: string;
    room_code?: string;
    gameId?: string;
    game_id?: string;
    phase?: GamePhase;
  }) => {
    const patch: Record<string, unknown> = {};
    if (data.players) patch.players = data.players.map(mapLobbyPlayer);
    if (data.roomCode || data.room_code) patch.roomCode = data.roomCode ?? data.room_code;
    if (data.gameId || data.game_id) patch.gameId = data.gameId ?? data.game_id;
    if (data.phase) patch.currentPhase = data.phase;
    if (Object.keys(patch).length > 0) {
      useGameStore.getState().setGameState(patch);
    }
    navigateToGameIfNeeded(data.phase);
  });

  socket.on('game_started', (payload: { game_id?: string; gameId?: string }) => {
    const gameId = payload.game_id ?? payload.gameId;
    if (!gameId) return;
    useGameStore.getState().setGameState({ gameId, currentPhase: 'waiting', socketError: null });
    emitConnectToGame(gameId);
    navigateToGameIfNeeded('waiting');
  });
};
