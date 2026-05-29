import React from 'react';
import { TimerBox } from '../../components/GameplayComponents';
import { Button } from '../../components/Button';
import { useGameStore } from '../../store/useGameStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function RoundScoreView() {
  const { players, timer, lastRoundScores } = useGameStore();

  const chartData =
    players.length > 0
      ? players.map((p, index) => ({
          name: p.username,
          points: lastRoundScores[p.id] ?? p.score,
          fill: p.isBot ? '#6366f1' : ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][index % 5],
        }))
      : [{ name: 'Brak danych', points: 0, fill: '#d1d5db' }];

  return (
    <div className="w-full h-full flex flex-col items-center max-w-4xl mx-auto py-6 md:py-8 px-4">
      <div className="w-full flex justify-between items-center bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-gray-200 shadow-sm mb-8">
        <TimerBox seconds={timer ?? 5} />
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Wynik rundy</h2>
          <p className="text-sm text-gray-500 font-medium">Punkty zdobyte w tej rundzie</p>
        </div>
        <div className="w-24" />
      </div>

      <div className="w-full h-[50vh] md:h-[60vh] bg-white rounded-[2rem] shadow-xl p-4 md:p-8 border-2 border-gray-100">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#4b5563', fontWeight: 'bold', fontSize: 12 }}
              dy={10}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontWeight: 'bold' }} />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              contentStyle={{
                borderRadius: '16px',
                border: 'none',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar dataKey="points" radius={[8, 8, 8, 8]} barSize={48}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <Button
          size="lg"
          disabled
          className="flex-1 h-14 text-lg shadow-lg"
          title="Kontynuacja wymaga sygnału z serwera"
        >
          Kontynuuj (następna runda)
        </Button>
      </div>
      <p className="mt-3 text-sm text-gray-500 font-medium text-center">
        Następna runda rozpocznie się po evencie z serwera.
      </p>
    </div>
  );
}
