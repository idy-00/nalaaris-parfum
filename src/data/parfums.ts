/**
 * CATALOGUE — les parfums réels de Nal’Aaris.
 *
 * - La liste vient de `catalogue.generated.ts`, produit par `npm run import-catalogue` (ne pas l'éditer à la main).
 * - Ce que choisit la cliente (prix, contenances, disponibilité, nouveautés, coups de cœur, description validée)
 *   se règle dans `reglages-parfums.ts`, jamais écrasé par l'import.
 * - « Quand le porter » : `porter.ts`, écrit à la main, lui aussi hors de l'import.
 */
import { catalogue } from './catalogue.generated';
import { REGLAGES } from './reglages-parfums';
import { PORTER } from './porter';

export type Categorie = 'femme' | 'homme' | 'unisexe';
export type Style = 'frais' | 'fleuri' | 'boise' | 'doux' | 'vanille' | 'oriental';
export type Dispo = 'disponible' | 'limite' | 'epuise';
export type Moment = 'jour' | 'soir' | 'jourSoir';
export type Saison = 'fraiche' | 'chaude' | 'annee';
export type Occasion = 'quotidien' | 'bureau' | 'sortie' | 'diner' | 'ceremonie';

/** « Quand le porter » : moment, saison (climat de Dakar) et occasion, avec un détail court pour chacun. */
export interface Porter {
  moment: Moment;
  momentDetail: string; // « Sorties, rendez-vous »
  saison: Saison;
  saisonDetail: string; // « déc. → avril »
  occasion: { icone: Occasion; titre: string; detail: string };
}

export interface Contenance {
  ml: number;
  prix?: number;
  dispo: Dispo;
}

/** Pyramide tête / cœur / fond quand elle est publiée, sinon les notes principales en un bouquet. */
export type Notes = { tete: string[]; coeur: string[]; fond: string[] } | { bouquet: string[] };

/** Ce que produit l'import (données du catalogue source). */
export interface ParfumImporte {
  slug: string;
  nom: string;
  marque: string;
  concentration?: string; // « Eau de parfum », « Parfum »… ; absente si non confirmée
  categorie: Categorie;
  styles: Style[];
  description: string; // 2 phrases tirées des notes
  notes: Notes;
  ingredients: string[]; // ce qu'on retrouve dans le parfum (et sur le visuel)
  images: string[]; // /parfums/<slug>/1122.webp ; variantes 480 et 800 à côté
}

/** Réglages de la cliente, fusionnés par-dessus l'import. */
export interface ReglageParfum {
  contenances?: Contenance[];
  dispo?: Dispo;
  description?: string;
  nouveau?: boolean;
  coupDeCoeur?: boolean;
}

export interface Parfum extends ParfumImporte, Omit<ReglageParfum, 'description'> {
  /** Vide = « Prix et contenances sur demande ». */
  contenances: Contenance[];
  /** Disponibilité quand aucune contenance n'est renseignée (par défaut : disponible). */
  dispo: Dispo;
  /** Absent = pas de bloc « Quand le porter » sur la fiche. */
  porter?: Porter;
}

export const parfums: Parfum[] = catalogue.map((p) => {
  const r = REGLAGES[p.slug] ?? {};
  return { ...p, ...r, contenances: r.contenances ?? [], dispo: r.dispo ?? 'disponible', porter: PORTER[p.slug] };
});

/* ---------- Libellés et méta-données d'affichage ---------- */

export const CATEGORIES: { id: Categorie; label: string }[] = [
  { id: 'femme', label: 'Femme' },
  { id: 'homme', label: 'Homme' },
  { id: 'unisexe', label: 'Unisexe' },
];

/** `photo` : visuel d'ambiance dans /public/media (humeur-<photo>-480|900.webp). */
export const STYLES: { id: Style; label: string; humeur: string; teinte: string; photo: string }[] = [
  { id: 'frais', label: 'Frais', humeur: 'léger comme un matin', teinte: '#E58BAE', photo: 'humeur-frais' },
  { id: 'fleuri', label: 'Fleuri', humeur: 'un bouquet sur la peau', teinte: '#DA0862', photo: 'humeur-fleuri' },
  { id: 'boise', label: 'Boisé', humeur: 'chaud, posé, rassurant', teinte: '#B5755C', photo: 'humeur-boise' },
  { id: 'doux', label: 'Doux', humeur: 'une caresse, rien de plus', teinte: '#F2C6D6', photo: 'humeur-doux' },
  { id: 'vanille', label: 'Vanillé', humeur: 'gourmand et enveloppant', teinte: '#D9A27E', photo: 'humeur-vanille' },
  { id: 'oriental', label: 'Oriental', humeur: 'intense, pour le soir', teinte: '#8C0E3E', photo: 'humeur-oriental' },
];

export const styleInfo = (s: Style) => STYLES.find((x) => x.id === s)!;

export const DISPO_LABEL: Record<Dispo, string> = {
  disponible: 'Disponible',
  limite: 'Stock limité',
  epuise: 'Épuisé',
};

/* ---------- Helpers ---------- */

export const marques = (): string[] => [...new Set(parfums.map((p) => p.marque))].sort((a, b) => a.localeCompare(b, 'fr'));

export const getParfum = (slug: string) => parfums.find((p) => p.slug === slug);

/** Filtre « Jour / Soir » : un parfum jour & soir apparaît dans les deux. */
export const seMetLe = (p: Parfum, m: 'jour' | 'soir') => p.porter?.moment === m || p.porter?.moment === 'jourSoir';

/** Slugs sans conseil « Quand le porter » (avertissement au build). */
export const sansConseil = () => parfums.filter((p) => !p.porter).map((p) => p.slug);

export const styleLabel = (s: Style) => STYLES.find((x) => x.id === s)?.label ?? s;
export const categorieLabel = (c: Categorie) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

/** Toutes les notes, dans l'ordre (tête, cœur, fond — ou le bouquet). */
export const toutesLesNotes = (p: Pick<Parfum, 'notes'>): string[] =>
  'bouquet' in p.notes ? p.notes.bouquet : [...p.notes.tete, ...p.notes.coeur, ...p.notes.fond];

/** Variantes responsive d'une image du catalogue (/parfums/<slug>/1122.webp → 480, 800, 1122). */
export function srcsetImage(src: string): string | undefined {
  const m = src.match(/^(\/parfums\/[^/]+\/)1122\.webp$/);
  return m ? `${m[1]}480.webp 480w, ${m[1]}800.webp 800w, ${m[1]}1122.webp 1122w` : undefined;
}

/** Disponibilité globale : la meilleure des contenances, ou celle du parfum s'il n'y en a pas. */
export function dispoGlobale(p: Parfum): Dispo {
  if (!p.contenances.length) return p.dispo;
  if (p.contenances.some((c) => c.dispo === 'disponible')) return 'disponible';
  if (p.contenances.some((c) => c.dispo === 'limite')) return 'limite';
  return 'epuise';
}

/**
 * Contenance proposée par défaut : la première qui n'est pas épuisée.
 * Sans contenance renseignée : ml = 0, c'est-à-dire « contenance à préciser sur WhatsApp ».
 */
export const contenanceParDefaut = (p: Parfum): Contenance =>
  p.contenances.find((c) => c.dispo !== 'epuise') ?? p.contenances[0] ?? { ml: 0, dispo: p.dispo };

/** « 50 ml », ou rien si la contenance n'est pas encore connue. */
export const libelleMl = (ml: number) => (ml > 0 ? `${ml} ml` : '');

export const formatPrix = (prix?: number) =>
  prix == null ? 'Prix sur demande' : `${new Intl.NumberFormat('fr-FR').format(prix)} FCFA`;

/** « Tu aimeras aussi » : même style d'abord, puis même catégorie. */
export function suggestions(p: Parfum, n = 4): Parfum[] {
  const score = (o: Parfum) =>
    o.styles.filter((s) => p.styles.includes(s)).length * 2 + (o.categorie === p.categorie ? 1 : 0);
  return parfums
    .filter((o) => o.slug !== p.slug)
    .map((o) => ({ o, s: score(o) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((x) => x.o);
}
