/**
 * Le vrai moteur GSAP et ses plugins. Jamais importé directement : `lib/gsap.ts` le charge
 * après le premier affichage (import dynamique), pour qu'il ne pèse pas sur le rendu initial.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, Flip);
gsap.defaults({ ease: 'power3.out', duration: 0.8 });

export { gsap, ScrollTrigger, SplitText, Flip };
