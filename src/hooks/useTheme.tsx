import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { gsap, prefersReducedMotion } from '../lib/gsap';
import { appliquerTheme, lireTheme, type Theme } from '../lib/theme';

/** `pret` : le thème réel est connu (après l'hydratation) — les photos étalonnées attendent ce moment pour charger la bonne version. */
const ThemeCtx = createContext<{ theme: Theme; pret: boolean; basculer: () => void }>({ theme: 'clair', pret: false, basculer: () => {} });

// useLayoutEffect côté client (thème lu avant l'affichage), sans avertissement au pré-rendu
const useLayoutIso = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Premier rendu identique au HTML pré-rendu ; le thème réel (posé par index.html) est lu juste après
  const [theme, setTheme] = useState<Theme>('clair');
  const [pret, setPret] = useState(false);
  useLayoutIso(() => {
    setTheme(lireTheme());
    setPret(true);
  }, []);

  const basculer = useCallback(() => {
    const suivant: Theme = lireTheme() === 'sombre' ? 'clair' : 'sombre';
    const changer = () => {
      appliquerTheme(suivant);
      setTheme(suivant);
    };
    if (prefersReducedMotion()) return changer();

    // Fondu par la couleur du nouveau fond : un voile monte, le thème change dessous, le voile s'efface
    const voile = document.createElement('div');
    voile.setAttribute('aria-hidden', 'true');
    voile.style.cssText = `position:fixed;inset:0;z-index:200;pointer-events:none;opacity:0;background:${suivant === 'sombre' ? '#0b0a0c' : '#ffffff'}`;
    document.body.appendChild(voile);
    gsap
      .timeline({ onComplete: () => voile.remove() })
      .to(voile, { opacity: 1, duration: 0.18, ease: 'power1.in', onComplete: changer })
      .to(voile, { opacity: 0, duration: 0.35, ease: 'power2.out', delay: 0.05 });
  }, []);

  const valeur = useMemo(() => ({ theme, pret, basculer }), [theme, pret, basculer]);
  return <ThemeCtx.Provider value={valeur}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
