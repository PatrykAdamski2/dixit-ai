import React, { useEffect, useState } from 'react';
import { Info, Brain } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { ViewPageShell } from '../components/ViewPageShell';
import { Skeleton } from '../components/ui/skeleton';
import {
  fetchPsychoProfile,
  profileToChartData,
  PSYCHO_DIMENSION_HELP,
  type PsychoProfileDto,
} from '../services/psychoProfileApi';

export function PsychoProfileView() {
  const [profile, setProfile] = useState<PsychoProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchPsychoProfile();
      if (!cancelled) {
        setProfile(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = profile ? profileToChartData(profile) : [];

  return (
    <ViewPageShell
      maxWidth="lg"
      icon={
        <div className="w-16 h-16 bg-gray-900 rounded-[1.5rem] flex items-center justify-center text-white rotate-[-10deg] shadow-lg">
          <Brain size={32} className="text-orange-400" />
        </div>
      }
      title="Profil psychologiczny"
      subtitle="Analiza Twojego stylu gry"
    >
      <div className="relative overflow-visible">
        <div className="absolute top-0 right-0 z-10">
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 bg-orange-100 hover:bg-orange-200 rounded-xl text-orange-600 transition-colors"
            aria-label="Opis wymiarów profilu"
          >
            <Info size={24} />
          </button>

          {showInfo && (
            <div className="absolute top-12 right-0 w-80 bg-gray-900 text-white text-sm p-5 rounded-2xl shadow-xl z-50">
              <ul className="space-y-3">
                {PSYCHO_DIMENSION_HELP.map((item) => (
                  <li key={item.title}>
                    <strong className="text-orange-400">{item.title}:</strong> {item.text}
                  </li>
                ))}
              </ul>
              <div className="absolute -top-2 right-4 w-4 h-4 bg-gray-900 rotate-45" />
            </div>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        ) : profile ? (
          <div className="w-full h-[400px] pt-4">
            {profile.games_analyzed != null && profile.games_analyzed > 0 && (
              <p className="text-center text-sm text-gray-500 font-medium mb-4">
                Na podstawie {profile.games_analyzed}{' '}
                {profile.games_analyzed === 1 ? 'partii' : 'partii'}
              </p>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#374151', fontSize: 14, fontWeight: 'bold' }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Gracz"
                  dataKey="A"
                  stroke="#f97316"
                  strokeWidth={3}
                  fill="#f97316"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[320px] text-center px-4 gap-4">
            <p className="text-gray-600 font-medium text-lg">
              Profil pojawi się po kilku rozegranych partiach.
            </p>
            <p className="text-sm text-gray-400 max-w-md">
              Gdy backend udostępni statystyki stylu gry, zobaczysz tu wykres z czterema wymiarami.
              Naciśnij ℹ️, aby dowiedzieć się, co oznaczają.
            </p>
          </div>
        )}
      </div>
    </ViewPageShell>
  );
}
