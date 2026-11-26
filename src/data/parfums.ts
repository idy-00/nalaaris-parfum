import { fusionnerCatalogue } from '../lib/catalogue-donnees';
/**
 * CATALOGUE — les parfums réels de Nal’Aaris.
 *
 * - La liste vient de `catalogue.generated.ts`, produit par `npm run import-catalogue` (ne pas l'éditer à la main).
 * - Ce que choisit la cliente (prix, contenances, disponibilité, nouveautés, coups de cœur, description validée)
 *   se règle dans `reglages-parfums.ts`, jamais écrasé par l'import.
 * - « Quand le porter » : `porter.ts`, écrit à la main, lui aussi hors de l'import.
 * - Descriptions réécrites à la main : `descriptions.ts` (hors de l'import).
 */
import { catalogue } from './catalogue.generated';
import { REGLAGES } from './reglages-parfums';
import { PORTER } from './porter';
import { DESCRIPTIONS } from './descriptions';

export type Categorie = 'femme' | 'homme' | 'unisexe';
export type Style = 'frais' | 'fleuri' | 'boise' | 'doux' | 'vanille' | 'oriental';
export type Dispo = 'disponible' | 'limite' | 'epuise' | 'sur_commande';
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
  /** Absente = stock pas suivi par la boutique : aucun badge. */
  dispo?: Dispo;
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
  styles: Style[]; // calculés d'après les notes ; surcharge manuelle possible dans reglages-parfums.ts
  description: string; // 2 phrases tirées des notes
  notes: Notes;
  ingredients: string[]; // ce qu'on retrouve dans le parfum (et sur le visuel)
  images: string[]; // /parfums/<slug>/1122.webp ; variantes 480 et 800 à côté
}

/** Réglages de la cliente, fusionnés par-dessus l'import (prioritaires). */
export interface ReglageParfum {
  /** Nom public (l'import garde le nom de travail, ex. « (provisoire) »). */
  nom?: string;
  /** Ambiances choisies à la main, à la place du calcul automatique. */
  styles?: Style[];
  contenances?: Contenance[];
  /** Stock validé par la boutique. Absent = aucun badge affiché. */
  dispo?: Dispo;
  description?: string;
  nouveau?: boolean;
  coupDeCoeur?: boolean;
}

export interface Parfum extends ParfumImporte, Omit<ReglageParfum, 'description' | 'nom' | 'styles'> {
  /** Vide = « Demander le prix ». */
  contenances: Contenance[];
  /** Absent = pas de bloc « Quand le porter » sur la fiche. */
  porter?: Porter;
}

/**
 * Données de la boutique saisies dans l'admin (D1), récupérées au build par scripts/donnees-d1.mjs :
 * instantané complet du catalogue public. Les données en direct prennent ensuite le relais.
 */
export interface DonneesD1 {
  complet?: boolean;
  parfums: Record<
    string,
    Partial<Omit<Parfum, 'porter' | 'dispo' | 'concentration'>> & { concentration?: string | null; porter?: Porter | null; dispo?: Dispo | null; masque?: boolean }
  >;
  boutique: {
    whatsapp?: string;
    horaires?: string;
    retrait?: boolean;
    retraitAdresse?: string;
    paiements?: string[];
    zones?: { nom: string; frais: number; delai: string }[];
  };
  avis: { prenom: string; ville?: string | null; texte: string; note?: number | null; date: string }[];
}
export let donneesD1: DonneesD1 | undefined = Object.values(
  import.meta.glob<DonneesD1>('./d1.generated.json', { eager: true, import: 'default' }),
)[0];

const catalogueInitial: Parfum[] = catalogue
  .map((p) => {
    const r = REGLAGES[p.slug] ?? {};
    const parfum: Parfum = {
      ...p,
      ...r,
      nom: r.nom ?? p.nom,
      styles: r.styles ?? p.styles,
      description: r.description ?? DESCRIPTIONS[p.slug] ?? p.description,
      contenances: r.contenances ?? [],
      porter: PORTER[p.slug],
    };
    return parfum;
  });

export const parfums:Parfum[]=fusionnerCatalogue(catalogueInitial,donneesD1);
export function appliquerCatalogue(d:DonneesD1) {
  parfums.splice(0,parfums.length,...fusionnerCatalogue(catalogueInitial,d));
  donneesD1=d;
}

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
  sur_commande: 'Sur commande',
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

/** Variantes responsive d'une image du catalogue (/parfums/<slug>/1122.webp → 360, 480, 800, 1122). */
export function srcsetImage(src: string): string | undefined {
  const m = src.match(/^(\/parfums\/[^/]+\/)1122\.webp$/);
  return m ? `${m[1]}360.webp 360w, ${m[1]}480.webp 480w, ${m[1]}800.webp 800w, ${m[1]}1122.webp 1122w` : undefined;
}

/**
 * Disponibilité globale : la meilleure des contenances, ou celle du parfum s'il n'y en a pas.
 * `undefined` = stock pas encore validé par la boutique : on n'affiche rien (ni « Disponible », ni « Épuisé »).
 */
export function dispoGlobale(p: Parfum): Dispo | undefined {
  const ds = p.contenances.map((c) => c.dispo).filter((d): d is Dispo => !!d);
  if (!ds.length) return p.dispo;
  for (const d of ['disponible', 'limite', 'sur_commande'] as const) if (ds.includes(d)) return d;
  return 'epuise';
}

/** Au moins un stock renseigné à la main : sinon le filtre « Disponibles uniquement » n'a pas de sens. */
export const stockRenseigne = () => parfums.some((p) => dispoGlobale(p) !== undefined);

/** Au moins un format (contenance) renseigné : les textes « choisis ta contenance » en dépendent. */
export const formatsRenseignes = () => parfums.some((p) => p.contenances.length > 0);

/** Contenance choisie : `dispo` absente = stock non validé. */
export interface ChoixContenance {
  ml: number;
  prix?: number;
  dispo?: Dispo;
}

/**
 * Contenance proposée par défaut : la première qui n'est pas épuisée.
 * Sans contenance renseignée : ml = 0, c'est-à-dire « contenance à préciser sur WhatsApp ».
 */
export const contenanceParDefaut = (p: Parfum): ChoixContenance =>
  p.contenances.find((c) => c.dispo !== 'epuise') ?? p.contenances[0] ?? { ml: 0, dispo: p.dispo };

/** « 50 ml », ou rien si la contenance n'est pas encore connue. */
export const libelleMl = (ml: number) => (ml > 0 ? `${ml} ml` : '');

export const formatPrix = (prix?: number) =>
  prix == null ? 'Demander le prix' : `${new Intl.NumberFormat('fr-FR').format(prix)} FCFA`;

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
