import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { Monogramme } from '../components/Monogramme';
import { IconeWhatsApp } from '../components/IconesReseaux';
import { VideoFond } from '../components/VideoFond';
import { buildWhatsAppLink, messageConseil } from '../lib/whatsapp';
import { gsap, useGSAP, SplitText, MQ } from '../lib/gsap';
import { introAutorisee, introTerminee } from '../lib/intro';
import { useReflet } from '../hooks/useReflet';
import { marque } from '../data/infos';
import { ROUTES } from '../lib/routes';

const ASSURANCES = [
  { Icone: ShieldCheck, court: 'Authentiques', long: '100 % authentiques' },
  { Icone: Truck, court: 'Livré à Dakar', long: 'Livraison à Dakar' },
  { Icone: IconeWhatsApp, court: 'Via WhatsApp', long: 'Commande et conseil sur WhatsApp' },
];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  useReflet(panneau, 18);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      // Intro seulement si GSAP arrive à temps ; sinon le texte est déjà affiché (voir index.html) et on ne le cache plus
      const intro = introAutorisee();

      mm.add(MQ.motion, () => {
        if (intro) {
          // Contenu lisible en ~1 s
          const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
          tl.from('.hero-sur', { opacity: 0, y: 10, duration: 0.5 }, 0)
            .from('.hero-sous', { opacity: 0, y: 10, duration: 0.55 }, 0.35)
            .from('.hero-cta > *', { opacity: 0, y: 12, duration: 0.55, stagger: 0.06 }, 0.45)
            .from('.assurance', { opacity: 0, y: 10, duration: 0.5, stagger: 0.05 }, 0.55);
          SplitText.create('.hero-titre', {
            type: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 0.8, stagger: 0.08, ease: 'expo.out', delay: 0.05 }),
          });
        }
        // Décor (jamais bloquant pour la lecture) : le monogramme se trace
        gsap.from('.np-trait', { drawSVG: 0, duration: 1.2, stagger: 0.08, ease: 'power2.inOut' });
        gsap.from('.np-remplissage', { opacity: 0, duration: 0.6, delay: 0.8 });

        // En quittant le hero : la vidéo s'approche, le contenu s'efface doucement (transform + opacity)
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 } })
          .to('.video-calque', { scale: 1.1, yPercent: 5, ease: 'none' }, 0)
          .to('.hero-contenu', { yPercent: -6, opacity: 0.3, ease: 'none' }, 0);
      });

      introTerminee();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      aria-labelledby="hero-titre"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* Fond plein écran : le geste du parfum + voile de lisibilité léger (la vidéo reste visible partout) */}
      <VideoFond />
      {/* Desktop : voile de gauche à droite derrière le panneau. Mobile : voile qui s'épaissit sous le texte, sans masquer la vidéo */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.25)_35%,rgba(255,255,255,0.55)_65%,rgba(255,255,255,0.65)_100%)] md:bg-[linear-gradient(90deg,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0.05)_100%)] dark:bg-[linear-gradient(180deg,rgba(11,10,12,0.3)_0%,rgba(11,10,12,0.3)_35%,rgba(11,10,12,0.6)_65%,rgba(11,10,12,0.7)_100%)] dark:md:bg-[linear-gradient(90deg,rgba(11,10,12,0.85)_0%,rgba(11,10,12,0.5)_50%,rgba(11,10,12,0.12)_100%)]"
        aria-hidden="true"
      />
      {/* Raccord court avec la section suivante */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-fond to-transparent" aria-hidden="true" />

      <div className="hero-contenu shell relative grid flex-1 items-end gap-10 pb-5 pt-24 md:items-center md:pb-8 md:pt-32 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16">
        <div
          ref={panneau}
          className="hero-panneau relative overflow-hidden md:verre-fume md:rounded-[36px] md:bg-[rgba(255,255,255,0.6)] dark:md:bg-[rgba(11,10,12,0.62)] md:px-14 md:pb-14 md:pt-14"
        >
          <span className="reflet hidden md:block" aria-hidden="true" />
          <Monogramme className="hero-np np-depart mb-5 h-12 w-auto text-rose-logo lg:hidden" title="" />
          <p data-intro className="hero-sur label mb-5 flex items-center gap-3 text-rose-brume">
            <span className="h-px w-8 bg-rose-logo" aria-hidden="true" />
            Parfumerie · {marque.ville}
          </p>
          <h1
            id="hero-titre"
            data-intro
            className="hero-titre text-[2.45rem] leading-[1] min-[400px]:text-[2.7rem] sm:text-[3.4rem] md:text-[4.5rem] xl:text-[5rem]"
          >
            Un parfum, c’est ce qui reste <em className="text-rose-doux">quand tu pars.</em>
          </h1>
          <p data-intro className="hero-sous mt-5 max-w-md text-lg text-encre/85 md:mt-7">
            Parfums authentiques pour elle et lui, à Dakar.
          </p>
          <div className="hero-cta mt-7 flex flex-col gap-3 min-[560px]:flex-row md:mt-10">
            <Link data-intro to={ROUTES.catalogue} className="btn btn-rose">
              Découvrir la sélection
              <ArrowRight size={18} strokeWidth={1.5} aria-hidden="true" />
            </Link>
            <a
              data-intro
              href={buildWhatsAppLink(messageConseil())}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-trait bg-fond/30"
            >
              <IconeWhatsApp /> Écrire sur WhatsApp
            </a>
          </div>
        </div>

        <div className="relative hidden flex-col items-center gap-8 lg:flex">
          <Monogramme
            className="hero-np np-depart h-auto w-full max-w-[300px] text-rose-logo drop-shadow-[0_0_36px_rgba(218,8,98,0.22)] dark:drop-shadow-[0_0_40px_rgba(218,8,98,0.45)]"
            title=""
          />
          <div className="text-center">
            <p className="label text-encre">Nal’Aaris Perfumes</p>
            <p className="mt-2 font-serif text-xl italic text-rose-brume">by Yannick &amp; Laetitia</p>
          </div>
        </div>
      </div>

      {/* Assurances */}
      <div className="shell relative pb-5 md:pb-10">
        <ul className="verre-fume grid grid-cols-3 divide-x divide-encre/10 rounded-2xl py-3 md:rounded-full md:py-4">
          {ASSURANCES.map(({ Icone, court, long }) => (
            <li
              key={court}
              data-intro
              className="assurance flex flex-col items-center gap-1.5 px-2 text-center md:flex-row md:justify-center md:gap-3"
            >
              <Icone width={20} height={20} strokeWidth={1.5} className="shrink-0 text-rose-doux" aria-hidden="true" />
              <span className="text-[0.8125rem] font-medium leading-tight text-encre/90 md:hidden">{court}</span>
              <span className="hidden text-sm font-medium text-encre/90 md:inline">{long}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
