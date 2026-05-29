/** Podgląd talii gdy API personalizacji jest niedostępne (zgodnie z makietą DixitAI_UI). */
export interface FallbackCardSet {
  id: string;
  name: string;
  price: number;
  preview: string;
}

export const FALLBACK_CARD_SETS: FallbackCardSet[] = [
  { id: 'classic', name: 'Bajka', price: 0, preview: 'bg-gray-900' },
  { id: 'nature', name: 'Przyroda', price: 150, preview: 'bg-yellow-100' },
  { id: 'music', name: 'Muzyka', price: 200, preview: 'bg-cyan-900' },
  { id: 'architecture', name: 'Architektura', price: 500, preview: 'bg-purple-950' },
  { id: 'tech', name: 'Technologia', price: 300, preview: 'bg-green-900' },
  { id: 'patriot', name: 'Patriotyzm', price: 1000, preview: 'bg-zinc-950' },
];
