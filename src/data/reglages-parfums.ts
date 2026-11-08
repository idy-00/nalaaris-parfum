import type { ReglageParfum } from './parfums';

/**
 * Réglages de la cliente, par slug — jamais écrasés par `npm run import-catalogue`.
 *
 * Exemple :
 *   'afnan-9pm': {
 *     contenances: [{ ml: 100, prix: 25000, dispo: 'disponible' }],
 *     coupDeCoeur: true,
 *     description: 'Texte validé par la cliente.',
 *   },
 *
 * Sans contenance : la fiche affiche « Prix et contenances sur demande » et la commande passe par WhatsApp.
 * TODO cliente : prix, contenances, nouveautés et coups de cœur.
 */
export const REGLAGES: Record<string, ReglageParfum> = {};
