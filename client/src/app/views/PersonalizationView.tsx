import React, { useEffect, useState } from 'react';
import { Coins, Sparkles, Check, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { useGameStore } from '../store/useGameStore';

interface Theme {
  id: string;
  name: string;
  price: number;
  preview: string;
  accent: string;
}

export function PersonalizationView() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string>('');
  const [ownedThemeIds, setOwnedThemeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const user = useGameStore((state) => state.user);
  const setUser = useGameStore((state) => state.setUser);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [themesRes, userRes] = await Promise.all([
          fetch('/api/personalization/themes'),
          fetch('/api/user/profile')
        ]);

        if (themesRes.ok && userRes.ok) {
          const themesData = await themesRes.json();
          const userData = await userRes.json();
          
          setThemes(themesData.themes);
          setActiveThemeId(userData.activeThemeId);
          setOwnedThemeIds(userData.ownedThemeIds);
          
          // Update store with fresh user data
          setUser({
            username: userData.username,
            coins: userData.coins,
            avatar: userData.avatar
          });
        }
      } catch (error) {
        console.error('Failed to fetch personalization data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setUser]);

  const handleBuyTheme = async (themeId: string, price: number) => {
    if (!user || user.coins < price) return;

    try {
      const response = await fetch('/api/personalization/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });

      if (response.ok) {
        const data = await response.json();
        setOwnedThemeIds([...ownedThemeIds, themeId]);
        setUser({ ...user, coins: data.newBalance });
      }
    } catch (error) {
      console.error('Failed to buy theme:', error);
    }
  };

  const handleSelectTheme = async (themeId: string) => {
    try {
      const response = await fetch('/api/personalization/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });

      if (response.ok) {
        setActiveThemeId(themeId);
      }
    } catch (error) {
      console.error('Failed to select theme:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 relative">
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Sparkles className="text-orange-500 hidden md:block" size={40} />
            Personalizacja
          </h1>
          <p className="text-gray-600 font-medium text-lg">Wybierz zestawy tematyczne kart dostepnych podczas rozgrywki</p>
        </div>
        
        <div className="bg-white/90 backdrop-blur-sm border-2 border-orange-200 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-xl shadow-orange-500/10">
          <div className="bg-orange-100 p-2 rounded-xl">
            <Coins className="text-orange-600" size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">Twoje Saldo</p>
            <p className="text-3xl font-black text-gray-900">{user?.coins ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {themes.length > 0 ? (
          themes.map((theme) => {
            const isOwned = ownedThemeIds.includes(theme.id);
            const isActive = activeThemeId === theme.id;
            const canAfford = (user?.coins ?? 0) >= theme.price;

            return (
              <div 
                key={theme.id}
                className={`bg-white rounded-[2rem] p-6 border-2 transition-all duration-300 shadow-lg ${isActive ? 'border-orange-500 shadow-orange-500/20 scale-[1.02]' : 'border-gray-100 hover:border-gray-300'}`}
              >
                <div className="w-full aspect-video rounded-2xl overflow-hidden relative mb-6 border border-gray-100 shadow-inner">
                  <div className={`absolute inset-0 ${theme.preview}`}></div>
                  
                  {/* Abstract shapes in preview */}
                  <div className="absolute top-4 left-4 w-20 h-20 bg-white/10 rounded-full blur-md"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-black/10 rotate-45"></div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900">{theme.name}</h3>
                    {!isOwned && (
                      <span className="flex items-center gap-1.5 font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-lg">
                        <Coins size={16} />
                        {theme.price}
                      </span>
                    )}
                  </div>

                  {isActive ? (
                    <Button 
                      className="w-full bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 cursor-default"
                    >
                      <Check size={20} className="mr-2" /> Aktywny
                    </Button>
                  ) : isOwned ? (
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => handleSelectTheme(theme.id)}
                    >
                      Wybierz
                    </Button>
                  ) : (
                    <Button 
                      variant={canAfford ? 'primary' : 'secondary'}
                      className={`w-full ${!canAfford ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!canAfford}
                      onClick={() => handleBuyTheme(theme.id, theme.price)}
                    >
                      {canAfford ? 'Kup Motyw' : 'Brak monet'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full text-center py-20 bg-white/50 rounded-[3rem] border-4 border-dashed border-gray-100">
             <p className="text-gray-400 font-black text-xl">Brak dostępnych motywów</p>
             <p className="text-gray-400 mt-2 font-medium">Połącz się z serwerem, aby załadować kolekcję.</p>
          </div>
        )}
      </div>
    </div>
  );
}