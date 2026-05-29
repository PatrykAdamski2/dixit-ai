import React, { useState } from 'react';
import { GameplayHeader, CardGrid, AssociationBox } from '../../components/GameplayComponents';
import { useGameStore } from '../../store/useGameStore';
import { Button } from '../../components/Button';
import { emitSubmitCard } from '../../services/gameSocket';

export function PlayerHandView() {
  const { myHand, narratorPrompt, timer, socketError } = useGameStore();
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const handleConfirm = () => {
    if (!selectedCardId || submitted) return;
    emitSubmitCard(selectedCardId);
    setSubmitted(true);
  };

  return (
    <div className="w-full h-full flex flex-col items-center max-w-5xl mx-auto pb-6 px-2 md:pb-8">
      {socketError && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-center font-bold text-red-600">{socketError}</p>
      )}
      <GameplayHeader
        seconds={timer ?? 30}
        roleText="Twój Ruch"
        instruction="Wybierz kartę pasującą do skojarzenia Narratora."
      />

      <AssociationBox text={narratorPrompt || 'Brak skojarzenia'} />

      <CardGrid
        cards={myHand.map((c) => ({ id: c.id, image: c.imageUrl }))}
        onSelect={submitted ? undefined : setSelectedCardId}
        selectedId={selectedCardId}
        disabled={submitted}
        variant="hand"
      />

      <Button
        size="lg"
        disabled={!selectedCardId || submitted}
        onClick={handleConfirm}
        className="px-12 py-6 md:py-8 rounded-2xl text-xl shadow-2xl shadow-orange-500/20 mt-4"
      >
        {submitted ? 'Karta wysłana' : 'Zatwierdź kartę'}
      </Button>
    </div>
  );
}
