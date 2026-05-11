import React, { useState } from 'react';
import { GameplayHeader, CardGrid, AssociationBox } from '../../components/GameplayComponents';
import { useGameStore } from '../../store/useGameStore';
import { Button } from '../../components/Button';

export function PlayerVoteView() {
  const { tableCards, narratorPrompt, timer, myId } = useGameStore();
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();

  // Docelowo serwer powie nam, która karta należy do nas, żebyśmy nie mogli na nią głosować.
  // Na razie przyjmujemy, że można kliknąć w dowolną.
  // TODO: Dodać 'mySubmittedCardId' do stora przy integracji z backendem.

  const handleVote = () => {
    if (!selectedCardId) return;
    console.log('Player voted for card:', selectedCardId);
  };

  return (
    <div className="w-full h-full flex flex-col items-center max-w-5xl mx-auto pb-8">
      <GameplayHeader 
        seconds={timer ?? 20} 
        roleText="Głosowanie" 
        instruction="Wskaż kartę, która Twoim zdaniem należy do Narratora." 
      />

      <AssociationBox text={narratorPrompt || "Brak skojarzenia"} />

      <div className="flex-1 w-full my-6">
        <CardGrid 
          cards={tableCards.map(c => ({ id: c.id, image: c.imageUrl }))} 
          onSelect={setSelectedCardId} 
          selectedId={selectedCardId} 
        />
      </div>

      <Button 
        size="lg"
        disabled={!selectedCardId}
        onClick={handleVote}
        className="px-12 py-8 rounded-2xl text-xl shadow-2xl shadow-orange-500/20 mt-8"
      >
        Oddaj głos
      </Button>
    </div>
  );
}