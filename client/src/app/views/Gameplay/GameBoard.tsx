import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { NarratorHandView } from './NarratorHandView';
import { PlayerHandView } from './PlayerHandView';
import { PlayerVoteView } from './PlayerVoteView';
import { RoundScoreView } from './RoundScoreView';
import { RoundEndView } from './RoundEndView';
import { NarratorTurnView } from './NarratorTurnView'; // Used as waiting view for others

/**
 * Główny komponent planszy gry, który zarządza widokami w zależności od fazy.
 * Pobiera aktualną fazę ze stora i renderuje odpowiedni widok dla gracza lub narratora.
 */
export function GameBoard() {
  const { currentPhase, players, myId, narratorId } = useGameStore();
  
  const isNarrator = myId === narratorId;
  const me = players.find(p => p.id === myId);

  // Przełącznik widoków w zależności od etapu rozgrywki
  switch (currentPhase) {
    case 'waiting':
      return <div className="text-center p-20 font-bold text-2xl">Oczekiwanie na graczy...</div>;

    case 'prompting':
      return isNarrator ? <NarratorHandView /> : <NarratorTurnView />;

    case 'submitting':
      return isNarrator ? <NarratorTurnView /> : <PlayerHandView />;

    case 'voting':
      // Głosują wszyscy poza narratorem
      return isNarrator ? <NarratorTurnView /> : <PlayerVoteView />;

    case 'scoring':
      return <RoundScoreView />;

    case 'ended':
      return <RoundEndView />;

    default:
      return <div className="text-center p-20">Nieznana faza gry.</div>;
  }
}
