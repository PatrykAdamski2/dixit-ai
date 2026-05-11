import React from 'react';
import { cn } from '@/app/components/ui/utils';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface GameCardProps {
  cardId?: string;
  imageUrl?: string;
  isBack?: boolean;
  isSelected?: boolean;
  isSelectable?: boolean;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Komponent GameCard do wyświetlania kart Dixit. 
 * Obsługuje proporcje 2:3 i leniwe ładowanie.
 */
export const GameCard: React.FC<GameCardProps> = ({
  cardId,
  imageUrl,
  isBack = false,
  isSelected = false,
  isSelectable = false,
  onClick,
  className,
  size = 'md',
}) => {
  // Ustalamy skąd wziąć obrazek (rewers lub konkretny numer)
  const finalSrc = isBack 
    ? '/Karty/KartaRewers.png' 
    : (imageUrl || (cardId ? `/Karty/KartaNr${cardId}.png` : ''));

  // Klasy wielkości - zachowujemy proporcje 2:3
  const sizeClasses = {
    sm: 'w-24 h-36',
    md: 'w-32 h-48',
    lg: 'w-48 h-72',
    xl: 'w-64 h-96',
  };

  return (
    <div
      onClick={isSelectable ? onClick : undefined}
      className={cn(
        'relative overflow-hidden rounded-xl transition-all duration-300 ease-in-out',
        'cursor-default shadow-md border-2 border-transparent',
        sizeClasses[size],
        isSelectable && 'cursor-pointer hover:scale-105 hover:shadow-xl hover:z-10',
        isSelected && 'border-primary ring-4 ring-primary/30 scale-105 z-10',
        className
      )}
    >
      <ImageWithFallback
        src={finalSrc}
        alt={isBack ? 'Karta Rewers' : `Karta ${cardId || ''}`}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      
      {/* Nakładka informująca o zaznaczeniu karty */}
      {isSelected && (
        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
          <div className="bg-primary text-white rounded-full p-1 scale-110 shadow-lg">
             <img src="/Ikony/AcceptIcon.svg" className="w-6 h-6" alt="Wybrano" />
          </div>
        </div>
      )}
    </div>
  );
};
