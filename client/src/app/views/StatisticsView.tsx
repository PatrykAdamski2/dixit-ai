import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Star } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { ViewPageShell } from '../components/ViewPageShell';
import { Skeleton } from '../components/ui/skeleton';
import { fetchApi } from '../services/api';

interface PlayerRanking {
  rank: number;
  username: string;
  total_points: number;
  games_played: number;
  games_won: number;
}

interface MyStats {
  games_played: number;
  games_won: number;
  total_points: number;
}

export function StatisticsView() {
  const [topPlayers, setTopPlayers] = useState<PlayerRanking[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = useGameStore((state) => state.user);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const [leaderboard, mine] = await Promise.all([
          fetchApi<PlayerRanking[]>('/api/stats/leaderboard'),
          fetchApi<MyStats>('/api/stats/me'),
        ]);
        setTopPlayers(leaderboard);
        setMyStats(mine);
      } catch {
        setError('Nie udało się pobrać rankingu.');
      }
      setLoading(false);
    };

    fetchRankings();
  }, []);

  const me = topPlayers.find((player) => player.username === user?.username);

  return (
    <ViewPageShell
      icon={
        <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center text-orange-500 rotate-3 shadow-xl">
          <Trophy size={40} />
        </div>
      }
      title="Globalny Ranking"
      subtitle="Top graczy na podstawie statystyk z backendu."
    >
      {error && (
        <p className="text-center text-sm font-medium text-red-700 bg-red-50 rounded-xl py-2 px-4 border border-red-100">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-md rounded-[2rem] p-6 shadow-inner border border-gray-100 space-y-4">
          {topPlayers.length > 0 ? (
            topPlayers.map((player) => (
              <div
                key={player.rank}
                className={`flex items-center gap-6 p-4 rounded-2xl transition-all hover:scale-[1.01] ${
                  player.rank === 1
                    ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200'
                    : 'bg-gray-50 border border-gray-100'
                }`}
              >
                <div className="w-12 text-center flex justify-center">
                  {player.rank <= 3 ? (
                    <Medal
                      size={player.rank === 1 ? 32 : 28}
                      className={
                        player.rank === 1
                          ? 'text-yellow-500'
                          : player.rank === 2
                            ? 'text-gray-400'
                            : 'text-amber-700'
                      }
                    />
                  ) : (
                    <span className="text-2xl font-black text-gray-400">#{player.rank}</span>
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm border flex items-center justify-center font-bold text-gray-600">
                  {(player.username || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 font-bold text-gray-900">{player.username}</div>
                <div className="text-right">
                  <span className="text-2xl font-black">{player.total_points}</span>
                  <Star size={16} className="inline text-orange-400 fill-orange-400 ml-1" />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-12 text-gray-400 font-bold">Brak danych rankingu.</p>
          )}

          {(myStats || me) && (
            <div className="flex items-center gap-6 p-4 rounded-2xl bg-gray-900 text-white mt-4">
              <span className="w-12 text-center font-black text-gray-400">{me ? `#${me.rank}` : '—'}</span>
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center font-bold">
                {(user?.avatar || user?.username || 'TY').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 font-bold">
                {user?.username ?? 'Ty'}{' '}
                <span className="text-xs bg-orange-500 px-2 py-0.5 rounded-md uppercase">Ty</span>
              </div>
              <span className="text-2xl font-black">{myStats?.total_points ?? me?.total_points ?? 0}</span>
            </div>
          )}
        </div>
      )}
    </ViewPageShell>
  );
}
