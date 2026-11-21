import { useRef } from 'react';
import { donneesD1 } from '../data/parfums';
import { useReveal } from '../hooks/useReveal';

/**
 * Avis clients réels, publiés depuis l'admin avec l'accord de chaque cliente (jamais inventés).
 * Affichés seulement à partir de 3 avis : en dessous, la section n'existe pas.
 */
const AVIS = donneesD1?.avis ?? [];
export const MIN_AVIS = 3;

const dateCourte = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'Africa/Dakar' });

export function Avis({ numero }: { numero?: string }) {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  if (AVIS.length < MIN_AVIS) return null;
  return (
    <section ref={root} aria-labelledby="avis-titre" className="shell py-16 md:py-24">
      <div data-reveal className="mb-10 max-w-2xl">
        <p className="repere mb-4">{numero ? `${numero} · ` : ''}Elles et ils en parlent</p>
        <h2 id="avis-titre" className="text-[2.6rem] leading-[1.02] md:text-5xl">
          Ce que disent nos <em className="text-rose-doux">client·es</em>
        </h2>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AVIS.slice(0, 6).map((a, i) => (
          <li key={i} data-reveal className="verre-carte flex flex-col gap-4 rounded-card p-6">
            {a.note ? (
              <p className="text-rose-doux" aria-label={`Note : ${a.note} sur 5`}>
                <span aria-hidden="true">{'★'.repeat(a.note)}{'☆'.repeat(5 - a.note)}</span>
              </p>
            ) : null}
            <blockquote className="font-serif text-xl leading-snug text-encre">« {a.texte} »</blockquote>
            <p className="mt-auto text-sm text-sourdine">
              {a.prenom}
              {a.ville ? `, ${a.ville}` : ''} · {dateCourte(a.date)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
