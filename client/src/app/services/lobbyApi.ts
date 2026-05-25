import { fetchOptional } from './api';
import { useGameStore, Player } from '../store/useGameStore';
import { setupDemoLobby } from './demoLobby';
import { emitJoinRoom } from './lobbySocket';
import { notifyInfo } from './socketNotify';

export interface LobbySettings {
  maxPlayers: number;
  endCondition: 'points' | 'rounds';
  endLimit: number;
}

/** Odpowiedź POST /api/lobby/create — pola zgodne ze store po mapowaniu */
export interface CreateLobbyResponse {
  roomCode: string;
  gameId?: string;
  players?: LobbyPlayerDto[];
}

export interface JoinLobbyResponse {
  roomCode: string;
  gameId?: string;
  players?: LobbyPlayerDto[];
}

export interface StartLobbyResponse {
  gameId?: string;
}

export interface LobbyPlayerDto {
  id: string;
  username: string;
  score?: number;
  is_narrator?: boolean;
  is_connected?: boolean;
  is_bot?: boolean;
}

export type LobbySource = 'api' | 'demo';

export interface LobbyActionResult {
  roomCode: string;
  gameId?: string;
  players?: Player[];
  source: LobbySource;
}

function mapLobbyPlayer(dto: LobbyPlayerDto): Player {
  return {
    id: String(dto.id),
    username: dto.username,
    score: dto.score ?? 0,
    isNarrator: !!dto.is_narrator,
    isConnected: dto.is_connected ?? true,
    isBot: !!dto.is_bot,
  };
}

function applyLobbyResponse(data: CreateLobbyResponse | JoinLobbyResponse) {
  const players = (data.players ?? []).map(mapLobbyPlayer);
  useGameStore.getState().setGameState({
    roomCode: data.roomCode,
    gameId: data.gameId ?? null,
    players,
    socketError: null,
  });
  emitJoinRoom(data.roomCode);
}

export async function fetchLobbyDefaultSettings(): Promise<LobbySettings | null> {
  return fetchOptional<LobbySettings>('/api/lobby/default-settings');
}

export async function createLobby(settings: LobbySettings): Promise<LobbyActionResult> {
  const data = await fetchOptional<CreateLobbyResponse>('/api/lobby/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (data) {
    applyLobbyResponse(data);
    return { ...data, players: data.players?.map(mapLobbyPlayer), source: 'api' };
  }

  const code = setupDemoLobby(true);
  const { players, gameId, roomCode } = useGameStore.getState();
  emitJoinRoom(code);
  notifyInfo('Utworzono pokój demonstracyjny — bez synchronizacji między przeglądarkami.');
  return {
    roomCode: roomCode ?? code,
    gameId: gameId ?? undefined,
    players,
    source: 'demo',
  };
}

export async function joinLobby(code: string): Promise<LobbyActionResult> {
  const normalized = code.toUpperCase();
  const data = await fetchOptional<JoinLobbyResponse>('/api/lobby/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: normalized }),
  });
  if (data) {
    applyLobbyResponse(data);
    return { ...data, players: data.players?.map(mapLobbyPlayer), source: 'api' };
  }

  useGameStore.getState().setGameState({
    roomCode: normalized,
    players: [],
    socketError: null,
  });
  emitJoinRoom(normalized);
  notifyInfo('Dołączono do kodu pokoju — lista graczy pojawi się po API lub lobbyUpdate.');
  return { roomCode: normalized, players: [], source: 'demo' };
}

export async function startLobbyGame(
  roomCode: string,
  settings: LobbySettings
): Promise<{ ok: boolean; gameId?: string }> {
  try {
    const res = await fetch('/api/lobby/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ roomCode, settings }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json().catch(() => ({}))) as StartLobbyResponse;
    if (data.gameId) {
      useGameStore.getState().setGameId(data.gameId);
    }
    return { ok: true, gameId: data.gameId };
  } catch {
    return { ok: false };
  }
}

export async function addLobbyBot(roomCode: string): Promise<boolean> {
  const res = await fetch('/api/lobby/add-bot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ roomCode }),
  });
  return res.ok;
}

export function isDemoLobbySession(): boolean {
  return useGameStore.getState().gameId === 'demo-game-id';
}
