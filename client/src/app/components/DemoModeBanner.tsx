import React from 'react';
import { Sparkles } from 'lucide-react';

interface DemoModeBannerProps {
  context?: 'lobby' | 'game' | 'start';
}

const COPY: Record<NonNullable<DemoModeBannerProps['context']>, string> = {
  lobby:
    'Tryb demonstracyjny — kod pokoju i lista graczy są lokalne. Po wdrożeniu API lobby dane zsynchronizują się przez REST i socket.',
  game:
    'Gra demonstracyjna — fazy i punkty są lokalne. Emity socket działają, gdy podasz prawdziwe game_id w panelu Dev.',
  start:
    'Start w trybie demo — bez API lobby uruchamiamy lokalną rozgrywkę. Gdy backend odpowie na POST /api/lobby/start, przejdziesz na grę serwerową.',
};

export function DemoModeBanner({ context = 'lobby' }: DemoModeBannerProps) {
  return (
    <div className="mb-6 flex gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
      <Sparkles className="mt-0.5 shrink-0 text-orange-500" size={18} />
      <p>{COPY[context]}</p>
    </div>
  );
}
