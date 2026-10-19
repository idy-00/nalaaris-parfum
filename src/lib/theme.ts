/**
 * Deux versions du site, mêmes pages : « Rose & blanc » (clair, par défaut) et « Noir & rose » (sombre).
 *
 * - index.html pose `data-theme` sur <html> avant le premier rendu (choix gardé dans localStorage) : pas de flash.
 * - Les couleurs suivent via les variables CSS (src/styles/index.css) et la variante Tailwind `dark:`.
 * - Les médias étalonnés existent en deux versions : /media/<fichier> (clair) et /media/sombre/<fichier>.
 *   Les deux <img> sont dans le HTML, le CSS n'affiche que celle du thème actif (rendu serveur = rendu client).
 */
export type Theme = 'clair' | 'sombre';

export const CLE_THEME = 'nalaaris:theme';
const COULEUR_BARRE: Record<Theme, string> = { clair: '#FFFFFF', sombre: '#0B0A0C' };

export const lireTheme = (): Theme =>
  typeof document !== 'undefined' && document.documentElement.dataset.theme === 'sombre' ? 'sombre' : 'clair';

export function appliquerTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COULEUR_BARRE[theme]);
  try {
    localStorage.setItem(CLE_THEME, theme);
  } catch {
    // stockage indisponible (navigation privée) : le choix vaut pour la visite
  }
}

/** Chemin(s) de la version sombre d'un média : /media/x.webp → /media/sombre/x.webp (marche aussi sur un srcSet). */
export const versSombre = (url: string) => url.replace(/\/media\//g, '/media/sombre/');
