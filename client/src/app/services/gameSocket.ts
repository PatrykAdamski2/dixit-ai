import type { Socket } from 'socket.io-client';
import {
  useGameStore,
  GamePhase,
  Card,
  TableCard,
  Player,
} from '../store/useGameStore';
import { socket } from './socket';
import { navigateToGameIfNeeded } from './gameNavigation';
import { notifySocketError } from './socketNotify';

/** Kontrakt docelowego eventu `gameStateUpdate` z serwera */
export interface GameStateUpdatePayload {
  phase?: GamePhase;
  players?: Player[];
  roomCode?: string;
  gameId?: string;
  myHand?: Card[];
  tableCards?: TableCard[];
  narratorPrompt?: string;
  narratorId?: string;
  myId?: string;
  timer?: number;
}

export function mapRoundStatus(status?: string | null): GamePhase {
  switch (status) {
    case 'prompting':
    case 'submitting':
    case 'voting':
      return status;
    case 'ended':
      return 'scoring';
    default:
      return 'waiting';
  }
}

/** Jedna funkcja mapowania kart z eventów serwera. */
export function mapServerCard(raw: { id?: string | number; image_url?: string }): Card {
  const id = String(raw.id ?? '');
  const normalized = raw.image_url?.startsWith('/Karty/')
    ? undefined
    : raw.image_url;
  const imageUrl = normalized || (id ? `/api/cards/${id}/image` : '/api/cards/1/image');
  return { id, imageUrl };
}

function mapTableCards(
  items: Array<{ submission_id: string; card: { id?: string | number; image_url?: string } }>
): TableCard[] {
  return items.map((item) => {
    const card = mapServerCard(item.card);
    return {
      submissionId: String(item.submission_id),
      cardId: card.id,
      imageUrl: card.imageUrl,
    };
  });
}

export function registerGameSocketHandlers(sock: Socket) {
  const get = () => useGameStore.getState();

  sock.on('connected_to_game', (payload: {
    game_state?: { status?: string };
    round_state?: {
      status?: string;
      narrator_player_id?: string;
      prompt?: string;
    } | null;
    hand?: Array<{ id?: string | number; image_url?: string }>;
    player_id?: string;
  }) => {
    const phase = mapRoundStatus(payload.round_state?.status);
    const hand = (payload.hand ?? []).map(mapServerCard);
    get().setGameState({
      currentPhase: phase,
      myId: payload.player_id ? String(payload.player_id) : null,
      narratorId: payload.round_state?.narrator_player_id
        ? String(payload.round_state.narrator_player_id)
        : null,
      myHand: hand,
      narratorPrompt: payload.round_state?.prompt ?? null,
      socketError: null,
    });
    navigateToGameIfNeeded(phase);
  });

  sock.on('prompt_submitted', ({ prompt }: { prompt: string }) => {
    get().setGameState({
      currentPhase: 'submitting',
      narratorPrompt: prompt,
      socketError: null,
    });
  });

  sock.on('start_voting', ({ cards }: {
    cards: Array<{ submission_id: string; card: { id?: string | number; image_url?: string } }>;
  }) => {
    get().setGameState({
      currentPhase: 'voting',
      tableCards: mapTableCards(cards),
      socketError: null,
    });
  });

  sock.on('round_ended', (payload: { scores?: Array<{ player_id: string; round_points: number }> }) => {
    const mapped =
      payload?.scores?.reduce<Record<string, number>>((acc, item) => {
        acc[String(item.player_id)] = item.round_points;
        return acc;
      }, {}) ?? {};
    get().setGameState({
      currentPhase: 'scoring',
      lastRoundScores: mapped,
      socketError: null,
    });
  });

  sock.on('new_round', () => {
    get().setGameState({
      currentPhase: 'prompting',
      tableCards: [],
      narratorPrompt: null,
      lastRoundScores: {},
      socketError: null,
    });
  });

  sock.on('game_over', () => {
    get().setGameState({
      currentPhase: 'ended',
      socketError: null,
    });
  });

  sock.on('gameStateUpdate', (data: GameStateUpdatePayload) => {
    get().setGameState({
      currentPhase: data.phase,
      players: data.players,
      roomCode: data.roomCode,
      gameId: data.gameId,
      myId: data.myId,
      narratorId: data.narratorId,
      myHand: data.myHand,
      tableCards: data.tableCards,
      narratorPrompt: data.narratorPrompt,
      timer: data.timer,
      socketError: null,
    });
    navigateToGameIfNeeded(data.phase);
  });

  sock.on('timerTick', (seconds: number) => {
    get().setTimer(seconds);
  });

  sock.on('error', (payload: { message?: string } | string) => {
    const message =
      typeof payload === 'string' ? payload : payload?.message ?? 'Błąd połączenia z grą';
    get().setSocketError(message);
    notifySocketError(message);
  });
}

export function emitConnectToGame(gameId: string) {
  socket.emit('connect_to_game', { game_id: gameId });
}

export function emitSubmitPrompt(cardId: string, prompt: string) {
  socket.emit('submit_prompt', { card_id: cardId, prompt });
}

export function emitSubmitCard(cardId: string) {
  socket.emit('submit_card', { card_id: cardId });
}

export function emitSubmitVote(submissionId: string) {
  socket.emit('submit_vote', { submission_id: submissionId });
}

export function emitDisconnectFromGame() {
  socket.emit('disconnect_from_game');
}
