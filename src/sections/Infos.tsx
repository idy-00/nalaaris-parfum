import { useRef } from 'react';
import { Banknote, HandHeart, ShieldCheck, Truck } from 'lucide-react';
import { infosPratiques } from '../data/infos';
import { useReveal } from '../hooks/useReveal';
import { buildWhatsAppLink, messageConseil } from '../lib/whatsapp';
import { IconeWhatsApp } from '../components/IconesReseaux';

const ICONES = { livraison: Truck, paiement: Banknote, conseil: HandHeart, authenticite: ShieldCheck } as const;

/** Infos pratiques : livraison, paiement, conseil, authenticité (le détail se règle sur WhatsApp). */
export function Infos({ numero }: { numero?: string }) {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section ref={root} id="infos" aria-labelledby="infos-titre" className="shell py-16 md:py-24">
      <div data-reveal className="mb-10 flex flex-col justify-between gap-6 md:mb-14 md:flex-row md:items-end">
        <div>
          <p className="repere mb-4" data-n={numero}>Infos pratiques</p>
          <h2 id="infos-titre" className="text-[2.6rem] leading-[1.02] md:text-5xl">
            Tout ce qu’il faut <em className="text-rose-doux">savoir</em>
          </h2>
        </div>
        <a href={buildWhatsAppLink(messageConseil())} target="_blank" rel="noopener noreferrer" className="btn btn-verre self-start">
          <IconeWhatsApp /> Une question ? WhatsApp
        </a>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {infosPratiques.map((b) => {
          const Icone = ICONES[b.id as keyof typeof ICONES] ?? ShieldCheck;
          return (
            <li key={b.id} data-reveal className="verre-carte verre-voile rounded-card p-6">
              <Icone size={24} strokeWidth={1.5} className="text-rose-doux" aria-hidden="true" />
              <h3 className="mt-5 font-serif text-2xl">{b.titre}</h3>
              <ul className="mt-3 space-y-2 text-encre/85">
                {b.lignes.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
