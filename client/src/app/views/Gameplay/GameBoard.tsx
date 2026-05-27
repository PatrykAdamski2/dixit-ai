import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { DemoModeBanner } from '../../components/DemoModeBanner';
import { isDemoGame } from '../../services/demoLobby';
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
  const { currentPhase, players, myId, narratorId, socketError } = useGameStore();
  
  const isNarrator = myId === narratorId;
  const me = players.find(p => p.id === myId);

  const errorBanner = socketError ? (
    <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-center font-bold text-red-600">{socketError}</p>
  ) : null;

  const demoBanner = isDemoGame() ? (
    <div className="w-full max-w-3xl mx-auto px-4 mb-4">
      <DemoModeBanner context="game" />
    </div>
  ) : null;

  switch (currentPhase) {
    case 'waiting':
      return (
        <div className="text-center p-20 max-w-lg mx-auto space-y-4">
          {errorBanner}
          <p className="font-bold text-2xl">Oczekiwanie na graczy…</p>
          <p className="text-gray-500 text-sm">
            Gdy backend udostępni grę, użyj panelu <strong>Dev</strong> (prawy dolny róg) i pola{' '}
            <code className="bg-gray-100 px-1 rounded">game_id</code>, aby wywołać{' '}
            <code className="bg-gray-100 px-1 rounded">connect_to_game</code>.
          </p>
        </div>
      );

    case 'prompting':
      return (
        <>
          {demoBanner}
          {errorBanner}
          {isNarrator ? <NarratorHandView /> : <NarratorTurnView />}
        </>
      );

    case 'submitting':
      return (
        <>
          {demoBanner}
          {errorBanner}
          {isNarrator ? <NarratorTurnView /> : <PlayerHandView />}
        </>
      );

    case 'voting':
      return (
        <>
          {demoBanner}
          {errorBanner}
          {isNarrator ? <NarratorTurnView /> : <PlayerVoteView />}
        </>
      );

    case 'scoring':
      return (
        <>
          {demoBanner}
          <RoundScoreView />
        </>
      );

    case 'ended':
      return <RoundEndView />;

    default:
      return <div className="text-center p-20">Nieznana faza gry.</div>;
  }
}
