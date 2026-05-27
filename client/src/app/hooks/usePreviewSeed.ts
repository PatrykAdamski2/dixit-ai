import { useEffect } from 'react';
import { useGameStore, GamePhase } from '../store/useGameStore';
import { seedDemoHand } from '../services/demoLobby';
import { sliceLocalHand } from '../data/mockCards';

export type PreviewScenario =
  | 'narrator-hand'
  | 'narrator-turn'
  | 'player-hand'
  | 'player-turn'
  | 'player-vote'
  | 'narrator-vote'
  | 'round-score'
  | 'round-end';

const SCENARIO_PHASE: Record<PreviewScenario, GamePhase> = {
  'narrator-hand': 'prompting',
  'narrator-turn': 'prompting',
  'player-hand': 'submitting',
  'player-turn': 'submitting',
  'player-vote': 'voting',
  'narrator-vote': 'voting',
  'round-score': 'scoring',
  'round-end': 'ended',
};

export function usePreviewSeed(scenario: PreviewScenario) {
  useEffect(() => {
    const hand = seedDemoHand();
    const players = [
      { id: 'p1', username: 'Anna', score: 24, isNarrator: true, isConnected: true, isBot: false },
      { id: 'p2', username: 'Ty', score: 18, isNarrator: false, isConnected: true, isBot: false },
      { id: 'p3', username: 'BotAI', score: 12, isNarrator: false, isConnected: true, isBot: true },
    ];
    const phase = SCENARIO_PHASE[scenario];
    const tableCards = hand.slice(0, 4).map((c, i) => ({
      submissionId: `preview-sub-${i}`,
      cardId: c.id,
      imageUrl: c.imageUrl,
    }));

    const asNarrator =
      scenario === 'narrator-hand' || scenario === 'narrator-turn' || scenario === 'narrator-vote';

    useGameStore.getState().setGameState({
      gameId: 'demo-game-id',
      currentPhase: phase,
      myId: asNarrator ? 'p1' : 'p2',
      narratorId: 'p1',
      myHand: hand,
      narratorPrompt: 'Kosmiczna podróż w nieznane',
      tableCards: phase === 'voting' || phase === 'scoring' ? tableCards : [],
      players,
      timer: phase === 'prompting' ? 40 : phase === 'submitting' ? 30 : 20,
      socketError: null,
    });
  }, [scenario]);
}

/** Statyczne karty tylko do NarratorVoteView (fallback) */
export function getPreviewStaticCards() {
  return sliceLocalHand(4).map((c) => ({ id: c.id, image: c.imageUrl }));
}
