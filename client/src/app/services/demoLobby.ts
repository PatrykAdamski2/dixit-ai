import { sliceLocalHand } from '../data/mockCards';
import { useGameStore, Player, GamePhase } from '../store/useGameStore';

const DEMO_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateDemoRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += DEMO_CHARS[Math.floor(Math.random() * DEMO_CHARS.length)];
  }
  return code;
}

function buildDemoPlayers(hostUsername: string): Player[] {
  const hostId = 'demo-host';
  const myId = 'demo-me';
  return [
    {
      id: hostId,
      username: hostUsername,
      score: 12,
      isNarrator: true,
      isConnected: true,
      isBot: false,
    },
    {
      id: myId,
      username: 'GraczDemo',
      score: 8,
      isNarrator: false,
      isConnected: true,
      isBot: false,
    },
    {
      id: 'demo-bot-1',
      username: 'DixitBot',
      score: 5,
      isNarrator: false,
      isConnected: true,
      isBot: true,
    },
  ];
}

export function seedDemoHand() {
  return sliceLocalHand(6);
}

export function isDemoGame(): boolean {
  return useGameStore.getState().gameId === 'demo-game-id';
}

/** Lokalne lobby — bez API */
export function setupDemoLobby(asHost: boolean): string {
  const { user, setGameState } = useGameStore.getState();
  const code = generateDemoRoomCode();
  const hostName = user?.username ?? 'Host';
  const players = buildDemoPlayers(hostName);
  const myId = asHost ? 'demo-host' : 'demo-me';

  setGameState({
    roomCode: code,
    gameId: 'demo-game-id',
    players,
    myId,
    narratorId: 'demo-host',
    currentPhase: 'waiting',
    socketError: null,
  });

  return code;
}

/** Start demonstracyjnej rozgrywki — faza prompting, karty w ręce */
function buildDemoTable(hand: ReturnType<typeof seedDemoHand>) {
  return hand.slice(0, 4).map((c, i) => ({
    submissionId: `demo-sub-${i}`,
    cardId: c.id,
    imageUrl: c.imageUrl,
  }));
}

export function startDemoGame(phase: GamePhase = 'prompting') {
  const hand = seedDemoHand();
  const { setGameState } = useGameStore.getState();
  setGameState({
    gameId: 'demo-game-id',
    currentPhase: phase,
    myHand: hand,
    narratorPrompt: phase === 'submitting' || phase === 'voting' ? 'Kosmiczna podróż' : null,
    tableCards: phase === 'voting' || phase === 'scoring' ? buildDemoTable(hand) : [],
    socketError: null,
  });
}

/** Lokalne przejścia faz w grze demonstracyjnej (bez odpowiedzi serwera). */
export function advanceDemoAfterPrompt(_cardId: string, prompt: string) {
  const { setGameState } = useGameStore.getState();
  setGameState({
    currentPhase: 'submitting',
    narratorPrompt: prompt,
    myHand: seedDemoHand(),
    socketError: null,
  });
}

export function advanceDemoAfterCardSubmit(_cardId: string) {
  const hand = useGameStore.getState().myHand;
  const table = buildDemoTable(hand.length ? hand : seedDemoHand());
  useGameStore.getState().setGameState({
    currentPhase: 'voting',
    tableCards: table,
    socketError: null,
  });
}

export function advanceDemoAfterVote() {
  const players = useGameStore.getState().players;
  const bumped =
    players.length > 0
      ? players.map((p, i) => ({ ...p, score: p.score + (i === 0 ? 3 : 1) }))
      : [];
  useGameStore.getState().setGameState({
    currentPhase: 'scoring',
    players: bumped.length ? bumped : undefined,
    socketError: null,
  });
}
