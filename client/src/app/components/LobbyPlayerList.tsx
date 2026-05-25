import React from 'react';
import { Bot } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import type { Player } from '../store/useGameStore';

interface LobbyPlayerListProps {
  players: Player[];
  maxPlayers: number;
  myId?: string | null;
  showEmptySlots?: boolean;
  loading?: boolean;
  loadingCount?: number;
}

export function LobbyPlayerList({
  players,
  maxPlayers,
  myId,
  showEmptySlots = false,
  loading = false,
  loadingCount = 3,
}: LobbyPlayerListProps) {
  if (loading) {
    return (
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-2 space-y-2">
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-100 rounded-2xl p-2 space-y-2">
      {players.map((player, index) => (
        <div key={player.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center p-1.5 overflow-hidden ${
                player.isBot ? 'bg-indigo-100 text-indigo-600' : 'bg-orange-100 text-orange-600'
              }`}
            >
              <img
                src="/Ikony/PlayerIcon.svg"
                className={`w-full h-full ${player.isBot ? 'hue-rotate-[240deg] saturate-200' : ''}`}
                alt=""
              />
            </div>
            <span className="font-bold text-gray-900">{player.username}</span>
            {player.isBot && (
              <span className="text-[10px] font-black bg-indigo-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-tighter flex items-center gap-0.5">
                <Bot size={10} /> AI
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {index === 0 && (
              <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-md uppercase">
                Host
              </span>
            )}
            {player.id === myId && (
              <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-1 rounded-md uppercase tracking-wider">
                Ty
              </span>
            )}
          </div>
        </div>
      ))}
      {showEmptySlots &&
        Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-200"
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center p-2 opacity-30">
              <img src="/Ikony/PlayerIcon.svg" className="w-full h-full" alt="" />
            </div>
            <span className="font-medium text-gray-400 italic text-sm">Oczekiwanie na gracza…</span>
          </div>
        ))}
    </div>
  );
}
