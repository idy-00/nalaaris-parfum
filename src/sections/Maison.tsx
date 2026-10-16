import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, HandHeart, ShieldCheck, Truck } from 'lucide-react';
import { ROUTES } from '../lib/routes';
import { marque } from '../data/infos';
import { Photo } from '../components/Photo';
import { IconeWhatsApp } from '../components/IconesReseaux';
import { buildWhatsAppLink, messageConseil } from '../lib/whatsapp';
import { gsap, useGSAP, MQ } from '../lib/gsap';

const ENGAGEMENTS = [
  { Icone: ShieldCheck, titre: 'Authentiques, toujours', texte: 'Chaque flacon vient d’une source sûre. Pas de copie, pas de surprise.' },
  { Icone: HandHeart, titre: 'Conseillés, pas vendus à l’aveugle', texte: 'On te pose deux ou trois questions et on te propose ce qui te ressemble.' },
  { Icone: Truck, titre: 'Livrés chez toi', texte: 'À Dakar. Le quartier, le tarif et le délai sont confirmés avec toi sur WhatsApp avant que tu valides.' },
];

/** La maison : histoire courte, photo + gravure, engagements. `apercu` : version courte pour l'accueil. */
export function Maison({ numero, apercu = false }: { numero?: string; apercu?: boolean }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.from('.maison-texte > *', {
          opacity: 0,
          y: 24,
          stagger: 0.08,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: { trigger: '.maison-texte', start: 'top 80%', once: true },
        });
        gsap.from('.maison-photo', {
          opacity: 0,
          y: 40,
          duration: 1.2,
          ease: 'expo.out',
          scrollTrigger: { trigger: '.maison-photo', start: 'top 85%', once: true },
        });
        // Parallaxe douce : la photo et la gravure glissent à des vitesses différentes
        gsap.to('.maison-photo img', {
          yPercent: -8,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
        });
        gsap.fromTo(
          '.maison-gravure',
          { yPercent: 12 },
          { yPercent: -12, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 } },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="maison" aria-labelledby="maison-titre" className="relative overflow-hidden py-20 md:py-32">
      <div className="shell grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        {/* Visuels */}
        <div className="relative mx-auto w-full max-w-[520px] pb-16 pr-10 sm:pr-16 lg:mx-0">
          <div className="maison-photo relative aspect-[4/5] overflow-hidden rounded-[28px] ring-1 ring-white/10">
            {marque.photoDuo ? (
              // Photo de Yannick & Laetitia (couleurs naturelles, pas de duotone)
              <img
                src={marque.photoDuo}
                alt="Yannick et Laetitia, fondateurs de Nal’Aaris Perfumes"
                width={1100}
                height={1375}
                loading="lazy"
                decoding="async"
                className="photo absolute inset-0 h-[115%]"
              />
            ) : (
              <Photo
                nom="univers-bouquet"
                largeurs={[640, 1100]}
                ratio={4 / 5}
                sizes="(min-width: 1024px) 480px, 90vw"
                alt="Bouquet de roses roses, enveloppé dans un papier sombre"
                className="absolute inset-0 h-[115%]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-noir/50 to-transparent" />
          </div>
          <div className="maison-gravure verre-carte absolute -bottom-2 right-0 w-[52%] overflow-hidden rounded-[22px] bg-noir/90 p-4 shadow-douce sm:p-5">
            <img
              src="/media/gravure-vaporisateur.webp"
              alt="Gravure ancienne : une femme se parfume avec un vaporisateur"
              width={900}
              height={960}
              loading="lazy"
              decoding="async"
              className="h-auto w-full"
            />
          </div>
        </div>

        {/* Texte */}
        <div className="maison-texte">
          <p className="repere mb-4" data-n={numero}>
            La maison
          </p>
          <h2 id="maison-titre" className="text-[2.6rem] leading-[1.02] md:text-5xl">
            Yannick <em className="text-rose-doux">&amp;</em> Laetitia
          </h2>
          {apercu ? (
            // Accueil : une accroche courte, l'histoire complète reste sur /la-maison
            <p className="mt-7 max-w-lg text-lg text-ivoire/85">
              Deux passionnés, une sélection courte et des conseils sincères. Derrière chaque flacon, il y a quelqu’un qui l’a porté
              avant toi.
            </p>
          ) : (
            <>
              <p className="mt-7 max-w-lg text-lg text-ivoire/85">
                Nal’Aaris, c’est une sélection de parfums authentiques, choisis un par un à Dakar. On les porte, on les compare, et on te
                dit franchement ce qu’on en pense.
              </p>
              <p className="mt-4 max-w-lg text-ivoire/70">
                Parce qu’un parfum se choisit mieux en parlant qu’en cliquant, tout se passe sur WhatsApp, simplement.
              </p>
            </>
          )}

          {apercu ? (
            <Link to={ROUTES.maison} className="btn btn-trait mt-10">
              Découvrir la maison
              <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          ) : (
            <>
              <ul className="mt-10 space-y-6 border-t border-white/10 pt-8">
                {ENGAGEMENTS.map(({ Icone, titre, texte }) => (
                  <li key={titre} className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-rose-doux/30 text-rose-doux">
                      <Icone size={20} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-sans text-base font-semibold">{titre}</h3>
                      <p className="mt-1 text-ivoire/70">{texte}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <a
                href={buildWhatsAppLink(messageConseil())}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-rose mt-10"
              >
                <IconeWhatsApp /> Demander un conseil
              </a>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
