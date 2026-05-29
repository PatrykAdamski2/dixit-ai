import React, { useEffect, useState } from 'react';
import { Coins, Sparkles, Check } from 'lucide-react';
import { Button } from '../components/Button';
import { useGameStore } from '../store/useGameStore';
import { ViewPageShell } from '../components/ViewPageShell';
import { Skeleton } from '../components/ui/skeleton';
import { fetchProfile, fetchThemes, buyTheme, selectTheme, type Theme } from '../services/personalizationApi';

export function PersonalizationView() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState('classic');
  const [ownedThemeIds, setOwnedThemeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useGameStore((state) => state.user);
  const setUser = useGameStore((state) => state.setUser);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [themesData, profileData] = await Promise.all([fetchThemes(), fetchProfile()]);
        setThemes(themesData);
        setActiveThemeId(profileData.activeThemeId);
        setOwnedThemeIds(profileData.ownedThemeIds ?? []);
        setUser({
          username: profileData.username,
          coins: profileData.coins,
          avatar: profileData.avatar,
        });
      } catch {
        setError('Personalizacja niedostępna. Backend nie udostępnia jeszcze tego API.');
      }
      setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jednorazowy load
  }, [setUser]);

  const handleBuyTheme = async (themeId: string, price: number) => {
    if (!user || user.coins < price) return;
    try {
      const data = await buyTheme(themeId);
      setOwnedThemeIds([...ownedThemeIds, themeId]);
      setUser({ ...user, coins: data.newBalance });
    } catch {
      setError('Nie udało się kupić motywu.');
    }
  };

  const handleSelectTheme = async (themeId: string) => {
    try {
      await selectTheme(themeId);
      setActiveThemeId(themeId);
    } catch {
      setError('Nie udało się ustawić motywu.');
    }
  };

  return (
    <ViewPageShell
      maxWidth="lg"
      icon={<Sparkles className="text-orange-500" size={48} />}
      title="Personalizacja"
      subtitle="Motywy kart i ustawienia profilu."
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

      {error && (
        <p className="text-sm font-medium text-red-700 bg-red-50 rounded-xl py-2 px-4 border border-red-100 text-center">
          {error}
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
                    disabled={!canAfford}
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
