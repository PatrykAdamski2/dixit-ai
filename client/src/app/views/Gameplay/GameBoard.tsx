import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { NarratorHandView } from './NarratorHandView';
import { PlayerHandView } from './PlayerHandView';
import { PlayerVoteView } from './PlayerVoteView';
import { RoundScoreView } from './RoundScoreView';
import { RoundEndView } from './RoundEndView';
import { NarratorTurnView } from './NarratorTurnView'; // Used as waiting view for others

/**
 * Main GameBoard component that orchestrates the gameplay phases.
 * It reads the current phase from useGameStore and renders the appropriate view.
 */
export function GameBoard() {
  const { currentPhase, players, myId, narratorId } = useGameStore();
  
  const isNarrator = myId === narratorId;
  const me = players.find(p => p.id === myId);

  // Phase Router
  switch (currentPhase) {
    case 'waiting':
      return <div className="text-center p-20 font-bold text-2xl">Oczekiwanie na graczy...</div>;

    case 'prompting':
      return isNarrator ? <NarratorHandView /> : <NarratorTurnView />;

    case 'submitting':
      return isNarrator ? <NarratorTurnView /> : <PlayerHandView />;

    case 'voting':
      // Everyone except narrator votes
      return isNarrator ? <NarratorTurnView /> : <PlayerVoteView />;

    case 'scoring':
      return <RoundScoreView />;

    case 'ended':
      return <RoundEndView />;

    default:
      return <div className="text-center p-20">Nieznana faza gry.</div>;
  }
}
