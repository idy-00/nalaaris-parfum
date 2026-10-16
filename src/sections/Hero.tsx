import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ShieldCheck, Truck } from 'lucide-react';
import { Monogramme } from '../components/Monogramme';
import { IconeWhatsApp } from '../components/IconesReseaux';
import { VideoFond } from '../components/VideoFond';
import { buildWhatsAppLink, messageConseil } from '../lib/whatsapp';
import { gsap, useGSAP, SplitText, MQ } from '../lib/gsap';
import { useReflet } from '../hooks/useReflet';
import { marque } from '../data/infos';
import { ROUTES } from '../lib/routes';

/** Réfraction « liquid glass » : Chromium seulement (détection JS — @supports ment sur Firefox). */
function estChromium() {
  const uaData = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData;
  return !!uaData?.brands?.some((b) => /Chromium/i.test(b.brand));
}

const ASSURANCES = [
  { Icone: ShieldCheck, court: 'Authentiques', long: '100 % authentiques' },
  { Icone: Truck, court: 'Livré à Dakar', long: 'Livraison dans tout Dakar' },
  { Icone: IconeWhatsApp, court: 'Via WhatsApp', long: 'Commande et conseil sur WhatsApp' },
];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const panneau = useRef<HTMLDivElement>(null);
  const [liquide, setLiquide] = useState(false);
  useReflet(panneau, 18);

  useEffect(() => {
    const reduit =
      window.matchMedia('(prefers-reduced-transparency: reduce)').matches ||
      window.matchMedia('(prefers-contrast: more)').matches;
    setLiquide(estChromium() && !reduit);
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.from('.video-voile', { opacity: 1, duration: 1.6, ease: 'power2.out' }, 0)
          .from('.np-trait', { drawSVG: 0, duration: 1.2, stagger: 0.08, ease: 'power2.inOut' }, 0)
          .from('.np-remplissage', { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.9)
          .from('.hero-panneau', { opacity: 0, y: 28, duration: 1.1 }, 0.1)
          .from('.hero-sur', { opacity: 0, y: 12, duration: 0.6 }, 0.35)
          .from('.hero-sous', { opacity: 0, y: 12, duration: 0.7 }, 0.85)
          .from('.hero-cta > *', { opacity: 0, y: 16, duration: 0.7, stagger: 0.08 }, 0.95)
          .from('.hero-fin', { opacity: 0, duration: 0.8 }, 1.2)
          .from('.assurance', { opacity: 0, y: 12, duration: 0.7, stagger: 0.08 }, 1.1);

        // Titre révélé ligne par ligne derrière un masque
        SplitText.create('.hero-titre', {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, { yPercent: 110, duration: 1.05, stagger: 0.1, ease: 'expo.out', delay: 0.4 }),
        });

        // En quittant le hero : la fumée s'approche, le contenu s'efface doucement (transform + opacity)
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.6 } })
          .to('.video-fond', { scale: 1.12, yPercent: 6, ease: 'none' }, 0)
          .to('.hero-contenu', { yPercent: -8, opacity: 0.25, ease: 'none' }, 0);
      });

      mm.add(MQ.reduce, () => {
        gsap.from('.hero-panneau', { opacity: 0, duration: 0.4 });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-labelledby="hero-titre" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      {/* Fond : vidéo de fumée + voiles de lisibilité */}
      <VideoFond declencheur={root} />
      <div className="video-voile pointer-events-none absolute inset-0 bg-noir opacity-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,10,12,0.85)_0%,rgba(11,10,12,0.35)_55%,rgba(11,10,12,0.1)_100%)] max-lg:bg-noir/45"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-noir to-transparent" aria-hidden="true" />

      {/* Filtre de réfraction (utilisé seulement si `liquide`) */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="liquide" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="1" seed="7" result="bruit" />
          <feGaussianBlur in="bruit" stdDeviation="6" result="doux" />
          <feDisplacementMap in="SourceGraphic" in2="doux" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="hero-contenu shell relative grid flex-1 items-center gap-10 pb-8 pt-28 md:pt-32 lg:grid-cols-[1.3fr_0.7fr] lg:gap-16">
        <div
          ref={panneau}
          className="hero-panneau verre-rose relative overflow-hidden rounded-[28px] px-6 pb-8 pt-8 sm:px-10 md:rounded-[36px] md:px-14 md:pb-14 md:pt-14"
          style={
            liquide
              ? {
                  backdropFilter: 'url(#liquide) blur(14px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(14px) saturate(160%)',
                }
              : undefined
          }
        >
          <span className="reflet" aria-hidden="true" />
          <Monogramme className="mb-6 h-14 w-auto text-rose-vif lg:hidden" title="" />
          <p className="hero-sur label mb-6 flex items-center gap-3 text-rose-brume">
            <span className="h-px w-8 bg-rose-doux" aria-hidden="true" />
            Parfumerie · {marque.ville}
          </p>
          <h1 id="hero-titre" className="hero-titre text-[2.7rem] leading-[1] sm:text-[3.4rem] md:text-[4.5rem] xl:text-[5rem]">
            Un parfum, c’est ce qui reste <em className="text-rose-doux">quand tu pars.</em>
          </h1>
          <p className="hero-sous mt-7 max-w-md text-lg text-ivoire/85">Parfums authentiques pour elle et lui, à Dakar.</p>
          <div className="hero-cta mt-10 flex flex-col gap-3 sm:flex-row">
            <Link to={ROUTES.catalogue} className="btn btn-rose">
              Découvrir la sélection
              <ArrowDown size={18} strokeWidth={1.5} aria-hidden="true" />
            </Link>
            <a href={buildWhatsAppLink(messageConseil())} target="_blank" rel="noopener noreferrer" className="btn btn-trait bg-noir/30">
              <IconeWhatsApp /> Écrire sur WhatsApp
            </a>
          </div>
        </div>

        <div className="relative hidden flex-col items-center gap-8 lg:flex">
          <Monogramme className="h-auto w-full max-w-[320px] text-rose-vif drop-shadow-[0_0_50px_rgba(168,18,79,0.6)]" title="" />
          <div className="hero-fin text-center">
            <p className="label text-ivoire">Nal’Aaris Perfumes</p>
            <p className="mt-2 font-serif text-xl italic text-rose-brume">by Yannick &amp; Laetitia</p>
          </div>
        </div>
      </div>

      {/* Assurances */}
      <div className="shell relative pb-6 md:pb-10">
        <ul className="verre-fume grid grid-cols-3 divide-x divide-white/10 rounded-2xl py-3 md:rounded-full md:py-4">
          {ASSURANCES.map(({ Icone, court, long }) => (
            <li key={court} className="assurance flex flex-col items-center gap-1.5 px-2 text-center md:flex-row md:justify-center md:gap-3">
              <Icone width={20} height={20} strokeWidth={1.5} className="shrink-0 text-rose-doux" aria-hidden="true" />
              <span className="text-[0.8125rem] font-medium leading-tight text-ivoire/90 md:hidden">{court}</span>
              <span className="hidden text-sm font-medium text-ivoire/90 md:inline">{long}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
