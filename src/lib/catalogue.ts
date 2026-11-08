import { dispoGlobale, parfums, seMetLe, styleLabel, toutesLesNotes, type Categorie, type Parfum, type Style } from '../data/parfums';

/** Filtres du catalogue — sérialisés dans l'URL (?q=&cat=&style=&moment=&marque=&dispo=1) pour être partageables. */
export type MomentFiltre = 'jour' | 'soir';

export interface Filtres {
  q: string;
  cat: Categorie | null;
  styles: Style[];
  moment: MomentFiltre | null; // « Jour & soir » apparaît dans les deux
  marque: string | null;
  dispo: boolean; // true = masquer les épuisés
}

export function lireFiltres(p: URLSearchParams): Filtres {
  return {
    q: p.get('q') ?? '',
    cat: (p.get('cat') as Categorie) || null,
    styles: (p.get('style')?.split(',').filter(Boolean) as Style[]) ?? [],
    moment: ['jour', 'soir'].includes(p.get('moment') ?? '') ? (p.get('moment') as MomentFiltre) : null,
    marque: p.get('marque') || null,
    dispo: p.get('dispo') === '1',
  };
}

export function ecrireFiltres(f: Filtres): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.cat) p.set('cat', f.cat);
  if (f.styles.length) p.set('style', f.styles.join(','));
  if (f.moment) p.set('moment', f.moment);
  if (f.marque) p.set('marque', f.marque);
  if (f.dispo) p.set('dispo', '1');
  return p;
}

export const nbFiltresActifs = (f: Filtres) =>
  (f.cat ? 1 : 0) + f.styles.length + (f.moment ? 1 : 0) + (f.marque ? 1 : 0) + (f.dispo ? 1 : 0);

/** Normalise pour une recherche tolérante aux accents et à la casse (« cedre » trouve « Cèdre »). */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘`´]/g, ''); // « jadore » trouve « J’adore »

/** Texte cherché : nom, marque, concentration, styles (« vanillé ») et notes (« vanille », « bergamote »…). */
const texteRecherche = (p: Parfum) =>
  [p.nom, p.marque, p.concentration ?? '', ...p.styles.map(styleLabel), ...toutesLesNotes(p)].join(' ');

export function filtrer(f: Filtres, liste: Parfum[] = parfums): Parfum[] {
  const q = norm(f.q.trim());
  return liste.filter((p) => {
    if (q && !norm(texteRecherche(p)).includes(q)) return false;
    if (f.cat && p.categorie !== f.cat) return false;
    if (f.styles.length && !f.styles.some((s) => p.styles.includes(s))) return false;
    if (f.moment && !seMetLe(p, f.moment)) return false;
    if (f.marque && p.marque !== f.marque) return false;
    if (f.dispo && dispoGlobale(p) === 'epuise') return false;
    return true;
  });
}
