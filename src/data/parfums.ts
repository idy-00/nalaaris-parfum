/**
 * CATALOGUE — seul fichier à modifier pour ajouter, retirer ou mettre à jour un parfum.
 *
 * Les 12 parfums ci-dessous sont des EXEMPLES FICTIFS (noms et marques inventés).
 * Pour un vrai parfum :
 *   1. dépose les photos dans /public/parfums/<slug>/ (WebP de préférence, format carré ou 4:5) ;
 *   2. renseigne `images: ['/parfums/<slug>/1.webp', ...]` — le flacon dessiné disparaît alors tout seul ;
 *   3. ajoute `prix` (en FCFA) sur chaque contenance si tu veux l'afficher, sinon « Prix sur demande ».
 */

export type Categorie = 'femme' | 'homme' | 'unisexe';
export type Style = 'frais' | 'fleuri' | 'boise' | 'doux' | 'vanille' | 'oriental';
export type Dispo = 'disponible' | 'limite' | 'epuise';

export interface Contenance {
  ml: number;
  prix?: number;
  dispo: Dispo;
}

export interface Parfum {
  slug: string;
  nom: string;
  marque: string;
  categorie: Categorie;
  styles: Style[];
  description: string; // 2–3 phrases simples
  notes: { tete: string[]; coeur: string[]; fond: string[] };
  contenances: Contenance[];
  images: string[]; // vide = visuel placeholder
  nouveau?: boolean;
  coupDeCoeur?: boolean;
}

export const parfums: Parfum[] = [
  {
    slug: 'rose-de-minuit',
    nom: 'Rose de Minuit',
    marque: 'Maison Exemple',
    categorie: 'femme',
    styles: ['fleuri', 'oriental'],
    description:
      'Une rose profonde, presque veloutée, qui se réchauffe au fil de la soirée. Élégante sans être lourde. Idéale pour un dîner ou une sortie.',
    notes: { tete: ['Poivre rose', 'Litchi'], coeur: ['Rose de Damas', 'Pivoine'], fond: ['Ambre', 'Patchouli'] },
    contenances: [
      { ml: 30, dispo: 'disponible' },
      { ml: 50, dispo: 'disponible' },
      { ml: 100, dispo: 'limite' },
    ],
    images: [],
    coupDeCoeur: true,
  },
  {
    slug: 'brise-de-ngor',
    nom: 'Brise de Ngor',
    marque: 'Atelier Exemple',
    categorie: 'unisexe',
    styles: ['frais'],
    description:
      'Frais et léger, comme le vent de mer en fin de matinée. Il sent le propre et l’agrume. Parfait pour la journée et la chaleur.',
    notes: { tete: ['Bergamote', 'Citron vert'], coeur: ['Notes marines', 'Menthe'], fond: ['Musc blanc', 'Bois flotté'] },
    contenances: [
      { ml: 50, dispo: 'disponible' },
      { ml: 100, dispo: 'disponible' },
    ],
    images: [],
    nouveau: true,
  },
  {
    slug: 'ambre-teranga',
    nom: 'Ambre Teranga',
    marque: 'Maison Exemple',
    categorie: 'unisexe',
    styles: ['oriental', 'vanille'],
    description:
      'Chaud, enveloppant, généreux. Un ambre doré avec une pointe de vanille qui tient toute la journée. Pour celles et ceux qui aiment qu’on se souvienne d’eux.',
    notes: { tete: ['Cardamome', 'Safran'], coeur: ['Encens', 'Labdanum'], fond: ['Ambre', 'Vanille', 'Benjoin'] },
    contenances: [
      { ml: 30, dispo: 'limite' },
      { ml: 100, dispo: 'disponible' },
    ],
    images: [],
    coupDeCoeur: true,
  },
  {
    slug: 'cedre-noir',
    nom: 'Cèdre Noir',
    marque: 'Studio Exemple',
    categorie: 'homme',
    styles: ['boise'],
    description:
      'Un bois sec et fumé, très posé. Il rassure et donne de l’allure sans en faire trop. Pour le bureau comme pour le soir.',
    notes: { tete: ['Poivre noir', 'Pamplemousse'], coeur: ['Cèdre', 'Vétiver'], fond: ['Cuir', 'Bois fumé'] },
    contenances: [
      { ml: 50, dispo: 'disponible' },
      { ml: 100, dispo: 'disponible' },
    ],
    images: [],
  },
  {
    slug: 'lait-de-coco',
    nom: 'Lait de Coco',
    marque: 'Atelier Exemple',
    categorie: 'femme',
    styles: ['doux', 'vanille'],
    description:
      'Doux et gourmand, comme une peau sortie du soleil. Une note crémeuse et rassurante. On a envie de se rapprocher.',
    notes: { tete: ['Noix de coco'], coeur: ['Fleur de tiaré', 'Jasmin'], fond: ['Vanille', 'Musc'] },
    contenances: [
      { ml: 30, dispo: 'disponible' },
      { ml: 50, dispo: 'disponible' },
    ],
    images: [],
    nouveau: true,
  },
  {
    slug: 'vetiver-sable',
    nom: 'Vétiver Sable',
    marque: 'Studio Exemple',
    categorie: 'homme',
    styles: ['frais', 'boise'],
    description:
      'Un vétiver net et lumineux, avec une fraîcheur d’agrumes. Simple, propre, très facile à porter tous les jours.',
    notes: { tete: ['Citron', 'Gingembre'], coeur: ['Vétiver', 'Géranium'], fond: ['Cèdre', 'Musc'] },
    contenances: [{ ml: 100, dispo: 'epuise' }],
    images: [],
  },
  {
    slug: 'fleur-de-bissap',
    nom: 'Fleur de Bissap',
    marque: 'Maison Exemple',
    categorie: 'femme',
    styles: ['fleuri', 'frais'],
    description:
      'Fruité et fleuri, pétillant comme un bissap bien frais. Joyeux, lumineux, il met de bonne humeur dès le matin.',
    notes: { tete: ['Hibiscus', 'Fruits rouges'], coeur: ['Rose', 'Fleur d’oranger'], fond: ['Musc blanc'] },
    contenances: [
      { ml: 30, dispo: 'disponible' },
      { ml: 50, dispo: 'limite' },
      { ml: 100, dispo: 'epuise' },
    ],
    images: [],
  },
  {
    slug: 'oud-imperial',
    nom: 'Oud Impérial',
    marque: 'Atelier Exemple',
    categorie: 'homme',
    styles: ['oriental', 'boise'],
    description:
      'Intense et profond, fait pour le soir et les grandes occasions. Un oud boisé avec une touche de rose. Quelques gouttes suffisent.',
    notes: { tete: ['Safran', 'Rose'], coeur: ['Oud', 'Patchouli'], fond: ['Santal', 'Ambre gris'] },
    contenances: [
      { ml: 50, dispo: 'limite' },
      { ml: 100, dispo: 'limite' },
    ],
    images: [],
    coupDeCoeur: true,
  },
  {
    slug: 'nuage-de-musc',
    nom: 'Nuage de Musc',
    marque: 'Studio Exemple',
    categorie: 'unisexe',
    styles: ['doux'],
    description:
      'Un musc doux et propre, comme un linge sorti du séchoir. Très discret, il reste près de la peau. Parfait pour ceux qui n’aiment pas les parfums forts.',
    notes: { tete: ['Aldéhydes', 'Poire'], coeur: ['Iris', 'Fleur de coton'], fond: ['Musc blanc', 'Ambrette'] },
    contenances: [
      { ml: 30, dispo: 'disponible' },
      { ml: 100, dispo: 'disponible' },
    ],
    images: [],
  },
  {
    slug: 'vanille-cachemire',
    nom: 'Vanille Cachemire',
    marque: 'Maison Exemple',
    categorie: 'femme',
    styles: ['vanille', 'doux'],
    description:
      'Une vanille douce et un peu poudrée, comme un pull tout chaud. Réconfortante, jamais écœurante. On la porte matin et soir.',
    notes: { tete: ['Amande', 'Mandarine'], coeur: ['Héliotrope', 'Fleur de tiaré'], fond: ['Vanille', 'Tonka', 'Santal'] },
    contenances: [{ ml: 50, dispo: 'epuise' }],
    images: [],
  },
  {
    slug: 'santal-baobab',
    nom: 'Santal Baobab',
    marque: 'Atelier Exemple',
    categorie: 'unisexe',
    styles: ['boise', 'doux'],
    description:
      'Un santal crémeux, chaleureux et apaisant. Il se fond dans la peau et devient le tien. Pour elle comme pour lui.',
    notes: { tete: ['Figue', 'Cardamome'], coeur: ['Santal', 'Iris'], fond: ['Cèdre', 'Musc', 'Vanille'] },
    contenances: [
      { ml: 50, dispo: 'disponible' },
      { ml: 100, dispo: 'limite' },
    ],
    images: [],
    nouveau: true,
  },
  {
    slug: 'agrumes-du-lac',
    nom: 'Agrumes du Lac',
    marque: 'Studio Exemple',
    categorie: 'homme',
    styles: ['frais'],
    description:
      'Vif et pétillant, plein d’agrumes et d’herbes fraîches. Il réveille. Idéal après le sport ou pour les journées chaudes.',
    notes: { tete: ['Orange amère', 'Bergamote'], coeur: ['Basilic', 'Lavande'], fond: ['Musc', 'Mousse de chêne'] },
    contenances: [
      { ml: 30, dispo: 'disponible' },
      { ml: 100, dispo: 'disponible' },
    ],
    images: [],
  },
];

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

export const styleLabel = (s: Style) => STYLES.find((x) => x.id === s)?.label ?? s;
export const categorieLabel = (c: Categorie) => CATEGORIES.find((x) => x.id === c)?.label ?? c;

/** Disponibilité globale : la meilleure des contenances. */
export function dispoGlobale(p: Parfum): Dispo {
  if (p.contenances.some((c) => c.dispo === 'disponible')) return 'disponible';
  if (p.contenances.some((c) => c.dispo === 'limite')) return 'limite';
  return 'epuise';
}

/** Contenance proposée par défaut : la première qui n'est pas épuisée. */
export const contenanceParDefaut = (p: Parfum): Contenance =>
  p.contenances.find((c) => c.dispo !== 'epuise') ?? p.contenances[0];

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
