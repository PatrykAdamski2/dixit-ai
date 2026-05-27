import React from 'react';
import { Info } from 'lucide-react';

interface ApiPendingBannerProps {
  feature: string;
}

/** Informacja gdy widok jest gotowy, ale endpoint czeka na backend. */
export function ApiPendingBanner({ feature }: ApiPendingBannerProps) {
  return (
    <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Info className="mt-0.5 shrink-0 text-amber-600" size={18} />
      <p>
        <span className="font-bold">{feature}</span> — API jest w przygotowaniu po stronie serwera.
        Widok działa w trybie podglądu z ustawieniami domyślnymi (bez błędów w konsoli).
      </p>
    </div>
  );
}
