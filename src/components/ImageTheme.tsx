import type { ImgHTMLAttributes } from 'react';
import { useTheme } from '../hooks/useTheme';
import { versSombre } from '../lib/theme';

/** Source d'un média étalonné pour un thème : /media/x.webp (clair) ou /media/sombre/x.webp. */
export const sourceTheme = (url: string | undefined, sombre: boolean) => (url && sombre ? versSombre(url) : url);

/**
 * Photo d'ambiance étalonnée en deux versions (clair / sombre) : une seule balise, une seule image téléchargée.
 * Pas de source dans le HTML pré-rendu (le thème du visiteur n'y est pas connu) : la bonne version est posée
 * juste après l'hydratation, en lazy. Réservé aux photos décoratives sous la ligne de flottaison
 * (l'affiche du hero, elle, est pré-rendue : voir VideoFond).
 */
export function ImageTheme({ src, srcSet, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const { theme, pret } = useTheme();
  const sombre = theme === 'sombre';
  return (
    <img
      {...props}
      src={pret ? sourceTheme(src, sombre) : undefined}
      srcSet={pret ? sourceTheme(srcSet, sombre) : undefined}
      alt={pret ? alt : ''}
    />
  );
}
