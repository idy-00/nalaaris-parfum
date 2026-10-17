import { useRef } from 'react';
import { Plus } from 'lucide-react';
import { faq } from '../data/infos';
import { useReveal } from '../hooks/useReveal';

/** Questions fréquentes : accordéon natif <details> (clavier et lecteurs d'écran sans JS). */
export function Faq() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section ref={root} id="questions" aria-labelledby="faq-titre" className="shell py-16 md:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div data-reveal className="lg:sticky lg:top-32 lg:self-start">
          <p className="repere mb-4">Questions</p>
          <h2 id="faq-titre" className="text-[2.6rem] leading-[1.02] md:text-5xl">
            Tu te <em className="text-rose-doux">demandes</em>…
          </h2>
          <p className="mt-6 max-w-sm text-encre/75">Les réponses aux questions qu’on nous pose le plus souvent.</p>
        </div>
        <ul className="border-t border-encre/10">
          {faq.map((f) => (
            <li key={f.q} data-reveal className="border-b border-encre/10">
              <details className="group">
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-5 text-left font-serif text-xl leading-snug text-encre transition-colors hover:text-rose-brume md:text-2xl [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-encre/20 text-rose-doux transition-transform duration-300 group-open:rotate-45"
                    aria-hidden="true"
                  >
                    <Plus size={18} strokeWidth={1.5} />
                  </span>
                </summary>
                <div className="pb-6 pr-14 text-encre/80">
                  <p>{f.r}</p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
