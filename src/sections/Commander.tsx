import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { etapesCommande } from '../data/infos';
import { useReveal } from '../hooks/useReveal';
import { ROUTES } from '../lib/routes';

/** Comment commander : 3 étapes. `lienInfos` ajoute un renvoi vers la page Commander (accueil). */
export function Commander({ numero, lienInfos = false, enPage = false }: { numero?: string; lienInfos?: boolean; enPage?: boolean }) {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section ref={root} id="comment-commander" aria-labelledby="commander-titre" className="shell py-16 md:py-24">
      <div data-reveal className="mb-10 flex flex-col justify-between gap-6 md:mb-14 lg:flex-row lg:items-end">
        <div>
          <p className="repere mb-4" data-n={numero}>
            Comment commander
          </p>
          <h2 id="commander-titre" className="text-[2.6rem] leading-[1.02] md:text-5xl">
            {enPage ? (
              <>
                Les trois <em className="text-rose-doux">étapes</em>
              </>
            ) : (
              <>
                Commander, c’est <em className="text-rose-doux">simple</em>
              </>
            )}
          </h2>
        </div>
        {lienInfos && (
          <Link to={ROUTES.commander} className="btn btn-trait self-start lg:self-auto">
            Livraison, paiement, questions
            <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
          </Link>
        )}
      </div>
      <ol className="grid gap-4 md:grid-cols-3 md:gap-5">
        {etapesCommande.map((e, i) => (
          <li key={e.n} data-reveal className="verre-carte rounded-card p-6 md:p-8">
            <span className="font-serif text-5xl italic text-rose-doux md:text-[4rem]" aria-hidden="true">
              {e.n}
            </span>
            <h3 className="mt-4 font-sans text-lg font-semibold">
              <span className="sr-only">Étape {i + 1} : </span>
              {e.titre}
            </h3>
            <p className="mt-2 text-encre/80">{e.texte}</p>
            {i < etapesCommande.length - 1 && (
              <span className="filet absolute -right-4 top-1/2 hidden w-8 md:block" aria-hidden="true" />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
