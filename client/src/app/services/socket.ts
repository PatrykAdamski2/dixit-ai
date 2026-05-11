import { io, Socket } from 'socket.io-client';
import { useGameStore, GamePhase, Player, Card } from '../store/useGameStore';

// The socket instance. In development, it's proxied through Vite.
export const socket: Socket = io({
  withCredentials: true,
  autoConnect: false, // We will connect manually after login
});

/**
 * Interface for the gameStateUpdate event payload
 */
interface GameStateUpdate {
  phase?: GamePhase;
  players?: Player[];
  roomCode?: string;
  myHand?: Card[];
  tableCards?: Card[];
  narratorPrompt?: string;
  timer?: number;
}

/**
 * Initializes socket.io event listeners and maps them to the Zustand store.
 */
export const initSocketListeners = () => {
  const { setGameState, setTimer } = useGameStore.getState();

  socket.on('connect', () => {
    console.log('Connected to server via Socket.io');
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from Socket.io server');
  });

  // Main game state update event
  socket.on('gameStateUpdate', (data: GameStateUpdate) => {
    console.log('Received gameStateUpdate:', data);
    setGameState({
      currentPhase: data.phase,
      players: data.players,
      roomCode: data.roomCode,
      myHand: data.myHand,
      tableCards: data.tableCards,
      narratorPrompt: data.narratorPrompt,
      timer: data.timer,
    });
  });

  // Tick event for the timer
  socket.on('timerTick', (seconds: number) => {
    setTimer(seconds);
  });

  // Event for starting a new round (resetting local round-specific state if needed)
  socket.on('newRound', (data: { roundNumber: number, narratorId: string }) => {
    console.log('New round started:', data);
    // Zustand's setGameState with players will handle narratorId via the logic we added
  });

  socket.on('error', (error: any) => {
    console.error('Socket error:', error);
  });
};
