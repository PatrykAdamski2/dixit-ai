import { GamePhase } from '../store/useGameStore';

const GAME_PHASES: GamePhase[] = ['prompting', 'submitting', 'voting', 'scoring', 'ended'];

let navigateFn: ((path: string) => void) | null = null;

export function registerGameNavigator(fn: ((path: string) => void) | null) {
  navigateFn = fn;
}

export function shouldNavigateToGame(phase?: GamePhase): boolean {
  return !!phase && GAME_PHASES.includes(phase);
}

export function navigateToGameIfNeeded(phase?: GamePhase) {
  if (!shouldNavigateToGame(phase) || !navigateFn) return;
  if (window.location.pathname !== '/game') {
    navigateFn('/game');
  }
}
