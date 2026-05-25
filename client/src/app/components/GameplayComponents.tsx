import React from 'react';
import { cn } from '@/app/components/ui/utils';
import { GameCard } from './GameCard';

export function TimerBox({ seconds }: { seconds: number }) {
  return (
    <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-2.5 rounded-2xl shadow-lg border-2 border-gray-800">
      <img src="/Ikony/ClockIcon.svg" className="w-6 h-6" alt="Czas" />
      <span className="text-2xl font-black tabular-nums leading-none">{seconds}s</span>
    </div>
  );
}

export function RoleBadge({ text }: { text: string }) {
  return (
    <div className="bg-orange-500 text-white px-6 py-1.5 rounded-full font-black text-sm uppercase tracking-widest shadow-md border-2 border-orange-600">
      {text}
    </div>
  );
}

export function InstructionBox({ text }: { text: React.ReactNode }) {
  return (
    <div className="w-full text-center mt-6 mb-8 px-4">
      <p className="text-gray-500 font-medium text-lg max-w-2xl mx-auto italic whitespace-pre-wrap">
        {text}
      </p>
    </div>
  );
}

export function GameplayHeader({ seconds, roleText, instruction }: { seconds: number, roleText: string, instruction: React.ReactNode }) {
  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex flex-col items-center gap-4 mt-6">
        <TimerBox seconds={seconds} />
        <RoleBadge text={roleText} />
      </div>
      <InstructionBox text={instruction} />
    </div>
  );
}

export function AssociationBox({ text }: { text: string }) {
  return (
    <div className="bg-white border-2 border-gray-200 px-8 py-6 rounded-3xl shadow-xl max-w-2xl w-full text-center my-8 mx-auto transform -rotate-1 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
        Skojarzenie Narratora
      </div>
      <p className="text-2xl md:text-3xl font-black text-gray-900 leading-snug">
        "{text}"
      </p>
    </div>
  );
}

export function CardGrid({
  cards,
  onSelect,
  selectedId,
  faceDown = false,
  disabled = false,
  variant = 'hand',
}: {
  cards: { id: string; image?: string }[];
  onSelect?: (id: string) => void;
  selectedId?: string;
  faceDown?: boolean;
  disabled?: boolean;
  /** hand = przewijana ręka; table = karty na stole */
  variant?: 'hand' | 'table';
}) {
  const selectable = !!onSelect && !disabled;
  const inner = cards.map((card) => (
    <GameCard
      key={card.id}
      cardId={card.id}
      imageUrl={card.image}
      isBack={faceDown}
      isSelected={selectedId === card.id}
      isSelectable={selectable}
      onClick={() => onSelect?.(card.id)}
      size={variant === 'table' ? 'md' : 'sm'}
      className="shrink-0 md:shrink"
    />
  ));

  if (variant === 'hand') {
    return (
      <div className="w-full max-w-5xl mx-auto px-2 md:px-4 mt-auto mb-6">
        <div className="overflow-x-auto pb-3 -mx-2 px-2 md:overflow-visible md:pb-0">
          <div className="flex flex-nowrap md:flex-wrap justify-center gap-3 md:gap-5 min-w-min mx-auto">
            {inner}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-6 w-full max-w-5xl mx-auto px-4 mt-auto mb-8">
      {inner}
    </div>
  );
}