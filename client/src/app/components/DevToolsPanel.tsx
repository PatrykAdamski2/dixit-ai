import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useGameStore, GamePhase } from '../store/useGameStore';
import { emitConnectToGame } from '../services/gameSocket';
import { sliceLocalHand } from '../data/mockCards';
import { startDemoGame } from '../services/demoLobby';

const PHASES: GamePhase[] = ['waiting', 'prompting', 'submitting', 'voting', 'scoring', 'ended'];

/** Docelowe trasy podglądu dla każdej fazy (przyciski Dev przełączają widok). */
const PHASE_ROUTES: Record<GamePhase, string> = {
  waiting: '/game',
  prompting: '/preview/narrator-hand',
  submitting: '/preview/player-hand',
  voting: '/preview/player-vote',
  scoring: '/preview/round-score',
  ended: '/preview/round-end',
};

/** Panel tylko w dev — test faz i podglądów bez pełnego lobby. */
export function DevToolsPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [gameIdInput, setGameIdInput] = useState('');
  const { currentPhase, user } = useGameStore();

  if (!import.meta.env.DEV) {
    return null;
  }

  const goToPhase = (phase: GamePhase) => {
    if (phase === 'waiting') {
      startDemoGame('waiting');
    } else if (phase === 'prompting') {
      startDemoGame('prompting');
    } else {
      useGameStore.getState().setGameState({
        gameId: 'demo-game-id',
        currentPhase: phase,
        myHand: sliceLocalHand(6),
        myId: phase === 'submitting' || phase === 'voting' ? 'p2' : 'p1',
        narratorId: 'p1',
        narratorPrompt: 'Kosmiczna podróż',
        tableCards: sliceLocalHand(4).map((c, i) => ({
          submissionId: `sub-${i}`,
          cardId: c.id,
          imageUrl: c.imageUrl,
        })),
        players: [
          { id: 'p1', username: 'Anna', score: 24, isNarrator: true, isConnected: true, isBot: false },
          { id: 'p2', username: 'Ty', score: 18, isNarrator: false, isConnected: true, isBot: false },
          { id: 'p3', username: 'BotAI', score: 12, isNarrator: false, isConnected: true, isBot: true },
        ],
        socketError: null,
      });
    }
    navigate(PHASE_ROUTES[phase]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] font-mono text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-gray-900 px-4 py-2 font-bold text-white shadow-lg"
      >
        Dev {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl space-y-3">
          <p className="text-gray-500">Zalogowany: {user?.username ?? '—'}</p>
          <p className="text-gray-700">Faza: <strong>{currentPhase}</strong></p>
          <div className="flex flex-wrap gap-1">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                className="rounded bg-gray-100 px-2 py-1 hover:bg-orange-100"
                onClick={() => goToPhase(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="space-y-1 border-t pt-2">
            <label className="text-gray-500">game_id (socket)</label>
            <input
              className="w-full rounded border px-2 py-1"
              value={gameIdInput}
              onChange={(e) => setGameIdInput(e.target.value)}
              placeholder="UUID gry z bazy"
            />
            <button
              type="button"
              className="w-full rounded bg-orange-500 py-1 text-white"
              onClick={() => gameIdInput && emitConnectToGame(gameIdInput)}
            >
              connect_to_game
            </button>
          </div>
          <div className="border-t pt-2 space-y-1">
            <Link to="/game" className="block text-orange-600 hover:underline">
              /game (GameBoard)
            </Link>
            <Link to="/preview/narrator-hand" className="block text-orange-600 hover:underline">
              /preview/narrator-hand
            </Link>
            <Link to="/preview/player-hand" className="block text-orange-600 hover:underline">
              /preview/player-hand
            </Link>
            <Link to="/preview/player-vote" className="block text-orange-600 hover:underline">
              /preview/player-vote
            </Link>
            <Link to="/preview/round-score" className="block text-orange-600 hover:underline">
              /preview/round-score
            </Link>
            <Link to="/preview/round-end" className="block text-orange-600 hover:underline">
              /preview/round-end
            </Link>
            <Link to="/stats" className="block text-orange-600 hover:underline">
              /stats
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
