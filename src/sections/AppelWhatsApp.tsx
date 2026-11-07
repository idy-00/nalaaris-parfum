import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { IconeWhatsApp, ICONES_RESEAUX } from '../components/IconesReseaux';
import { ImageTheme } from '../components/ImageTheme';
import { buildWhatsAppLink, messageConseil } from '../lib/whatsapp';
import { contacts } from '../data/infos';
import { ROUTES } from '../lib/routes';
import { useReveal } from '../hooks/useReveal';
import { useReflet } from '../hooks/useReflet';

/** Bloc de fin de page : contact WhatsApp direct, réseaux, et renvoi vers le catalogue. */
export function AppelWhatsApp({ titre = 'Une question, une envie ?', catalogue = true }: { titre?: string; catalogue?: boolean }) {
  const root = useRef<HTMLElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  useReveal(root);
  useReflet(panneau, 12);

  return (
    <section ref={root} aria-labelledby="appel-titre" className="shell py-16 md:py-24">
      <div
        ref={panneau}
        data-reveal
        className="verre-rose relative grid items-center gap-10 overflow-hidden rounded-[32px] px-6 py-12 md:grid-cols-[1fr_auto] md:px-14 md:py-16"
      >
        <span className="reflet" aria-hidden="true" />
        <ImageTheme
          src="/media/gravure-vaporisateur.webp"
          alt=""
          width={900}
          height={960}
          loading="lazy"
          className="pointer-events-none absolute -right-10 bottom-0 hidden h-[115%] w-auto opacity-[0.12] lg:block"
          aria-hidden="true"
        />
        <div className="relative">
          <h2 id="appel-titre" className="text-[2.4rem] leading-[1.04] md:text-[3.25rem]">
            {titre}
          </h2>
          <p className="mt-4 max-w-lg text-lg text-encre/80">
            Écris-nous sur WhatsApp au <span className="whitespace-nowrap font-semibold text-encre">{contacts.telephoneAffiche}</span> : on
            te répond et on te conseille.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Réseaux sociaux">
            {contacts.reseaux.map((r) => {
              const Icone = ICONES_RESEAUX[r.id];
              return (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${r.label} ${r.handle}`}
                    className="grid h-11 w-11 place-items-center rounded-full border border-encre/20 text-encre transition-colors hover:border-rose-doux hover:text-rose-doux"
                  >
                    <Icone />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="relative flex flex-col gap-3 sm:flex-row md:flex-col">
          <a href={buildWhatsAppLink(messageConseil())} target="_blank" rel="noopener noreferrer" className="btn btn-rose">
            <IconeWhatsApp /> Écrire sur WhatsApp
          </a>
          {catalogue && (
            <Link to={ROUTES.catalogue} className="btn btn-trait bg-fond/30">
              Voir le catalogue <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
