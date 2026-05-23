import React from 'react';
import { useNavigate } from 'react-router';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '../../components/Button';
import { Trophy, Coins } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export function RoundEndView() {
  const navigate = useNavigate();
  const { players } = useGameStore();

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  const chartData = players.length > 0 ? players.map((p, index) => ({
    name: p.username,
    points: p.score,
    fill: p.isBot ? '#6366f1' : ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][index % 5]
  })) : [];

  return (
    <div className="w-full h-full flex flex-col items-center max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div className="bg-orange-500 text-white rounded-full px-8 py-3 flex items-center gap-4 shadow-xl shadow-orange-500/30 border-4 border-orange-400">
        <Trophy size={28} className="text-yellow-300" />
        <h1 className="text-2xl md:text-3xl font-black tracking-widest uppercase text-center">
          Wygrywa: {winner?.username || 'Gracz'}
        </h1>
        <Trophy size={28} className="text-yellow-300" />
      </div>

      <div className="w-full h-[50vh] bg-white rounded-[2rem] shadow-xl p-8 border-2 border-gray-100">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#4b5563', fontWeight: 'bold' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9ca3af', fontWeight: 'bold' }} 
            />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
            />
            <Bar dataKey="points" radius={[8, 8, 8, 8]} barSize={60}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-gray-900 text-white rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-2 w-full max-w-md">
        <div className="text-gray-400 font-bold uppercase tracking-widest text-sm">
          Twoje Punkty: {players.find(p => p.id === 'me')?.score || 0}
        </div>
        <div className="flex items-center gap-3 text-3xl font-black text-orange-400">
          <span>+Nagroda</span>
          <Coins size={32} />
        </div>
      </div>

      <Button 
        size="lg" 
        onClick={() => navigate('/menu')}
        className="w-full max-w-md h-16 text-xl shadow-lg mt-4"
      >
        Wróć do menu
      </Button>
    </div>
  );
}