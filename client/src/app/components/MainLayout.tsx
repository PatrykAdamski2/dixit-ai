import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { PlayfulBackground } from './PlayfulBackground';
import { Button } from './Button';
import { ArrowLeft, LogOut } from 'lucide-react';
import { GameNavigationBridge } from './GameNavigationBridge';
import { Toaster } from './ui/sonner';
import { emitDisconnectFromGame } from '../services/gameSocket';
import { socket } from '../services/socket';
import { useGameStore } from '../store/useGameStore';

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isAuth = location.pathname === '/';
  const isMenu = location.pathname === '/menu';
  const isGame = location.pathname === '/game';

  const showBackButton = !isAuth && !isMenu;

  const handleBack = () => {
    if (isGame) {
      emitDisconnectFromGame();
      if (socket.connected) socket.disconnect();
      useGameStore.getState().resetGame();
      navigate('/menu');
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="relative min-h-screen font-sans text-gray-900 flex flex-col items-center justify-center p-4">
      <GameNavigationBridge />
      <PlayfulBackground />

      {showBackButton && (
        <div className="fixed top-6 left-6 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="flex gap-2 items-center bg-white/80 backdrop-blur-sm border-gray-300 hover:border-gray-500 rounded-full pr-5 pl-4 py-2"
          >
            {isGame ? <LogOut size={18} /> : <ArrowLeft size={18} />}
            {isGame ? 'Zakończ grę' : 'Wróć'}
          </Button>
        </div>
      )}

      {/* Główny kontener na widoki z prostą animacją wejścia */}
      <main className="z-10 w-full max-w-5xl animate-[fade-in_0.3s_ease-out_forwards] mx-auto flex items-center justify-center min-h-[80vh]">
        <Outlet />
      </main>
      <Toaster richColors position="top-center" closeButton />
    </div>
  );
}