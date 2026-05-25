import React from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Swords, Users, BarChart3, Palette, LogOut, Sparkles } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { setupDemoLobby, startDemoGame } from '../services/demoLobby';
import { logoutSession } from '../services/session';

export function MainMenuView() {
  const navigate = useNavigate();
  const user = useGameStore((state) => state.user);

  const handleDemoGame = () => {
    setupDemoLobby(true);
    startDemoGame('prompting');
    navigate('/game');
  };

  const handleLogout = async () => {
    await logoutSession();
    navigate('/');
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-2xl p-10 flex flex-col items-center gap-10">
        
        <div className="text-center space-y-2">
          <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-600 rounded-full font-bold text-sm mb-4">
            Witaj z powrotem, {user?.username || 'Graczu'}!
          </div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight drop-shadow-sm">
            Dixit AI
          </h1>
          <p className="text-gray-500 font-medium text-lg">Wybierz swój następny ruch</p>
        </div>

        <div className="w-full flex flex-col gap-4">
          <Button 
            size="lg" 
            className="w-full flex items-center justify-between group px-8 py-8 rounded-2xl bg-orange-500 hover:bg-orange-600 border-none shadow-orange-500/30 shadow-xl"
            onClick={() => navigate('/host')}
          >
            <span className="flex items-center gap-4 text-2xl">
              <Swords className="group-hover:rotate-12 transition-transform" size={28} />
              Stwórz nową grę
            </span>
            <img src="/Ikony/NextIcon.svg" className="w-8 h-8 group-hover:translate-x-1 transition-transform" alt="" />
          </Button>

          <Button 
            size="lg" 
            variant="secondary"
            className="w-full flex items-center justify-between group px-8 py-8 rounded-2xl bg-gray-900 hover:bg-black border-none shadow-gray-900/20 shadow-xl"
            onClick={() => navigate('/join')}
          >
            <span className="flex items-center gap-4 text-xl">
              <img src="/Ikony/PlayerIcon.svg" className="w-7 h-7 group-hover:scale-110 transition-transform opacity-80" alt="" />
              Dołącz do lobby
            </span>
            <img src="/Ikony/NextIcon.svg" className="w-8 h-8 group-hover:translate-x-1 transition-transform opacity-50" alt="" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="w-full flex items-center justify-center gap-3 py-6 rounded-2xl border-dashed border-orange-300 bg-orange-50/50 hover:bg-orange-50"
            onClick={handleDemoGame}
          >
            <Sparkles size={22} className="text-orange-500" />
            <span className="font-bold text-orange-700">Gra demonstracyjna (bez API)</span>
          </Button>

          <div className="grid grid-cols-2 gap-4 mt-2">
            <Button
              size="lg"
              variant="outline"
              className="relative flex flex-col items-center gap-2 h-auto py-6 bg-white/80 border-gray-200 hover:border-orange-200"
              onClick={() => navigate('/stats')}
            >
              <BarChart3 size={24} className="text-gray-700" />
              <span className="text-gray-800">Statystyki</span>
              <span className="absolute -top-2 -right-2 text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                Podgląd
              </span>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="relative flex flex-col items-center gap-2 h-auto py-6 bg-white/80 border-gray-200 hover:border-orange-200"
              onClick={() => navigate('/personalization')}
            >
              <Palette size={24} className="text-orange-500" />
              <span className="text-gray-800">Personalizacja</span>
              <span className="absolute -top-2 -right-2 text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                Podgląd
              </span>
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-gray-500 hover:text-gray-900 gap-2"
        >
          <LogOut size={18} />
          Wyloguj się
        </Button>

      </div>
    </div>
  );
}
