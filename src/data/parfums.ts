/**
 * CATALOGUE — seul fichier à modifier pour ajouter, retirer ou mettre à jour un parfum.
 *
 * Ajouter un vrai parfum :
 *   1. photo produit dans scripts/photos-brutes/<slug>.(png|jpg) puis `python scripts/detourer.py <slug>`
 *      → flacon détouré dans /public/parfums/flacons/<slug>.webp ;
 *   2. une entrée dans `vrais` ci-dessous : `flacon`, `halo`, `ingredients` (6 max, voir src/lib/ingredients.ts),
 *      notes (tête / cœur / fond, ou `bouquet`) et « Quand le porter » (`porter`) ;
 *   3. `prix` (en FCFA) sur chaque contenance si tu veux l'afficher, sinon « Prix sur demande » ;
 *   4. `npm run cartes` pour regénérer les visuels Instagram et l'image de partage de la fiche.
 *
 * Les 12 parfums marqués `demo: true` sont des EXEMPLES FICTIFS, masqués par AFFICHER_DEMO (src/data/reglages.ts).
 */
import { AFFICHER_DEMO } from './reglages';

export type Categorie = 'femme' | 'homme' | 'unisexe';
export type Style = 'frais' | 'fleuri' | 'boise' | 'doux' | 'vanille' | 'oriental';
export type Dispo = 'disponible' | 'limite' | 'epuise';

export type Moment = 'jour' | 'soir' | 'jourSoir';
export type Saison = 'fraiche' | 'chaude' | 'annee';
export type Occasion = 'sortie' | 'diner' | 'quotidien' | 'ceremonie';
/** Gravures disponibles — dessins dans src/lib/ingredients.ts. */
export type Ingredient =
  | 'agrume'
  | 'pomme'
  | 'poire'
  | 'cannelle'
  | 'lavande'
  | 'fleurOranger'
  | 'jasmin'
  | 'tubereuse'
  | 'rose'
  | 'ylang'
  | 'vanille'
  | 'tonka'
  | 'cacao'
  | 'patchouli'
  | 'vetiver'
  | 'menthe'
  | 'ambre'
  | 'bois';

export interface Contenance {
  ml: number;
  prix?: number;
  dispo: Dispo;
}

/** Pyramide olfactive ; `bouquet` quand la marque n'en publie pas (ex. J’adore). */
export interface Notes {
  tete?: string[];
  coeur?: string[];
  fond?: string[];
  bouquet?: string[];
}

/** « Quand le porter » : conseils pensés pour le climat de Dakar. */
export interface Porter {
  moment: Moment;
  momentDetail: string;
  saison: Saison;
  saisonDetail: string;
  occasion: { icone: Occasion; titre: string; detail: string };
}

export interface Parfum {
  slug: string;
  nom: string;
  sousNom?: string; // ex. « Rouge Ultime »
  marque: string;
  type?: 'Eau de parfum' | 'Eau de toilette' | 'Parfum';
  famille?: string; // ex. « Ambré · Épicé · Gourmand »
  categorie: Categorie;
  styles: Style[];
  description: string; // 2–3 phrases simples
  notes: Notes;
  contenances: Contenance[];
  images: string[]; // photos d'ambiance (vide = scène du flacon, ou flacon dessiné)
  flacon?: string; // /parfums/flacons/<slug>.webp (détouré, fond transparent)
  halo?: string; // teinte de la lueur derrière le flacon (rgba)
  ingredients?: Ingredient[]; // 6 max, dans l'ordre des emplacements de la carte
  porter?: Porter;
  nouveau?: boolean;
  coupDeCoeur?: boolean;
  demo?: boolean; // true = parfum fictif de démonstration
}

/* ---------- Les vrais parfums (notes vérifiées sur les sources officielles : ne pas modifier) ---------- */

const vrais: Parfum[] = [
  {
    slug: 'afnan-9pm',
    nom: '9pm',
    marque: 'Afnan',
    type: 'Eau de parfum',
    famille: 'Ambré · Épicé · Gourmand',
    categorie: 'homme',
    styles: ['vanille', 'oriental'],
    // TODO cliente : valider la description
    description:
      'Chaud et gourmand : la pomme et la cannelle d’abord, puis une vanille ambrée qui dure. Il se remarque sans crier. Fait pour sortir le soir.',
    notes: {
      tete: ['Pomme', 'Cannelle', 'Lavande', 'Bergamote'],
      coeur: ['Fleur d’oranger', 'Muguet'],
      fond: ['Vanille', 'Fève tonka', 'Ambre', 'Patchouli'],
    },
    flacon: '/parfums/flacons/afnan-9pm.webp',
    halo: 'rgba(120,110,130,.38)',
    ingredients: ['pomme', 'cannelle', 'lavande', 'vanille', 'tonka', 'fleurOranger'],
    // TODO cliente : valider
    porter: {
      moment: 'soir',
      momentDetail: 'Sorties, rendez-vous',
      saison: 'fraiche',
      saisonDetail: 'déc. → avril',
      occasion: { icone: 'sortie', titre: 'Sillage marqué', detail: 'tient la nuit' },
    },
    // TODO cliente : contenances, prix, stock
    contenances: [{ ml: 100, dispo: 'disponible' }],
    images: [],
  },
  {
    slug: 'givenchy-linterdit-rouge-ultime',
    nom: 'L’Interdit',
    sousNom: 'Rouge Ultime',
    marque: 'Givenchy',
    type: 'Eau de parfum',
    famille: 'Floral · Boisé · Chaud',
    categorie: 'femme',
    styles: ['fleuri', 'oriental'],
    // TODO cliente : valider la description
    description:
      'Une tubéreuse intense posée sur le cacao et le patchouli. Profond, sensuel, un peu audacieux. Pour les soirs où tu veux qu’on se souvienne de toi.',
    notes: {
      tete: ['Néroli', 'Fleur d’oranger', 'Jasmin'],
      coeur: ['Tubéreuse', 'Cacao'],
      fond: ['Patchouli', 'Vétiver', 'Ambroxan'],
    },
    flacon: '/parfums/flacons/givenchy-linterdit-rouge-ultime.webp',
    halo: 'rgba(196,18,48,.30)',
    ingredients: ['tubereuse', 'jasmin', 'cacao', 'fleurOranger', 'patchouli', 'vetiver'],
    // TODO cliente : valider
    porter: {
      moment: 'soir',
      momentDetail: 'Dîners, soirées',
      saison: 'fraiche',
      saisonDetail: 'déc. → avril',
      occasion: { icone: 'diner', titre: 'Audacieux', detail: 'pour être remarquée' },
    },
    // TODO cliente : contenances, prix, stock
    contenances: [{ ml: 50, dispo: 'disponible' }],
    images: [],
  },
  {
    slug: 'prada-paradoxe',
    nom: 'Paradoxe',
    marque: 'Prada',
    type: 'Eau de parfum',
    famille: 'Floral · Ambré · Musqué',
    categorie: 'femme',
    styles: ['fleuri', 'doux'],
    // TODO cliente : valider la description
    description:
      'Floral et lumineux, avec une poire juteuse et une fleur d’oranger douce. Il reste propre et élégant du matin au soir. Facile à porter toute l’année.',
    notes: {
      tete: ['Poire', 'Mandarine', 'Bergamote'],
      coeur: ['Néroli', 'Fleur d’oranger', 'Jasmin'],
      fond: ['Ambre', 'Vanille bourbon', 'Musc blanc'],
    },
    flacon: '/parfums/flacons/prada-paradoxe.webp',
    halo: 'rgba(236,160,140,.36)',
    ingredients: ['poire', 'agrume', 'fleurOranger', 'jasmin', 'vanille', 'ambre'],
    // TODO cliente : valider
    porter: {
      moment: 'jourSoir',
      momentDetail: 'du bureau au dîner',
      saison: 'annee',
      saisonDetail: 'frais comme chaud',
      occasion: { icone: 'quotidien', titre: 'Au quotidien', detail: 'élégant sans forcer' },
    },
    // TODO cliente : contenances, prix, stock
    contenances: [{ ml: 30, dispo: 'disponible' }],
    images: [],
  },
  {
    slug: 'dior-jadore',
    nom: 'J’adore',
    marque: 'Dior',
    type: 'Eau de parfum',
    famille: 'Floral · Lumineux',
    categorie: 'femme',
    styles: ['fleuri', 'frais'],
    // TODO cliente : valider la description
    description:
      'Un grand bouquet de fleurs, solaire et lumineux. Féminin, raffiné, jamais lourd. Idéal en journée et pour les grandes occasions.',
    // Pas de pyramide officielle : Dior le présente comme un bouquet
    notes: { bouquet: ['Ylang-ylang solaire', 'Rose de Damas', 'Jasmin grandiflorum & sambac'] },
    flacon: '/parfums/flacons/dior-jadore.webp',
    halo: 'rgba(214,180,100,.34)',
    ingredients: ['ylang', 'rose', 'jasmin', 'fleurOranger', 'rose', 'jasmin'],
    // TODO cliente : valider
    porter: {
      moment: 'jour',
      momentDetail: 'lumineux, solaire',
      saison: 'chaude',
      saisonDetail: 'idéal mai → oct.',
      occasion: { icone: 'ceremonie', titre: 'Cérémonies', detail: 'bureau, mariages' },
    },
    // TODO cliente : contenances, prix, stock
    contenances: [{ ml: 100, dispo: 'disponible' }],
    images: [],
  },
  {
    slug: 'paco-rabanne-1-million',
    nom: '1 Million',
    marque: 'Paco Rabanne',
    type: 'Eau de toilette',
    famille: 'Boisé · Épicé · Cuiré',
    categorie: 'homme',
    styles: ['boise', 'oriental'],
    // TODO cliente : valider la description
    description:
      'Frais au départ avec la mandarine et la menthe, puis chaud et épicé avec la cannelle et le cuir. Un sillage sucré qu’on remarque. Pour sortir entre amis.',
    notes: {
      tete: ['Mandarine', 'Pamplemousse', 'Menthe'],
      coeur: ['Cannelle', 'Épices', 'Rose'],
      fond: ['Ambre', 'Cuir', 'Bois', 'Patchouli'],
    },
    flacon: '/parfums/flacons/paco-rabanne-1-million.webp',
    halo: 'rgba(214,160,40,.32)',
    ingredients: ['agrume', 'menthe', 'cannelle', 'rose', 'ambre', 'bois'],
    // TODO cliente : valider
    porter: {
      moment: 'soir',
      momentDetail: 'sorties entre amis',
      saison: 'fraiche',
      saisonDetail: 'déc. → avril',
      occasion: { icone: 'sortie', titre: 'Sillage marqué', detail: 'chaud et sucré' },
    },
    // TODO cliente : contenances, prix, stock
    contenances: [{ ml: 100, dispo: 'disponible' }],
    images: [],
  },
];

/* ---------- Parfums fictifs de démonstration (masqués : voir AFFICHER_DEMO) ---------- */

const demos: Parfum[] = [
  {
    slug: 'rose-de-minuit',
    demo: true,
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
    demo: true,
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
    demo: true,
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
    demo: true,
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
    demo: true,
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
    demo: true,
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
    demo: true,
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
    demo: true,
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
    demo: true,
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
    demo: true,
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
    demo: true,
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
    demo: true,
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

/** Parfums affichés sur le site : les vrais, plus les fictifs si AFFICHER_DEMO. */
export const parfums: Parfum[] = [...vrais, ...(AFFICHER_DEMO ? demos : [])];

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

/** Nom complet : « L’Interdit Rouge Ultime ». */
export const nomComplet = (p: Parfum) => (p.sousNom ? `${p.nom} ${p.sousNom}` : p.nom);

/** Toutes les notes à plat (recherche, résumés). */
export const toutesLesNotes = (p: Parfum) => [
  ...(p.notes.tete ?? []),
  ...(p.notes.coeur ?? []),
  ...(p.notes.fond ?? []),
  ...(p.notes.bouquet ?? []),
];

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
