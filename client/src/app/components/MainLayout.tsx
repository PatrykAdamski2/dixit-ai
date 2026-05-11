import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { PlayfulBackground } from './PlayfulBackground';
import { Button } from './Button';
import { ArrowLeft } from 'lucide-react';

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isAuth = location.pathname === '/';

  const showBackButton = !isAuth;

  return (
    <div className="relative min-h-screen font-sans text-gray-900 flex flex-col items-center justify-center p-4">
      <PlayfulBackground />

      {showBackButton && (
        <div className="fixed top-6 left-6 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex gap-2 items-center bg-white/80 backdrop-blur-sm border-gray-300 hover:border-gray-500 rounded-full pr-5 pl-4 py-2"
          >
            <ArrowLeft size={18} />
            Wróć
          </Button>
        </div>
      )}

      {/* Main content container with some entrance animation */}
      <main className="z-10 w-full max-w-5xl animate-[fade-in_0.3s_ease-out_forwards] mx-auto flex items-center justify-center min-h-[80vh]">
        <Outlet />
      </main>
    </div>
  );
}