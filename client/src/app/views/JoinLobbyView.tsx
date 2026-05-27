import React, { useState } from 'react';
import { DoorOpen, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useGameStore } from '../store/useGameStore';
import { ApiPendingBanner } from '../components/ApiPendingBanner';
import { DemoModeBanner } from '../components/DemoModeBanner';
import { LobbyPlayerList } from '../components/LobbyPlayerList';
import { joinLobby } from '../services/lobbyApi';

export function JoinLobbyView() {
  const { players: storePlayers, roomCode: storeRoomCode, myId } = useGameStore();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinedAsDemo, setJoinedAsDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setIsJoining(true);
    const result = await joinLobby(code);
    setJoinedAsDemo(result.source === 'demo');
    setIsJoining(false);
  };

  const hasJoined = !!storeRoomCode;

  if (hasJoined) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 relative">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 md:p-12 space-y-8">
          <ApiPendingBanner feature="Synchronizacja listy graczy w lobby" />
          {joinedAsDemo && <DemoModeBanner context="lobby" />}
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-6">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight text-center">
              Poczekalnia: <span className="text-orange-600">{storeRoomCode}</span>
            </h1>
            <p className="text-gray-500 font-medium text-lg">
              Oczekiwanie na rozpoczęcie gry przez Hosta…
            </p>
            <p className="text-xs text-gray-400 font-medium">
              Socket: <code className="bg-gray-100 px-1 rounded">join_room</code> wysłany — lista z{' '}
              <code className="bg-gray-100 px-1 rounded">lobbyUpdate</code> po stronie serwera.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <img src="/Ikony/PlayerIcon.svg" className="w-5 h-5 opacity-40" alt="" /> Dołączyli Gracze
            </h3>
            {storePlayers.length === 0 ? (
              <LobbyPlayerList players={[]} maxPlayers={8} loading loadingCount={3} />
            ) : (
              <LobbyPlayerList players={storePlayers} maxPlayers={8} myId={myId} />
            )}
            {storePlayers.length === 0 && (
              <p className="text-center text-sm text-gray-500 font-medium">
                Brak danych o graczach — pojawią się po API lub evencie lobbyUpdate.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 relative">
      <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 md:p-12 text-center space-y-10">
        <ApiPendingBanner feature="Dołączanie do pokoju (POST /api/lobby/join)" />

        <div className="mx-auto w-24 h-24 bg-gray-900 rounded-[2rem] flex items-center justify-center text-orange-400 mb-6 rotate-[12deg] shadow-2xl shadow-gray-900/30">
          <DoorOpen size={48} className="-ml-1" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Dołącz do gry</h1>
          <p className="text-gray-500 font-medium text-lg">
            Wprowadź 6-znakowy kod od znajomego, aby dołączyć do rozgrywki.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            autoFocus
            maxLength={6}
            placeholder="np. A9X2FB"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="h-20 text-center text-4xl font-black tracking-[0.5em] uppercase placeholder:text-gray-300 placeholder:font-black rounded-2xl border-2 shadow-inner"
          />

          <Button
            type="submit"
            size="lg"
            className="w-full flex items-center justify-center gap-4 h-16 rounded-2xl text-xl shadow-xl shadow-orange-500/20"
            disabled={code.length < 6 || isJoining}
          >
            {isJoining ? 'Dołączanie…' : 'Dołącz do gry'}{' '}
            <img src="/Ikony/NextIcon.svg" className="w-8 h-8 invert brightness-0" alt="" />
          </Button>
        </form>
      </div>
    </div>
  );
}
