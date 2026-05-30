import React, { useState } from 'react';
import { GameplayHeader, CardGrid, AssociationBox } from '../../components/GameplayComponents';
import { useGameStore } from '../../store/useGameStore';
import { Button } from '../../components/Button';
import { emitSubmitVote } from '../../services/gameSocket';

export function PlayerVoteView() {
  const { tableCards, narratorPrompt, timer, myId } = useGameStore();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | undefined>();
  const [hasVoted, setHasVoted] = useState(false);
  const [ownCardError, setOwnCardError] = useState(false);

  const mySubmissionId = tableCards.find(c => c.playerId && myId && String(c.playerId) === String(myId))?.submissionId;

  const handleSelect = (id: string) => {
    if (id === mySubmissionId) {
      setOwnCardError(true);
      setTimeout(() => setOwnCardError(false), 2000);
      return;
    }
    setOwnCardError(false);
    setSelectedSubmissionId(id);
  };

  const handleVote = () => {
    if (!selectedSubmissionId || hasVoted) return;
    emitSubmitVote(selectedSubmissionId);
    setHasVoted(true);
  };

  return (
    <div className="w-full h-full flex flex-col items-center max-w-5xl mx-auto pb-6 px-2 md:pb-8">
      {ownCardError && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-center font-bold text-amber-700">
          Nie możesz głosować na własną kartę!
        </p>
      )}
      <GameplayHeader
        seconds={timer ?? 20}
        roleText="Głosowanie"
        instruction="Odgadnij kartę narratora — po oddaniu głosu nie możesz go zmienić."
      />

      <AssociationBox text={narratorPrompt || 'Brak skojarzenia'} />

      <div className="flex-1 w-full my-4 md:my-6">
        <CardGrid
          cards={tableCards.map((c) => ({
            id: c.submissionId,
            image: c.imageUrl,
            disabled: c.submissionId === mySubmissionId,
          }))}
          onSelect={hasVoted ? undefined : handleSelect}
          selectedId={selectedSubmissionId}
          disabled={hasVoted}
          variant="table"
        />
      </div>

      <Button
        size="lg"
        disabled={!selectedSubmissionId || hasVoted}
        onClick={handleVote}
        className="px-12 py-6 md:py-8 rounded-2xl text-xl shadow-2xl shadow-orange-500/20 mt-4"
      >
        {hasVoted ? 'Głos oddany' : 'Oddaj głos'}
      </Button>
    </div>
  );
}
