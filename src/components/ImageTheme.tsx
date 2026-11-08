import type { ImgHTMLAttributes } from 'react';
import { useTheme } from '../hooks/useTheme';
import { versSombre } from '../lib/theme';

/** Source d'un média étalonné pour un thème : /media/x.webp (clair) ou /media/sombre/x.webp. */
export const sourceTheme = (url: string | undefined, sombre: boolean) => (url && sombre ? versSombre(url) : url);

/**
 * Photo d'ambiance étalonnée en deux versions (clair / sombre).
 *
 * Par défaut : pas de source dans le HTML pré-rendu (le thème du visiteur n'y est pas connu) ; la bonne version
 * est posée juste après l'hydratation, en lazy. Une seule image téléchargée. Pour les photos sous la ligne de flottaison.
 *
 * `priorite` (image principale en haut de page, élément LCP) : la version claire est dans le HTML, chargée tout de suite
 * (eager + fetchpriority high + preload posé par le pré-rendu), sans attendre le JavaScript. En thème sombre, la version
 * sombre la remplace après l'hydratation.
 */
export function ImageTheme({ src, srcSet, alt = '', priorite = false, ...props }: ImgHTMLAttributes<HTMLImageElement> & { priorite?: boolean }) {
  const { theme, pret } = useTheme();
  const sombre = pret && theme === 'sombre';
  if (priorite) {
    return (
      <img
        {...props}
        loading="eager"
        // @ts-expect-error — fetchpriority est valide en HTML, pas encore typé dans React 18
        fetchpriority="high"
        src={sourceTheme(src, sombre)}
        srcSet={sourceTheme(srcSet, sombre)}
        alt={alt}
      />
    );
  }
  return (
    <img
      {...props}
      src={pret ? sourceTheme(src, sombre) : undefined}
      srcSet={pret ? sourceTheme(srcSet, sombre) : undefined}
      alt={pret ? alt : ''}
    />
  );
}
