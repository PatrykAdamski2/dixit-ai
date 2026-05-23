import { io, Socket } from 'socket.io-client';
import { useGameStore, GamePhase, Player, Card } from '../store/useGameStore';

// Instancja socketu. W trybie deweloperskim połączenie idzie przez proxy w Vite.
export const socket: Socket = io({
  withCredentials: true,
  autoConnect: false, // Łączymy się ręcznie po zalogowaniu
});

/**
 * Struktura danych przychodzących w evencie gameStateUpdate
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
 * Konfiguracja listenerów Socket.io i mapowanie ich na stan w sklepie Zustand.
 */
export const initSocketListeners = () => {
  const { setGameState, setTimer } = useGameStore.getState();

  socket.on('connect', () => {
    console.log('Połączono z serwerem przez Socket.io');
  });

  socket.on('disconnect', () => {
    console.log('Rozłączono z serwerem Socket.io');
  });

  // Główny event aktualizujący stan gry (faza, gracze, karty na stole itp.)
  socket.on('gameStateUpdate', (data: GameStateUpdate) => {
    console.log('Otrzymano gameStateUpdate:', data);
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

  // Odliczanie czasu sekunda po sekundzie
  socket.on('timerTick', (seconds: number) => {
    setTimer(seconds);
  });

  // Start nowej rundy (można tu zresetować stan specyficzny dla rundy, jeśli trzeba)
  socket.on('newRound', (data: { roundNumber: number, narratorId: string }) => {
    console.log('Nowa runda rozpoczęta:', data);
    // Zustand (setGameState) sam wyciągnie narratorId z listy graczy dzięki naszej logice w storze
  });

  socket.on('error', (error: any) => {
    console.error('Socket error:', error);
  });
};
