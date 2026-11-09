import type { Moment, Porter, Saison } from '../data/parfums';
import { IconePorter, type NomIcone } from './IconePorter';

const MOMENT: Record<Moment, { titre: string; icone: NomIcone }> = {
  jour: { titre: 'En journée', icone: 'soleil' },
  soir: { titre: 'Le soir', icone: 'lune' },
  jourSoir: { titre: 'Jour & soir', icone: 'jourSoir' },
};

const SAISON: Record<Saison, { titre: string; icone: NomIcone }> = {
  fraiche: { titre: 'Saison fraîche', icone: 'fraiche' },
  chaude: { titre: 'Saison chaude', icone: 'chaude' },
  annee: { titre: 'Toute l’année', icone: 'annee' },
};

/** Les trois conseils, dans l'ordre moment → saison → occasion. */
export function conseils(p: Porter) {
  return [
    { cle: 'moment', ...MOMENT[p.moment], detail: p.momentDetail },
    { cle: 'saison', ...SAISON[p.saison], detail: p.saisonDetail },
    { cle: 'occasion', titre: p.occasion.titre, icone: p.occasion.icone as NomIcone, detail: p.occasion.detail },
  ];
}

/** Fiche : trois cartes icône + titre + détail (côte à côte dès 640 px, empilées en dessous). Texte HTML, jamais en image. */
export function QuandLePorter({ porter }: { porter: Porter }) {
  return (
    <section aria-labelledby="porter-titre" className="porter">
      <h2 id="porter-titre" className="label mb-3 text-sourdine">
        Quand le porter
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {conseils(porter).map((c) => (
          <li key={c.cle} className="porter-carte verre-carte flex items-start gap-3 rounded-2xl p-4 sm:flex-col sm:gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-rose-doux/30 text-rose-doux">
              <IconePorter nom={c.icone} />
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]">
              <span className="block font-medium leading-snug text-encre">{c.titre}</span>
              <span className="mt-0.5 block text-sm text-encre/75">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
