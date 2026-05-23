import React, { useState } from 'react';
import { GameplayHeader, CardGrid, AssociationBox } from '../../components/GameplayComponents';
import { useGameStore } from '../../store/useGameStore';
import { Button } from '../../components/Button';

export function PlayerHandView() {
  const { myHand, narratorPrompt, timer } = useGameStore();
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();

  const handleConfirm = () => {
    if (!selectedCardId) return;
    console.log('Player submitted card:', selectedCardId);
  };

  return (
    <div className="w-full h-full flex flex-col items-center max-w-5xl mx-auto pb-8">
      <GameplayHeader 
        seconds={timer ?? 30} 
        roleText="Twój Ruch" 
        instruction="Wybierz kartę, która najlepiej pasuje do skojarzenia Narratora." 
      />

      <AssociationBox text={narratorPrompt || "Brak skojarzenia"} />

      <div className="mt-4 mb-2 w-full flex-1">
        <CardGrid 
          cards={myHand.map(c => ({ id: c.id, image: c.imageUrl }))} 
          onSelect={setSelectedCardId} 
          selectedId={selectedCardId} 
        />
      </div>

      <Button 
        size="lg"
        disabled={!selectedCardId}
        onClick={handleConfirm}
        className="px-12 py-8 rounded-2xl text-xl shadow-2xl shadow-orange-500/20 mt-8"
      >
        Zatwierdź kartę
      </Button>
    </div>
  );
}