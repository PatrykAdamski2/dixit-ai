import React from 'react';
import { GameplayHeader, CardGrid, AssociationBox } from '../../components/GameplayComponents';
import { useGameStore } from '../../store/useGameStore';

/** Narrator nie głosuje — podgląd kart na stole (awersy po złożeniu). */
export function NarratorVoteView() {
  const { tableCards, narratorPrompt, timer } = useGameStore();
  const cards =
    tableCards.length > 0
      ? tableCards.map((c) => ({ id: c.submissionId, image: c.imageUrl }))
      : ['1', '2', '3', '4'].map((id) => ({ id: `placeholder-${id}` }));

  return (
    <div className="w-full h-full flex flex-col items-center max-w-5xl mx-auto pb-8 px-2">
      <GameplayHeader
        seconds={timer ?? 20}
        roleText="Stół w rundzie"
        instruction="Karty graczy na stole — w Dixit narrator nie oddaje głosu."
      />

      <div className="flex-1 w-full my-6">
        <CardGrid cards={cards} variant="table" faceDown={tableCards.length === 0} />
      </div>

      <AssociationBox text={narratorPrompt || 'Kosmiczna odyseja'} />
    </div>
  );
}
