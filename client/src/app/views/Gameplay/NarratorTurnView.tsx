import React from 'react';
import { GameplayHeader } from '../../components/GameplayComponents';
import { GameCard } from '../../components/GameCard';
import { useGameStore } from '../../store/useGameStore';

export function NarratorTurnView() {
  const { timer, players, narratorId, narratorPrompt, currentPhase } = useGameStore();
  const narrator = players.find((p) => p.id === narratorId);

  const phaseHint =
    currentPhase === 'prompting'
      ? 'wybiera kartę i wpisuje skojarzenie'
      : currentPhase === 'submitting'
        ? 'czeka na karty pozostałych graczy'
        : currentPhase === 'voting'
          ? 'obserwuje głosowanie (narrator nie głosuje)'
          : 'przygotowuje rundę';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center max-w-3xl mx-auto min-h-[55vh] px-4">
      <GameplayHeader
        seconds={timer ?? 40}
        roleText="Oczekiwanie"
        instruction={
          <>
            Narrator <strong className="text-gray-800">{narrator?.username || 'Gracz'}</strong>{' '}
            {phaseHint}.
          </>
        }
      />

      {narratorPrompt && currentPhase !== 'prompting' && (
        <p className="mt-6 text-center text-lg font-bold text-orange-700 bg-orange-50 px-6 py-3 rounded-2xl border border-orange-100">
          Skojarzenie: „{narratorPrompt}”
        </p>
      )}

      <div className="mt-10 flex items-end gap-2">
        <GameCard isBack size="sm" className="opacity-90 -rotate-6" />
        <GameCard isBack size="md" className="opacity-95" />
        <GameCard isBack size="sm" className="opacity-90 rotate-6" />
      </div>

      <div className="mt-10 flex space-x-2 justify-center">
        <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" />
      </div>
    </div>
  );
}
