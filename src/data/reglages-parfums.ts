import type { ReglageParfum, Style } from './parfums';

/**
 * Réglages de la cliente, par slug — jamais écrasés par `npm run import-catalogue`.
 * Chaque champ renseigné ici passe AVANT la valeur calculée par l'import.
 *
 * Exemple :
 *   'afnan-9pm': {
 *     contenances: [{ ml: 100, prix: 25000, dispo: 'disponible' }],
 *     dispo: 'disponible',        // badge affiché seulement quand c'est renseigné ici
 *     coupDeCoeur: true,
 *     description: 'Texte validé par la cliente.',
 *   },
 *
 * - Sans contenance : la fiche affiche « Demander le prix » et la commande passe par WhatsApp.
 * - Sans `dispo` (ni contenance) : aucun badge de disponibilité, le filtre « Disponibles uniquement » reste masqué.
 * TODO cliente : prix, contenances, stock, nouveautés et coups de cœur.
 */

/**
 * Ambiances (styles) choisies à la main : le calcul automatique compte les notes et se trompe sur
 * certains parfums (un parfum du soir, de la saison fraîche, au sillage marqué n'est pas « frais »).
 * Établies d'après les notes ET le conseil « Quand le porter ». Ancienne valeur calculée en commentaire.
 */
const STYLES: Record<string, Style[]> = {
  'afnan-9pm': ['oriental', 'vanille'], // était frais / fleuri
  'ard-al-zaafaran-mousuf-wardi': ['fleuri', 'doux'], // était fleuri / boisé
  'armaf-club-de-nuit-intense-man': ['frais', 'boise'], // était frais / fleuri
  'chanel-bleu-de-chanel': ['frais', 'boise'], // était frais / oriental
  'dior-fahrenheit': ['boise', 'fleuri'], // était fleuri / frais
  'dior-hypnotic-poison': ['vanille', 'oriental'], // était vanillé / fleuri
  'giorgio-armani-armani-code-profumo': ['oriental', 'vanille'], // était oriental / frais
  'givenchy-irresistible': ['fleuri', 'doux'], // était fleuri / boisé
  'jean-paul-gaultier-le-male-elixir-absolu': ['vanille', 'oriental'], // était frais / vanillé
  'jean-paul-gaultier-le-male-le-parfum': ['oriental', 'vanille'], // était frais / fleuri
  'jean-paul-gaultier-scandal-pour-homme': ['vanille', 'boise'], // était vanillé / frais
  'kayali-vanilla-28': ['vanille', 'oriental'], // était vanillé / fleuri
  'lattafa-asad-bourbon': ['oriental', 'vanille'], // était oriental / fleuri
  'lattafa-eclaire': ['vanille', 'doux'], // était vanillé / fleuri
  'lattafa-fakhar-gold-extrait': ['oriental', 'boise'], // était oriental / frais
  'louis-vuitton-california-dream': ['frais', 'doux'], // était oriental / doux
  'paco-rabanne-1-million': ['oriental', 'boise'], // était oriental / frais
  'paris-corner-marshmallow-blush': ['vanille', 'doux'], // était vanillé / frais
  'paris-corner-rifaaqat': ['oriental', 'boise'], // était oriental / fleuri
  'tom-ford-ombre-leather': ['oriental', 'boise'], // était oriental / fleuri
  'valentino-uomo-born-in-roma': ['frais', 'boise'], // était frais / fleuri
  'yves-saint-laurent-black-opium-over-red': ['vanille', 'fleuri'], // était frais / fleuri
  'yves-saint-laurent-la-nuit-de-lhomme': ['boise', 'oriental'], // était frais / boisé
  'yves-saint-laurent-libre': ['fleuri', 'vanille'], // était frais / fleuri
  'zara-orchid': ['fleuri', 'vanille'], // était frais / fleuri
  'zara-oriental': ['oriental', 'vanille'], // était fleuri / vanillé
  'zara-pink-flambe': ['fleuri', 'vanille'], // était frais / fleuri
  'zara-seoul-532-8-sinsa-dong-gangnam-gu': ['frais'], // était frais / oriental
};

/** Noms publics : la mention « (provisoire) » reste dans les données importées, pas sur le site. */
const NOMS: Record<string, string> = {
  'ard-al-zaafaran-mousuf-blanc': 'Mousuf — pochon blanc',
  'ard-al-zaafaran-mousuf-vert': 'Mousuf — vert',
};

export const REGLAGES: Record<string, ReglageParfum> = {};

for (const [slug, styles] of Object.entries(STYLES)) (REGLAGES[slug] ??= {}).styles = styles;
for (const [slug, nom] of Object.entries(NOMS)) (REGLAGES[slug] ??= {}).nom = nom;
