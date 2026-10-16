import type { Style } from '../data/parfums';

/** Toutes les URL du site au même endroit. */
export const ROUTES = {
  accueil: '/',
  catalogue: '/catalogue',
  maison: '/la-maison',
  commander: '/commander',
  parfum: (slug: string) => `/parfum/${slug}`,
} as const;

/** Catalogue pré-filtré sur une humeur. */
export const catalogueStyle = (s: Style) => ({ pathname: ROUTES.catalogue, search: `?style=${s}` });

/** Pages principales : navigation, pied de page et génération des aperçus de partage. */
export const PAGES = [
  { to: ROUTES.catalogue, label: 'Catalogue' },
  { to: ROUTES.maison, label: 'La maison' },
  { to: ROUTES.commander, label: 'Commander' },
] as const;
