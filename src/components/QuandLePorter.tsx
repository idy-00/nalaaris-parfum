import type { ReactNode } from 'react';
import type { Moment, Occasion, Porter, Saison } from '../data/parfums';

/**
 * « Quand le porter » : moment, saison (climat de Dakar) et occasion.
 * Icônes au trait, même épaisseur que les gravures d'ingrédients.
 */

const Trait = ({ children }: { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-full w-full"
  >
    {children}
  </svg>
);

export const ICONES = {
  lune: <path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1Z" />,
  soleil: (
    <>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5L7 7M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5" />
    </>
  ),
  jourSoir: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" fill="currentColor" fillOpacity="0.18" stroke="none" />
    </>
  ),
  fraiche: <path d="M3.5 8.5c1.4-1.3 2.9-1.3 4.3 0s2.9 1.3 4.3 0 2.9-1.3 4.3 0 2.9 1.3 4.1 0M3.5 12.5c1.4-1.3 2.9-1.3 4.3 0s2.9 1.3 4.3 0 2.9-1.3 4.3 0 2.9 1.3 4.1 0M3.5 16.5c1.4-1.3 2.9-1.3 4.3 0s2.9 1.3 4.3 0 2.9-1.3 4.3 0 2.9 1.3 4.1 0" />,
  chaude: (
    <>
      <path d="M8.2 15.5a3.8 3.8 0 1 1 7.6 0" />
      <path d="M12 6.2v2M5.6 9.1L7 10.5M18.4 9.1L17 10.5M3.5 15.5h2M18.5 15.5h2M3.5 19h17" />
    </>
  ),
  annee: (
    <>
      <rect x="3.8" y="5.3" width="16.4" height="14.9" rx="2" />
      <path d="M3.8 9.8h16.4M8.3 3.3v3.8M15.7 3.3v3.8M8 13.3h.01M12 13.3h.01M16 13.3h.01M8 16.6h.01M12 16.6h.01" />
    </>
  ),
  sortie: <path d="M5 4.5h14l-7 7.8Z M12 12.3v7.4M8.2 19.7h7.6M8.6 8.3h6.8" />,
  diner: <path d="M7.6 3.3h8.8c.3 5.2-1.6 8.3-4.4 8.3S7.3 8.5 7.6 3.3Z M12 11.6v8.1M8.4 19.7h7.2M7.9 6.6h8.2" />,
  quotidien: <path d="M5.2 8.3h13.6l-1 11.4H6.2Z M9 8.3V7a3 3 0 0 1 6 0v1.3" />,
  ceremonie: (
    <path d="M11 4c.6 4 2.6 6 6.6 6.6-4 .6-6 2.6-6.6 6.6-.6-4-2.6-6-6.6-6.6 4-.6 6-2.6 6.6-6.6Z M18.5 3.2v3.4M16.8 4.9h3.4M18 17.5v2.6M16.7 18.8h2.6" />
  ),
} as const;

const MOMENT: Record<Moment, { titre: string; icone: keyof typeof ICONES }> = {
  soir: { titre: 'Le soir', icone: 'lune' },
  jour: { titre: 'En journée', icone: 'soleil' },
  jourSoir: { titre: 'Jour & soir', icone: 'jourSoir' },
};
const SAISON: Record<Saison, { titre: string; icone: keyof typeof ICONES }> = {
  fraiche: { titre: 'Saison fraîche', icone: 'fraiche' },
  chaude: { titre: 'Saison chaude', icone: 'chaude' },
  annee: { titre: 'Toute l’année', icone: 'annee' },
};
const OCCASION: Record<Occasion, keyof typeof ICONES> = {
  sortie: 'sortie',
  diner: 'diner',
  quotidien: 'quotidien',
  ceremonie: 'ceremonie',
};

/** Les trois conseils, dans l'ordre moment → saison → occasion. */
export function conseils(p: Porter) {
  return [
    { cle: 'moment', ...MOMENT[p.moment], detail: p.momentDetail },
    { cle: 'saison', ...SAISON[p.saison], detail: p.saisonDetail },
    { cle: 'occasion', titre: p.occasion.titre, icone: OCCASION[p.occasion.icone], detail: p.occasion.detail },
  ];
}

export const IconePorter = ({ nom }: { nom: keyof typeof ICONES }) => <Trait>{ICONES[nom]}</Trait>;

/** Version fiche : trois blocs icône + titre + détail. */
export function QuandLePorter({ porter }: { porter: Porter }) {
  return (
    <section aria-labelledby="porter-titre" className="verre-carte verre-voile rounded-card p-5 md:p-7">
      <h2 id="porter-titre" className="label mb-4 text-sourdine">
        Quand le porter
      </h2>
      <ul className="grid gap-4 sm:grid-cols-3 sm:gap-0">
        {conseils(porter).map((c, i) => (
          <li
            key={c.cle}
            className={`flex items-start gap-3 sm:px-5 ${i ? 'border-t border-encre/10 pt-4 sm:border-l sm:border-t-0 sm:pt-0' : 'sm:pl-0'}`}
          >
            <span className="mt-0.5 h-7 w-7 shrink-0 text-rose-doux">
              <IconePorter nom={c.icone} />
            </span>
            <span>
              <span className="block font-medium text-encre">{c.titre}</span>
              <span className="block text-sm text-sourdine">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
