import React, { useState } from 'react';
import { DoorOpen, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useGameStore } from '../store/useGameStore';

export function JoinLobbyView() {
  const { players: storePlayers, roomCode: storeRoomCode, myId } = useGameStore();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === 6) {
      setIsJoining(true);
      // Backend integration will happen in future tasks
    }
  };

  const hasJoined = !!storeRoomCode || isJoining;

  // Visual demo data if store is empty
  const displayPlayers = storePlayers.length > 0 ? storePlayers : [
    { id: '1', username: 'HostPlayer', isNarrator: false, isConnected: true, isBot: false, score: 0 },
    { id: 'me', username: 'Twoja Nazwa', isNarrator: false, isConnected: true, isBot: false, score: 0 },
    { id: 'bot1', username: 'DixitBot_1', isNarrator: false, isConnected: true, isBot: true, score: 0 },
  ];

  if (hasJoined) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 relative">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 md:p-12 space-y-8 transform transition-all duration-300">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-6">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight text-center">
              Poczekalnia: <span className="text-orange-600">{storeRoomCode || code}</span>
            </h1>
            <p className="text-gray-500 font-medium text-lg">
              Oczekiwanie na rozpoczęcie gry przez Hosta...
            </p>
          </div>

          <div className="space-y-4 mt-8">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <img src="/Ikony/PlayerIcon.svg" className="w-5 h-5 opacity-40" alt="" /> Dołączyli Gracze
            </h3>
            <div className="bg-white border border-gray-100 shadow-inner rounded-2xl p-2 space-y-2">
              {displayPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center p-1.5 overflow-hidden ${
                      player.isBot ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      <img 
                        src="/Ikony/PlayerIcon.svg" 
                        className={`w-full h-full ${player.isBot ? 'hue-rotate-[240deg] saturate-200' : ''}`} 
                        alt="" 
                      />
                    </div>
                    <span className="font-bold text-gray-900">{player.username}</span>
                    {player.isBot && (
                      <span className="text-[10px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-tighter">
                        AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md uppercase">
                        Host
                      </span>
                    )}
                    {(player.id === myId || player.id === 'me') && (
                      <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-1 rounded-md uppercase tracking-wider">
                        Ty
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 relative">
      <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] shadow-2xl p-8 md:p-12 text-center space-y-10 transform transition-all duration-300">
        
        <div className="mx-auto w-24 h-24 bg-gray-900 rounded-[2rem] flex items-center justify-center text-orange-400 mb-6 rotate-[12deg] shadow-2xl shadow-gray-900/30">
          <DoorOpen size={48} className="-ml-1" />
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            Dołącz do gry
          </h1>
          <p className="text-gray-500 font-medium text-lg">
            Wprowadź 6-znakowy kod od znajomego, aby dołączyć do rozgrywki.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <Input 
              autoFocus
              maxLength={6}
              placeholder="np. A9X2FB" 
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="h-20 text-center text-4xl font-black tracking-[0.5em] uppercase placeholder:text-gray-300 placeholder:font-black rounded-2xl border-2 shadow-inner"
            />
          </div>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full flex items-center justify-center gap-4 h-16 rounded-2xl text-xl shadow-xl shadow-orange-500/20"
            disabled={code.length < 6}
          >
            Dołącz do gry <img src="/Ikony/NextIcon.svg" className="w-8 h-8 invert brightness-0" alt="" />
          </Button>
        </form>

      </div>
    </div>
  );
}
