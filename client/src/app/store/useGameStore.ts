import { create } from 'zustand';

export type GamePhase = 'waiting' | 'prompting' | 'submitting' | 'voting' | 'scoring' | 'ended';

export interface Player {
  id: string;
  username: string;
  score: number;
  isNarrator: boolean;
  isConnected: boolean;
  isBot: boolean;
}

export interface Card {
  id: string;
  imageUrl: string;
}

/** Karta na stole do głosowania — id głosu to submission_id z backendu */
export interface TableCard {
  submissionId: string;
  cardId: string;
  imageUrl: string;
}

export interface UserProfile {
  username: string;
  coins: number;
  avatar?: string;
}

interface GameState {
  // Informacje o zalogowanym użytkowniku (monety, nick itp.)
  user: UserProfile | null;

  // Kod pokoju i aktualna faza gry (np. wybieranie kart, głosowanie)
  roomCode: string | null;
  gameId: string | null;
  currentPhase: GamePhase;
  socketError: string | null;
  
  // Lista wszystkich graczy w lobby/grze
  players: Player[];
  myId: string | null; // Moje ID przypisane przez serwer
  narratorId: string | null; // ID gracza, który jest aktualnie narratorem
  
  // Stan konkretnej rundy
  myHand: Card[]; // Karty, które mam na ręce
  tableCards: TableCard[];
  narratorPrompt: string | null; // Hasło wymyślone przez narratora
  timer: number | null; // Czas pozostały do końca fazy (w sekundach)
  lastRoundScores: Record<string, number>;

  // Funkcje do aktualizacji stanu
  setUser: (user: UserProfile | null) => void;
  setRoomCode: (code: string | null) => void;
  setGameId: (id: string | null) => void;
  setSocketError: (message: string | null) => void;
  setPhase: (phase: GamePhase) => void;
  setPlayers: (players: Player[]) => void;
  setMyHand: (cards: Card[]) => void;
  setTableCards: (cards: TableCard[]) => void;
  setNarratorPrompt: (prompt: string | null) => void;
  setTimer: (seconds: number | null) => void;
  setMyId: (id: string | null) => void;
  
  // Masowa aktualizacja stanu (przydatne przy eventach z Socket.io)
  setGameState: (state: Partial<GameState>) => void;
  
  // Powrót do stanu początkowego (np. po wyjściu z gry)
  resetGame: () => void;
}

const initialState = {
  user: null,
  roomCode: null,
  gameId: null,
  currentPhase: 'waiting' as GamePhase,
  socketError: null,
  players: [],
  myId: null,
  narratorId: null,
  myHand: [],
  tableCards: [],
  narratorPrompt: null,
  timer: null,
  lastRoundScores: {},
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setGameId: (gameId) => set({ gameId }),
  setSocketError: (socketError) => set({ socketError }),
  setPhase: (currentPhase) => set({ currentPhase }),
  setPlayers: (players) => set({ 
    players,
    narratorId: players.find(p => p.isNarrator)?.id || null
  }),
  setMyHand: (myHand) => set({ myHand }),
  setTableCards: (tableCards) => set({ tableCards }),
  setNarratorPrompt: (narratorPrompt) => set({ narratorPrompt }),
  setTimer: (timer) => set({ timer }),
  setMyId: (myId) => set({ myId }),
  setGameState: (newState) => set((state) => {
    // Przy aktualizacji graczy od razu wyciągamy ID narratora dla wygody
    const updatedNarratorId = newState.players 
      ? newState.players.find(p => p.isNarrator)?.id || null 
      : state.narratorId;
      
    return { ...state, ...newState, narratorId: updatedNarratorId };
  }),

  /** Czyści stan gry; profil użytkownika zostaje (np. powrót z RoundEnd). */
  resetGame: () =>
    set((state) => ({
      ...initialState,
      user: state.user,
    })),
}));
