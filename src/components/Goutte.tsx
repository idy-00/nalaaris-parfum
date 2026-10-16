import { useRef } from 'react';
import { gsap, useGSAP, MQ } from '../lib/gsap';

/**
 * « La goutte » — signature en code.
 * Au défilement depuis le hero, une seule goutte se détache du monogramme Np (.np-depart),
 * tombe et touche le titre cible : deux ondes fines s'élargissent et s'effacent.
 * ScrollTrigger + scrub, transforms et opacité uniquement. Reduced-motion : goutte posée près du titre.
 *
 * Se place dans le conteneur commun (position: relative) au hero et à la section d'arrivée : c'est son parent direct.
 */
export function Goutte({ cible }: { cible: string }) {
  const calque = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Parent direct (et non un ref passé en prop : le ref du parent n'est pas encore attaché quand cet effet s'exécute)
      const z = calque.current?.parentElement;
      if (!z) return;
      const goutte = calque.current!.querySelector<SVGSVGElement>('.goutte')!;
      const ondes = calque.current!.querySelector<HTMLElement>('.ondes')!;

      const depart = () => {
        const visibles = [...z.querySelectorAll<SVGSVGElement>('.np-depart')].filter((el) => el.getBoundingClientRect().width > 0);
        const el = visibles[visibles.length - 1] ?? visibles[0];
        const r = el.getBoundingClientRect();
        const zr = z.getBoundingClientRect();
        // la goutte perle sous la diagonale du N
        return { x: r.left - zr.left + r.width * 0.5, y: r.top - zr.top + r.height * 0.82 };
      };
      const arrivee = () => {
        const el = z.querySelector<HTMLElement>(cible)!;
        const r = el.getBoundingClientRect();
        const zr = z.getBoundingClientRect();
        return { x: r.left - zr.left + Math.min(60, r.width * 0.12), y: r.top - zr.top - 6 };
      };

      gsap.set(goutte, { xPercent: -50, yPercent: -100, transformOrigin: '50% 100%' });
      gsap.set(ondes, { xPercent: -50, yPercent: -50 });

      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const titre = z.querySelector(cible);
        gsap
          .timeline({
            scrollTrigger: { trigger: titre, start: 'top bottom', end: 'top 38%', scrub: 0.6, invalidateOnRefresh: true },
          })
          // elle perle…
          .fromTo(
            goutte,
            { x: () => depart().x, y: () => depart().y, scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.12, ease: 'power2.out' },
          )
          // …s'étire légèrement et tombe (accélération)
          .to(goutte, { scaleY: 1.15, scaleX: 0.92, duration: 0.05 })
          .to(goutte, { x: () => arrivee().x, y: () => arrivee().y, duration: 0.7, ease: 'power2.in' })
          // impact : la goutte s'écrase et disparaît, deux ondes s'ouvrent
          .to(goutte, { scaleY: 0.4, scaleX: 1.5, opacity: 0, duration: 0.06, ease: 'power1.out' })
          .set(ondes, { x: () => arrivee().x, y: () => arrivee().y }, '<')
          .fromTo(
            ondes.children,
            { scale: 0.1, opacity: 0.9 },
            { scale: 1, opacity: 0, duration: 0.22, stagger: 0.07, ease: 'power2.out' },
            '<',
          );
      });
      mm.add(MQ.reduce, () => {
        // Pas de chute : la goutte est simplement posée près du titre
        gsap.set(goutte, { x: () => arrivee().x, y: () => arrivee().y - 4, opacity: 1, scale: 0.9 });
        gsap.set(ondes.children, { opacity: 0 });
      });
    },
    { scope: calque },
  );

  return (
    <div ref={calque} className="pointer-events-none absolute inset-0 z-[15] overflow-hidden" aria-hidden="true">
      <svg className="goutte absolute left-0 top-0 h-7 w-5 opacity-0 will-change-transform" viewBox="0 0 20 28">
        <defs>
          <radialGradient id="goutte-verre" cx="0.38" cy="0.62" r="0.7">
            <stop offset="0" stopColor="#F2C6D6" />
            <stop offset="0.45" stopColor="#DA0862" />
            <stop offset="1" stopColor="#4A0620" />
          </radialGradient>
        </defs>
        <path d="M10 1 C10 1 2 13 2 18.5 A8 8 0 0 0 18 18.5 C18 13 10 1 10 1 Z" fill="url(#goutte-verre)" />
        {/* reflet de verre */}
        <path d="M6.2 16.5 C6.2 14 7.6 11.6 8.6 10.3" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <circle cx="13.2" cy="21.5" r="1.1" fill="#fff" opacity="0.35" />
      </svg>
      <div className="ondes absolute left-0 top-0 h-28 w-56">
        <span className="absolute inset-0 rounded-[50%] border border-rose-logo/80 opacity-0" />
        <span className="absolute inset-0 rounded-[50%] border border-rose-brume/60 opacity-0" />
      </div>
    </div>
  );
}
