import { fetchOptional } from './api';

/** Kontrakt GET /api/stats/psycho-profile (backend — osobna implementacja). */
export interface PsychoProfileDto {
  abstraction: number;
  brevity: number;
  sweetness: number;
  accuracy: number;
  games_analyzed?: number;
}

type PsychoProfileResponse = PsychoProfileDto & {
  gamesAnalyzed?: number;
};

function mapProfile(raw: PsychoProfileResponse): PsychoProfileDto | null {
  const abstraction = raw.abstraction;
  const brevity = raw.brevity;
  const sweetness = raw.sweetness;
  const accuracy = raw.accuracy;
  if (
    [abstraction, brevity, sweetness, accuracy].some(
      (v) => typeof v !== 'number' || Number.isNaN(v)
    )
  ) {
    return null;
  }
  return {
    abstraction,
    brevity,
    sweetness,
    accuracy,
    games_analyzed: raw.games_analyzed ?? raw.gamesAnalyzed,
  };
}

export async function fetchPsychoProfile(): Promise<PsychoProfileDto | null> {
  const data = await fetchOptional<PsychoProfileResponse>('/api/stats/psycho-profile');
  if (!data) return null;
  return mapProfile(data);
}

export const PSYCHO_DIMENSION_LABELS = [
  { key: 'abstraction' as const, label: 'Abstrakcja' },
  { key: 'brevity' as const, label: 'Zwięzłość' },
  { key: 'sweetness' as const, label: 'Cukierkowatość' },
  { key: 'accuracy' as const, label: 'Trafność' },
];

export const PSYCHO_DIMENSION_HELP = [
  {
    title: 'Abstrakcja',
    text: 'Ocena tego, czy gracz podaje konkretne opisy (np. czerwony balon), czy woli metafory i skojarzenia (np. „utracone marzenia”).',
  },
  {
    title: 'Zwięzłość',
    text: 'Średnia długość promptu (ilość znaków).',
  },
  {
    title: 'Cukierkowatość',
    text: 'Analiza nacechowania emocjonalnego promptów — słowa negatywne, nostalgiczne lub wesołe i lekkie.',
  },
  {
    title: 'Trafność',
    text: 'Mierzone w fazie głosowania: czy gracz trafia kartę narratora, czy głosuje na karty innych.',
  },
];

export function profileToChartData(profile: PsychoProfileDto) {
  return PSYCHO_DIMENSION_LABELS.map(({ key, label }) => ({
    subject: label,
    A: profile[key],
    fullMark: 100,
  }));
}
