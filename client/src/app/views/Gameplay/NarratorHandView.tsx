import React, { useState } from 'react';
import { GameplayHeader, CardGrid } from '../../components/GameplayComponents';
import { useGameStore } from '../../store/useGameStore';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { emitSubmitPrompt } from '../../services/gameSocket';
import { isDemoGame, advanceDemoAfterPrompt } from '../../services/demoLobby';

export function NarratorHandView() {
  const { myHand, timer, socketError } = useGameStore();
  const [selectedCard, setSelectedCard] = useState<string | undefined>();
  const [association, setAssociation] = useState('');

  const wordCount = association.trim() ? association.trim().split(/\s+/).length : 0;
  const isTooLong = wordCount > 8;

  const handleConfirm = () => {
    if (!selectedCard || !association || isTooLong) return;
    const prompt = association.trim();
    if (isDemoGame()) {
      advanceDemoAfterPrompt(selectedCard, prompt);
      return;
    }
    emitSubmitPrompt(selectedCard, prompt);
  };

  return (
    <div className="w-full h-full flex flex-col items-center max-w-5xl mx-auto pb-6 px-2 md:pb-8">
      {socketError && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-center font-bold text-red-600">{socketError}</p>
      )}
      <GameplayHeader
        seconds={timer ?? 40}
        roleText="Jesteś Narratorem"
        instruction="Wybierz 1 kartę i wpisz skojarzenie (maks. 8 słów). W demo przejdziesz do fazy graczy."
      />

      <div className="w-full max-w-xl mx-auto my-6 md:my-8 px-2 space-y-4">
        <div className="relative">
          <Input
            value={association}
            onChange={(e) => setAssociation(e.target.value)}
            maxLength={100}
            placeholder="np. Kosmiczna podróż w nieznane"
            className={`text-center text-xl font-bold h-16 shadow-xl border-2 transition-colors ${
              isTooLong ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-orange-500'
            }`}
          />
          <div
            className={`absolute right-4 top-1/2 -translate-y-1/2 font-black ${
              isTooLong ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {wordCount}/8 słów
          </div>
        </div>

        {isTooLong && (
          <p className="text-red-500 text-center font-bold animate-bounce">
            Skojarzenie może mieć maksymalnie 8 słów!
          </p>
        )}
      </div>

      <CardGrid
        cards={myHand.length > 0 ? myHand.map((c) => ({ id: c.id, image: c.imageUrl })) : []}
        onSelect={setSelectedCard}
        selectedId={selectedCard}
        variant="hand"
      />

      <Button
        size="lg"
        disabled={!selectedCard || !association || isTooLong}
        onClick={handleConfirm}
        className="px-12 py-6 md:py-8 rounded-2xl text-xl shadow-2xl shadow-orange-500/20"
      >
        Zatwierdź skojarzenie
      </Button>
    </div>
  );
}
