import type { RefObject } from 'react';
import { gsap, useGSAP, MQ } from '../lib/gsap';

/**
 * Reflet de verre qui suit légèrement le pointeur (desktop uniquement, fixe sur mobile).
 * Anime les variables --rx/--ry lues par .reflet::before via gsap.quickTo (un seul tween réutilisé).
 */
export function useReflet(ref: RefObject<HTMLElement>, amplitude = 14) {
  useGSAP(
    (_ctx, contextSafe) => {
      const el = ref.current;
      if (!el || !contextSafe) return;
      const mm = gsap.matchMedia();
      mm.add(`${MQ.desktop} and ${MQ.motion}`, () => {
        const proxy = { x: -12, y: 0 };
        const apply = () => {
          el.style.setProperty('--rx', `${proxy.x}%`);
          el.style.setProperty('--ry', `${proxy.y}%`);
        };
        const xTo = gsap.quickTo(proxy, 'x', { duration: 0.6, ease: 'power3.out', onUpdate: apply });
        const yTo = gsap.quickTo(proxy, 'y', { duration: 0.6, ease: 'power3.out', onUpdate: apply });
        const move = contextSafe((e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          xTo(((e.clientX - r.left) / r.width - 0.5) * amplitude * 2 - 12);
          yTo(((e.clientY - r.top) / r.height - 0.5) * amplitude);
        });
        const leave = contextSafe(() => {
          xTo(-12);
          yTo(0);
        });
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        return () => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerleave', leave);
        };
      });
    },
    { scope: ref },
  );
}
