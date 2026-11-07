import { ImageTheme } from './ImageTheme';

/**
 * Photo d'ambiance responsive (WebP) depuis /public/media.
 * Les fichiers suivent la convention <nom>-<largeur>.webp ; `largeurs` liste celles disponibles.
 * `type` : « ambiance » = photo traitée (rose poudré en clair, duotone sombre en sombre), recadrée plein cadre ;
 *          « produit » = flacon en couleurs naturelles, jamais recadré ni teinté (vraie couleur du jus et de l’étiquette).
 */
export function Photo({
  nom,
  largeurs,
  ratio,
  alt = '',
  sizes = '100vw',
  priorite = false,
  className = '',
  type = 'ambiance',
}: {
  nom: string;
  largeurs: number[];
  ratio: number; // largeur / hauteur — réserve l'espace (pas de saut de mise en page)
  alt?: string;
  sizes?: string;
  priorite?: boolean;
  className?: string;
  type?: 'ambiance' | 'produit';
}) {
  const max = largeurs[largeurs.length - 1];
  // Ambiance : étalonnée en deux versions (clair / sombre). Produit : vraie couleur, une seule version.
  const Img = type === 'ambiance' ? ImageTheme : 'img';
  return (
    <Img
      src={`/media/${nom}-${max}.webp`}
      srcSet={largeurs.map((w) => `/media/${nom}-${w}.webp ${w}w`).join(', ')}
      sizes={sizes}
      width={max}
      height={Math.round(max / ratio)}
      alt={alt}
      loading={priorite ? 'eager' : 'lazy'}
      decoding="async"
      // @ts-expect-error — fetchpriority est valide en HTML, pas encore typé dans React 18
      fetchpriority={priorite ? 'high' : undefined}
      data-type={type}
      className={`${type === 'produit' ? 'photo-produit' : 'photo'} ${className}`}
    />
  );
}

/** Photo d'humeur (4:5) */
export const PhotoHumeur = ({ photo, sizes, className }: { photo: string; sizes?: string; className?: string }) => (
  <Photo nom={photo} largeurs={[480, 900]} ratio={4 / 5} sizes={sizes ?? '(min-width: 1024px) 33vw, 50vw'} className={className} />
);
