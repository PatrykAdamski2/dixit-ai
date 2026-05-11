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

export interface UserProfile {
  username: string;
  coins: number;
  avatar?: string;
}

interface GameState {
  // Informacje o zalogowanym użytkowniku
  user: UserProfile | null;

  // Dane pokoju / lobby
  roomCode: string | null;
  currentPhase: GamePhase;
  
  // Lista graczy i info o turze
  players: Player[];
  myId: string | null;
  narratorId: string | null;
  
  // Dane konkretnej rundy
  myHand: Card[];
  tableCards: Card[]; // Karty wyłożone do głosowania
  narratorPrompt: string | null;
  timer: number | null;

  // Akcje zmieniające stan
  setUser: (user: UserProfile | null) => void;
  setRoomCode: (code: string | null) => void;
  setPhase: (phase: GamePhase) => void;
  setPlayers: (players: Player[]) => void;
  setMyHand: (cards: Card[]) => void;
  setTableCards: (cards: Card[]) => void;
  setNarratorPrompt: (prompt: string | null) => void;
  setTimer: (seconds: number | null) => void;
  setMyId: (id: string | null) => void;
  setGameState: (state: Partial<GameState>) => void;
  
  // Funkcje pomocnicze
  resetGame: () => void;
}

const initialState = {
  user: null,
  roomCode: null,
  currentPhase: 'waiting' as GamePhase,
  players: [],
  myId: null,
  narratorId: null,
  myHand: [],
  tableCards: [],
  narratorPrompt: null,
  timer: null,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setRoomCode: (roomCode) => set({ roomCode }),
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

  resetGame: () => set(initialState),
}));
