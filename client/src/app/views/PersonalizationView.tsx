import React, { useEffect, useState } from 'react';
import { Coins, Sparkles, Check } from 'lucide-react';
import { Button } from '../components/Button';
import { useGameStore } from '../store/useGameStore';
import { ViewPageShell } from '../components/ViewPageShell';
import { Skeleton } from '../components/ui/skeleton';
import { fetchOptional } from '../services/api';
import { MOCK_THEMES } from '../data/mockPersonalization';

interface Theme {
  id: string;
  name: string;
  price: number;
  preview: string;
  accent: string;
}

export function PersonalizationView() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState('classic');
  const [ownedThemeIds, setOwnedThemeIds] = useState<string[]>(['classic']);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  const user = useGameStore((state) => state.user);
  const setUser = useGameStore((state) => state.setUser);

  useEffect(() => {
    const fetchData = async () => {
      const [themesData, profileData] = await Promise.all([
        fetchOptional<{ themes: Theme[] }>('/api/personalization/themes'),
        fetchOptional<{
          username: string;
          coins: number;
          avatar?: string;
          activeThemeId: string;
          ownedThemeIds: string[];
        }>('/api/user/profile'),
      ]);

      if (themesData?.themes?.length) {
        setThemes(themesData.themes);
      } else {
        setThemes(MOCK_THEMES);
        setUsingMock(true);
      }

      if (profileData) {
        setActiveThemeId(profileData.activeThemeId);
        setOwnedThemeIds(profileData.ownedThemeIds ?? []);
        setUser({
          username: profileData.username,
          coins: profileData.coins,
          avatar: profileData.avatar,
        });
      } else if (user) {
        setUser({ ...user, coins: user.coins || 250 });
      } else {
        setUser({ username: 'Gracz', coins: 250, avatar: 'GR' });
        setUsingMock(true);
      }
      setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jednorazowy load + mock
  }, [setUser]);

  const handleBuyTheme = async (themeId: string, price: number) => {
    if (!user || user.coins < price) return;
    try {
      const response = await fetch('/api/personalization/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ themeId }),
      });
      if (response.ok) {
        const data = await response.json();
        setOwnedThemeIds([...ownedThemeIds, themeId]);
        setUser({ ...user, coins: data.newBalance });
        return;
      }
    } catch {
      /* demo */
    }
    if (usingMock && user.coins >= price) {
      setOwnedThemeIds([...ownedThemeIds, themeId]);
      setUser({ ...user, coins: user.coins - price });
    }
  };

  const handleSelectTheme = async (themeId: string) => {
    try {
      const response = await fetch('/api/personalization/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ themeId }),
      });
      if (response.ok) {
        setActiveThemeId(themeId);
        return;
      }
    } catch {
      /* demo */
    }
    if (ownedThemeIds.includes(themeId)) {
      setActiveThemeId(themeId);
    }
  };

  return (
    <ViewPageShell
      maxWidth="lg"
      apiFeature="Personalizacja (motywy kart, sklep)"
      icon={<Sparkles className="text-orange-500" size={48} />}
      title="Personalizacja"
      subtitle="Motywy kart — mock lokalny do czasu API; po wdrożeniu zostaje ten sam układ."
    >
      <div className="flex justify-center md:justify-end">
        <div className="bg-white border-2 border-orange-200 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-lg">
          <Coins className="text-orange-600" size={24} />
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Saldo</p>
            <p className="text-3xl font-black">{user?.coins ?? 0}</p>
          </div>
        </div>
      </div>

      {usingMock && (
        <p className="text-sm font-medium text-orange-700 bg-orange-50 rounded-xl py-2 px-4 border border-orange-100 text-center">
          Zakupy i wybór motywu działają lokalnie — podłącz POST buy/select gdy backend będzie gotowy.
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-[2rem]" />
          ))}
        </div>
      ) : themes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => {
            const isOwned = ownedThemeIds.includes(theme.id);
            const isActive = activeThemeId === theme.id;
            const canAfford = (user?.coins ?? 0) >= theme.price;

            return (
              <div
                key={theme.id}
                className={`bg-white rounded-[2rem] p-5 border-2 shadow-lg ${
                  isActive ? 'border-orange-500' : 'border-gray-100'
                }`}
              >
                <div className={`w-full aspect-video rounded-2xl mb-4 ${theme.preview}`} />
                <h3 className="font-bold text-lg mb-3">{theme.name}</h3>
                {isActive ? (
                  <Button className="w-full bg-orange-50 text-orange-600 cursor-default">
                    <Check size={18} className="mr-2" /> Aktywny
                  </Button>
                ) : isOwned ? (
                  <Button variant="outline" className="w-full" onClick={() => handleSelectTheme(theme.id)}>
                    Wybierz
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    disabled={!canAfford && !usingMock}
                    onClick={() => handleBuyTheme(theme.id, theme.price)}
                  >
                    {theme.price === 0 ? 'Darmowy' : canAfford ? `Kup (${theme.price})` : 'Brak monet'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center py-16 text-gray-400 font-bold">Brak motywów do wyświetlenia.</p>
      )}
    </ViewPageShell>
  );
}
