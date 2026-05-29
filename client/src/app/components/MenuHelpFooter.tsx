import React, { useState } from 'react';

type TooltipId = 'pomoc' | 'przebieg' | 'zasady';

export function MenuHelpFooter() {
  const [activeTooltip, setActiveTooltip] = useState<TooltipId | null>(null);

  const toggle = (id: TooltipId) => {
    setActiveTooltip((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full flex flex-wrap justify-center gap-6 pt-6 border-t border-gray-200/50">
      <div className="relative">
        <button
          type="button"
          onClick={() => toggle('pomoc')}
          className="text-gray-400 hover:text-gray-600 font-medium text-sm transition-colors"
        >
          Pomoc
        </button>
        {activeTooltip === 'pomoc' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 bg-gray-900 text-white p-5 rounded-2xl shadow-xl z-50 text-left text-sm">
            <h4 className="font-bold text-orange-400 mb-2">Stwórz nową grę:</h4>
            <p className="mb-3 text-gray-300">
              Hostuj grę — utwórz lobby, ustal liczbę graczy, botów i zasady wygranej.
            </p>
            <h4 className="font-bold text-orange-400 mb-2">Dołącz do lobby:</h4>
            <p className="mb-3 text-gray-300">
              Dołącz kodem 6 znaków wysłanym przez hosta.
            </p>
            <h4 className="font-bold text-orange-400 mb-2">Statystyki:</h4>
            <p className="mb-3 text-gray-300">Ranking graczy z największą liczbą punktów.</p>
            <h4 className="font-bold text-orange-400 mb-2">Profil psychologiczny:</h4>
            <p className="mb-3 text-gray-300">Twój styl gry w czterech wymiarach po kilku partiach.</p>
            <h4 className="font-bold text-orange-400 mb-2">Personalizacja:</h4>
            <p className="text-gray-300">Wybór zestawów kart dostępnych w rozgrywce (gdy API jest aktywne).</p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 rotate-45" />
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => toggle('przebieg')}
          className="text-gray-400 hover:text-gray-600 font-medium text-sm transition-colors"
        >
          Przebieg gry
        </button>
        {activeTooltip === 'przebieg' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-80 bg-gray-900 text-white p-5 rounded-2xl shadow-xl z-50 text-left text-sm">
            <ol className="space-y-3 text-gray-300">
              <li>
                <strong className="text-orange-400">1. Narrator:</strong> Wybiera 1 z 6 kart i wymyśla
                hasło — nie może być zbyt oczywiste.
              </li>
              <li>
                <strong className="text-orange-400">2. Wybór kart:</strong> Pozostali wybierają kartę
                pasującą do hasła.
              </li>
              <li>
                <strong className="text-orange-400">3. Głosowanie:</strong> Karty są tasowane; gracze
                wskazują kartę narratora.
                <span className="block text-xs text-gray-400 mt-2">
                  Po rundzie każdy dobiera kartę; rola narratora przechodzi dalej.
                </span>
              </li>
            </ol>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-900 rotate-45" />
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => toggle('zasady')}
          className="text-gray-400 hover:text-gray-600 font-medium text-sm transition-colors"
        >
          Zasady punktacji
        </button>
        {activeTooltip === 'zasady' && (
          <div className="absolute bottom-full right-0 translate-x-4 mb-4 w-80 bg-gray-900 text-white p-5 rounded-2xl shadow-xl z-50 text-left text-sm">
            <ul className="space-y-4 text-gray-300">
              <li>
                <strong className="text-orange-400 block mb-1">
                  Wszyscy lub nikt nie odgadł kartę narratora:
                </strong>
                Narrator: 0 pkt | Pozostali: po 2 pkt.
              </li>
              <li>
                <strong className="text-orange-400 block mb-1">Część graczy odgadła:</strong>
                Narrator: 3 pkt | Trafili: po 3 pkt.
              </li>
              <li>
                <strong className="text-orange-400 block mb-1">Bonus:</strong>
                +1 pkt za każdy głos na Twoją kartę.
              </li>
            </ul>
            <div className="absolute -bottom-2 right-12 w-4 h-4 bg-gray-900 rotate-45" />
          </div>
        )}
      </div>
    </div>
  );
}
