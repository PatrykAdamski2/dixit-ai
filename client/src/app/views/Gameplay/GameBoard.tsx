import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { NarratorHandView } from './NarratorHandView';
import { PlayerHandView } from './PlayerHandView';
import { PlayerVoteView } from './PlayerVoteView';
import { RoundScoreView } from './RoundScoreView';
import { RoundEndView } from './RoundEndView';
import { NarratorTurnView } from './NarratorTurnView';
import { emitConnectToGame } from '../../services/gameSocket';

/**
 * Główny komponent planszy gry, który zarządza widokami w zależności od fazy.
 * Pobiera aktualną fazę ze stora i renderuje odpowiedni widok dla gracza lub narratora.
 */
export function GameBoard() {
  const { currentPhase, players, myId, narratorId, socketError, gameId } = useGameStore();
  
  const isNarrator = myId === narratorId;
  const me = players.find(p => p.id === myId);

  const errorBanner = socketError ? (
    <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-center font-bold text-red-600">{socketError}</p>
  ) : null;

  React.useEffect(() => {
    if (gameId) {
      emitConnectToGame(gameId);
    }
  }, [gameId]);

  switch (currentPhase) {
    case 'waiting':
      return (
        <div className="text-center p-20 max-w-lg mx-auto space-y-4">
          {errorBanner}
          <p className="font-bold text-2xl">Łączenie z grą…</p>
        </div>
      );

    case 'prompting':
      return (
        <>
          {errorBanner}
          {isNarrator ? <NarratorHandView /> : <NarratorTurnView />}
        </>
      );

    case 'submitting':
      return (
        <>
          {errorBanner}
          {isNarrator ? <NarratorTurnView /> : <PlayerHandView />}
        </>
      );

    case 'voting':
      return (
        <>
          {errorBanner}
          {isNarrator ? <NarratorTurnView /> : <PlayerVoteView />}
        </>
      );

    case 'scoring':
      return (
        <>
          <RoundScoreView />
        </>
      );

    case 'ended':
      return <RoundEndView />;

    default:
      return <div className="text-center p-20">Nieznana faza gry.</div>;
  }
}
