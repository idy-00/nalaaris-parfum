/** Thème clair / sombre — même réglage que le site (clé localStorage « nalaaris:theme »). */
const CLE = 'nalaaris:theme';
export type Theme = 'clair' | 'sombre';

export function themeActuel(): Theme {
  try {
    const t = localStorage.getItem(CLE);
    if (t === 'clair' || t === 'sombre') return t;
  } catch {
    /* stockage indisponible */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'sombre' : 'clair';
}

export function appliquerTheme(t: Theme = themeActuel()) {
  document.documentElement.setAttribute('data-theme', t);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'sombre' ? '#100E12' : '#FFF7F9');
}

export function changerTheme(t: Theme) {
  try {
    localStorage.setItem(CLE, t);
  } catch {
    /* stockage indisponible : le choix vaut pour cette visite */
  }
  appliquerTheme(t);
}
