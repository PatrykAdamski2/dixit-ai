import React, { useEffect, useState } from 'react';
import { Coins, Sparkles, Check } from 'lucide-react';

const THEME_GRADIENTS: Record<string, string> = {
  classic: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
  ocean:   'linear-gradient(135deg, #bfdbfe, #67e8f9)',
  forest:  'linear-gradient(135deg, #bbf7d0, #10b981)',
  dark:    'linear-gradient(135deg, #374151, #111827)',
};
import { Button } from '../components/Button';
import { useGameStore } from '../store/useGameStore';
import { ViewPageShell } from '../components/ViewPageShell';
import { Skeleton } from '../components/ui/skeleton';
import { fetchProfile, fetchThemes, buyTheme, selectTheme, type Theme } from '../services/personalizationApi';
import { FALLBACK_CARD_SETS } from '../data/fallbackCardSets';

export function PersonalizationView() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [activeThemeId, setActiveThemeId] = useState('classic');
  const [ownedThemeIds, setOwnedThemeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);
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
        setApiUnavailable(false);
      } catch {
        setApiUnavailable(true);
        setThemes([]);
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
      setError('Nie udało się kupić zestawu.');
    }
  };

  const handleSelectTheme = async (themeId: string) => {
    try {
      await selectTheme(themeId);
      setActiveThemeId(themeId);
    } catch {
      setError('Nie udało się ustawić zestawu.');
    }
  };

  return (
    <ViewPageShell
      maxWidth="lg"
      icon={<Sparkles className="text-orange-500" size={48} />}
      title="Personalizacja"
      subtitle="Wybierz zestawy tematyczne kart dostępnych podczas rozgrywki."
    >
      {!apiUnavailable && (
        <div className="flex justify-center md:justify-end">
          <div className="bg-white border-2 border-orange-200 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-lg">
            <Coins className="text-orange-600" size={24} />
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">Saldo</p>
              <p className="text-3xl font-black">{user?.coins ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {apiUnavailable && (
        <p className="text-sm font-medium text-amber-800 bg-amber-50 rounded-xl py-3 px-4 border border-amber-200 text-center">
          Podgląd zestawów kart — zakup i aktywacja będą dostępne po wdrożeniu API na serwerze.
        </p>
      )}

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
      ) : apiUnavailable ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FALLBACK_CARD_SETS.map((set, index) => (
            <div
              key={set.id}
              className={`bg-white rounded-[2rem] p-5 border-2 shadow-lg ${
                index === 0 ? 'border-orange-500' : 'border-gray-100'
              }`}
            >
              <div className={`w-full aspect-video rounded-2xl mb-4 ${set.preview}`} />
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">{set.name}</h3>
                <span className="flex items-center gap-1 font-black text-orange-500 bg-orange-50 px-3 py-1 rounded-lg text-sm">
                  <Coins size={14} />
                  {set.price === 0 ? 'Domyślny' : set.price}
                </span>
              </div>
              <Button className="w-full opacity-60 cursor-not-allowed" disabled>
                {index === 0 ? (
                  <>
                    <Check size={18} className="mr-2" /> Domyślny w grze
                  </>
                ) : (
                  'Wkrótce'
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : themes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => {
            const isOwned = ownedThemeIds.includes(theme.id);
            const isActive = activeThemeId === theme.id;
            const canAfford = (user?.coins ?? 0) >= theme.price;
            const previewStyle = THEME_GRADIENTS[theme.id] ?? THEME_GRADIENTS['classic'];

            return (
              <div
                key={theme.id}
                className={`bg-white rounded-[2rem] p-5 border-2 shadow-lg ${
                  isActive ? 'border-orange-500' : 'border-gray-100'
                }`}
              >
                <div
                  className="w-full aspect-video rounded-2xl mb-4 relative"
                  style={{ background: previewStyle }}
                >
                  {theme.price > 0 && !isOwned && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 text-white text-xs font-black px-2 py-1 rounded-lg">
                      <Coins size={12} /> {theme.price}
                    </span>
                  )}
                  {theme.price === 0 && (
                    <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-black px-2 py-1 rounded-lg">
                      Darmowy
                    </span>
                  )}
                </div>
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
                    {canAfford
                      ? <><Coins size={15} className="mr-1" /> Kup za {theme.price}</>
                      : 'Za mało monet'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center py-16 text-gray-400 font-bold">Brak zestawów do wyświetlenia.</p>
      )}
    </ViewPageShell>
  );
}
