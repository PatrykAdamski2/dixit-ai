import { DEFAULT_LOBBY_SETTINGS, fetchApi, fetchOptional } from './api';
import { useGameStore, Player } from '../store/useGameStore';
import { emitJoinRoom } from './lobbySocket';

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

export type LobbySource = 'api';

export interface LobbyActionResult {
  roomCode: string;
  gameId?: string;
  players?: Player[];
  source: LobbySource;
}

export function mapLobbyPlayer(dto: LobbyPlayerDto): Player {
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

type DefaultSettingsDto = {
  max_players?: number;
  maxPlayers?: number;
  end_condition?: 'points' | 'rounds';
  endCondition?: 'points' | 'rounds';
  point_limit?: number;
  round_limit?: number | null;
  end_limit?: number;
  endLimit?: number;
};

/** Mapuje odpowiedź BE (snake_case) na pola używane w UI. */
export function mapLobbySettings(raw: DefaultSettingsDto): LobbySettings {
  const endCondition =
    raw.end_condition ?? raw.endCondition ?? DEFAULT_LOBBY_SETTINGS.endCondition;
  const maxPlayersRaw = raw.max_players ?? raw.maxPlayers ?? DEFAULT_LOBBY_SETTINGS.maxPlayers;
  const maxPlayers = Math.min(
    8,
    Math.max(3, Number(maxPlayersRaw) || DEFAULT_LOBBY_SETTINGS.maxPlayers)
  );

  let endLimit: number;
  if (endCondition === 'rounds') {
    const rounds = raw.round_limit ?? raw.end_limit ?? raw.endLimit;
    endLimit = Number(rounds) || 10;
  } else {
    const points = raw.point_limit ?? raw.end_limit ?? raw.endLimit;
    endLimit = Number(points) || DEFAULT_LOBBY_SETTINGS.endLimit;
  }

  return { maxPlayers, endCondition, endLimit };
}

export async function fetchLobbyDefaultSettings(): Promise<LobbySettings | null> {
  const data = await fetchOptional<DefaultSettingsDto>('/api/lobby/default-settings');
  if (!data) return null;
  return mapLobbySettings(data);
}

export async function createLobby(settings: LobbySettings): Promise<LobbyActionResult> {
  const data = await fetchApi<CreateLobbyResponse>('/api/lobby/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      max_players: settings.maxPlayers,
      end_condition: settings.endCondition,
      point_limit: settings.endCondition === 'points' ? settings.endLimit : undefined,
      round_limit: settings.endCondition === 'rounds' ? settings.endLimit : undefined,
    }),
  });
  applyLobbyResponse(data);
  return { ...data, players: data.players?.map(mapLobbyPlayer), source: 'api' };
}

export async function joinLobby(code: string): Promise<LobbyActionResult> {
  const normalized = code.toUpperCase();
  const data = await fetchApi<JoinLobbyResponse>('/api/lobby/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomCode: normalized }),
  });
  applyLobbyResponse(data);
  return { ...data, players: data.players?.map(mapLobbyPlayer), source: 'api' };
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

