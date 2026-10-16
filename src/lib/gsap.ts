/**
 * GSAP — enregistrement unique des plugins. Importer gsap depuis ce module partout.
 * GSAP est la seule librairie d'animation du projet.
 */
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin, Flip);

gsap.defaults({ ease: 'power3.out', duration: 0.8 });

/** Rythme commun : lent à entrer, rapide à répondre. */
export const MOTION = {
  entree: 0.8,
  interaction: 0.28,
  easeEntree: 'expo.out',
  ease: 'power3.out',
} as const;

/** Conditions partagées pour gsap.matchMedia(). */
export const MQ = {
  motion: '(prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
  desktop: '(hover: hover) and (pointer: fine)',
} as const;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia(MQ.reduce).matches;

export { gsap, useGSAP, ScrollTrigger, SplitText, Flip };
