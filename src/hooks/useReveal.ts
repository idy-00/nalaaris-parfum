import type { RefObject } from 'react';
import { gsap, useGSAP, MQ, sousLaLigne } from '../lib/gsap';

/**
 * Révélation légère au défilement : opacity + y: 24px, une seule fois.
 * Cible les éléments [data-reveal] du conteneur ; rien ne bouge si « réduire les animations ».
 * Au premier chargement, ce qui est déjà à l'écran n'est jamais masqué.
 */
export function useReveal(ref: RefObject<HTMLElement>) {
  useGSAP(
    (_ctx, _safe, { tardif }) => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.utils.toArray<HTMLElement>('[data-reveal]').filter((el) => !tardif || sousLaLigne(el)).forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 24,
            duration: 0.9,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
        });
      });
    },
    { scope: ref },
  );
}
