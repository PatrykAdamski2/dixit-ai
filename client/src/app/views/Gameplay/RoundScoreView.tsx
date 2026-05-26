import React from 'react';
import { TimerBox } from '../../components/GameplayComponents';
import { useGameStore } from '../../store/useGameStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function RoundScoreView() {
  const { players, timer } = useGameStore();
  
  const chartData = players.length > 0 ? players.map((p, index) => ({
    name: p.username,
    points: p.score,
    fill: p.isBot ? '#6366f1' : ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][index % 5]
  })) : [
    { name: 'Oczekiwanie...', points: 0, fill: '#f97316' }
  ];

  return (
    <div className="w-full h-full flex flex-col items-center max-w-4xl mx-auto py-8 px-4">
      <div className="w-full flex justify-between items-center bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-gray-200 shadow-sm mb-12">
        <TimerBox seconds={timer ?? 5} />
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
          Ranking Graczy
        </h2>
        <div className="w-24"></div> {/* Spacer for balance */}
      </div>

      <div className="w-full h-[60vh] bg-white rounded-[2rem] shadow-xl p-8 border-2 border-gray-100">
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
    </div>
  );
}