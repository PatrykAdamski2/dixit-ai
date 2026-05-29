import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Star } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { ViewPageShell } from '../components/ViewPageShell';
import { Skeleton } from '../components/ui/skeleton';
import { fetchOptional } from '../services/api';
import { MOCK_GLOBAL_STATS } from '../data/mockStats';

interface PlayerRanking {
  rank: number;
  name: string;
  wins: number;
  avatar: string;
}

export function StatisticsView() {
  const [topPlayers, setTopPlayers] = useState<PlayerRanking[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<PlayerRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const user = useGameStore((state) => state.user);

  useEffect(() => {
    const fetchRankings = async () => {
      const data = await fetchOptional<{
        topPlayers: PlayerRanking[];
        currentUserRank: PlayerRanking | null;
      }>('/api/stats/global');
      if (data?.topPlayers?.length) {
        setTopPlayers(data.topPlayers);
        setCurrentUserRank(data.currentUserRank ?? null);
      } else {
        const mock = MOCK_GLOBAL_STATS;
        setTopPlayers(mock.topPlayers);
        setCurrentUserRank({
          ...mock.currentUserRank,
          name: user?.username ?? mock.currentUserRank.name,
          avatar: user?.avatar?.slice(0, 2) ?? mock.currentUserRank.avatar,
        });
        setUsingMock(true);
      }
      setLoading(false);
    };

    fetchRankings();
  }, [user?.username, user?.avatar]);

  return (
    <ViewPageShell
      apiFeature="Ranking globalny (GET /api/stats/global)"
      icon={
        <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center text-orange-500 rotate-3 shadow-xl">
          <Trophy size={40} />
        </div>
      }
      title="Globalny Ranking"
      subtitle="Top graczy — po podłączeniu API wystarczy podmienić fetch w tym widoku."
    >
      {usingMock && (
        <p className="text-center text-sm font-medium text-orange-700 bg-orange-50 rounded-xl py-2 px-4 border border-orange-100">
          Dane podglądowe — endpoint zwrócił 404 lub pustą odpowiedź.
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
                  {player.avatar}
                </div>
                <div className="flex-1 font-bold text-gray-900">{player.name}</div>
                <div className="text-right">
                  <span className="text-2xl font-black">{player.wins}</span>
                  <Star size={16} className="inline text-orange-400 fill-orange-400 ml-1" />
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-12 text-gray-400 font-bold">Brak danych rankingu.</p>
          )}

          {currentUserRank && (
            <div className="flex items-center gap-6 p-4 rounded-2xl bg-gray-900 text-white mt-4">
              <span className="w-12 text-center font-black text-gray-400">#{currentUserRank.rank}</span>
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center font-bold">
                {currentUserRank.avatar}
              </div>
              <div className="flex-1 font-bold">
                {currentUserRank.name}{' '}
                <span className="text-xs bg-orange-500 px-2 py-0.5 rounded-md uppercase">Ty</span>
              </div>
              <span className="text-2xl font-black">{currentUserRank.wins}</span>
            </div>
          )}
        </div>
      )}
    </ViewPageShell>
  );
}
