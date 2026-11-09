/**
 * GSAP — point d'entrée unique du projet (seule librairie d'animation).
 *
 * Le moteur (lib/gsap-moteur.ts) est chargé APRÈS le premier affichage : à l'événement load,
 * pendant un moment calme du navigateur, ou dès la première interaction. Le texte et les images
 * sont donc visibles depuis le HTML pré-rendu, sans attendre le JavaScript d'animation.
 *
 * - `gsap`, `ScrollTrigger`, `SplitText`, `Flip` sont des liaisons vivantes : avant le chargement,
 *   elles pointent vers un objet neutre (tout appel ne fait rien), ensuite vers le vrai moteur.
 * - `useGSAP` reprend l'API de @gsap/react, mais n'exécute son effet qu'une fois le moteur prêt.
 *   Il passe en 3e argument `{ tardif }` : true si le composant était déjà affiché avant l'arrivée
 *   de GSAP (premier chargement). Dans ce cas, on ne rejoue pas d'entrée sur le contenu déjà visible.
 * - `differe: true` (sections sous la ligne de flottaison) : le rappel n'est exécuté qu'à l'approche de la section
 *   (IntersectionObserver, une demi-hauteur d'écran avant). Ses ScrollTrigger / SplitText ne coûtent rien au chargement.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from 'react';
import type { gsap as GsapMoteur } from 'gsap';
import type * as Moteur from './gsap-moteur';

type Gsap = typeof GsapMoteur;

// Objet neutre : toute propriété ou tout appel le renvoie, rien ne se passe (chaînage sans erreur)
const neutre: any = new Proxy(function () {}, {
  get: (_c, cle) => (cle === 'then' ? undefined : cle === Symbol.toPrimitive ? () => 0 : neutre),
  apply: () => neutre,
  construct: () => neutre,
});

export let gsap: Gsap = neutre;
export let ScrollTrigger: typeof Moteur.ScrollTrigger = neutre;
export let SplitText: typeof Moteur.SplitText = neutre;
export let Flip: typeof Moteur.Flip = neutre;

let pret = false;
let chargement: Promise<void> | null = null;
const abonnes = new Set<() => void>();

export const gsapPret = () => pret;

/** Charge le moteur (une seule fois). */
export function chargerGsap() {
  chargement ??= import('./gsap-moteur')
    .then((m) => {
      gsap = m.gsap;
      ScrollTrigger = m.ScrollTrigger;
      SplitText = m.SplitText;
      Flip = m.Flip;
      pret = true;
      abonnes.forEach((f) => f());
    })
    .catch((e) => {
      chargement = null; // nouvel essai possible à la prochaine interaction
      console.error(e);
    });
  return chargement;
}

/** Après le premier affichage : load puis moment calme ; ou tout de suite si le visiteur interagit. */
export function planifierGsap() {
  const charger = () => void chargerGsap();
  const auCalme = () =>
    'requestIdleCallback' in window ? window.requestIdleCallback(charger, { timeout: 2500 }) : setTimeout(charger, 300);
  if (document.readyState === 'complete') auCalme();
  else window.addEventListener('load', auCalme, { once: true });
  for (const t of ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const) {
    window.addEventListener(t, charger, { once: true, passive: true });
  }
}

const abonner = (f: () => void) => {
  abonnes.add(f);
  return () => abonnes.delete(f);
};
const usePret = () => useSyncExternalStore(abonner, gsapPret, () => false);

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

/** Élément entièrement sous le bas de l'écran : on peut le masquer pour le révéler au défilement. */
export const sousLaLigne = (el: Element) => el.getBoundingClientRect().top >= window.innerHeight;

type ContextSafe = <F extends (...args: any[]) => any>(fn: F) => F;
type Rappel = (context: gsap.Context, contextSafe: ContextSafe, etat: { tardif: boolean }) => unknown;
interface Config {
  scope?: RefObject<Element | null>;
  dependencies?: unknown[];
  /** N'initialiser qu'à l'approche du `scope` (sections sous la ligne de flottaison). Jamais pour un élément masqué (display: none). */
  differe?: boolean;
}

/** Vrai dès que l'élément approche de l'écran (une demi-hauteur avant), puis reste vrai. */
function useApproche(ref: RefObject<Element | null> | undefined, actif: boolean) {
  const [vu, setVu] = useState(!actif);
  useEffect(() => {
    const el = ref?.current;
    if (vu || !el) return;
    if (!('IntersectionObserver' in window)) return setVu(true);
    const io = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          io.disconnect();
          setVu(true);
        }
      },
      { rootMargin: '0px 0px 50% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [vu, ref]);
  return vu;
}

const useEffetIso = typeof document === 'undefined' ? useEffect : useLayoutEffect;

export function useGSAP(a?: Rappel | Config, b?: Config) {
  const rappel = typeof a === 'function' ? a : undefined;
  const config = (typeof a === 'function' ? b : a) ?? {};
  const dependances = config.dependencies ?? [];

  const moteurPret = usePret();
  const proche = useApproche(config.scope, Boolean(config.differe && rappel));
  const tardif = useRef(!pret); // lu au premier rendu
  const ctx = useRef<gsap.Context | null>(null);
  const rappelCourant = useRef(rappel);
  rappelCourant.current = rappel;

  // Fonction sûre pour les gestionnaires d'événements : rangée dans le contexte, sans effet tant que GSAP n'est pas là
  const contextSafe = useCallback(
    ((fn: (...args: any[]) => any) =>
      (...args: any[]) => {
        let r: unknown;
        ctx.current?.add(() => {
          r = fn(...args);
        });
        return r;
      }) as ContextSafe,
    [],
  );

  // Un contexte par composant, annulé au démontage
  useEffetIso(() => {
    if (!moteurPret) return;
    const c = gsap.context(() => {}, config.scope as never);
    ctx.current = c;
    return () => {
      c.revert();
      ctx.current = null;
    };
  }, [moteurPret]);

  // Le rappel : au chargement du moteur (et à l'approche si `differe`), puis à chaque changement de dépendance
  useEffetIso(() => {
    const c = ctx.current;
    if (!moteurPret || !proche || !c || !rappelCourant.current) return;
    c.add(() => rappelCourant.current!(c, contextSafe, { tardif: tardif.current }));
  }, [moteurPret, proche, ...dependances]);

  return { context: ctx.current, contextSafe };
}
