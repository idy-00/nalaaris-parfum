/** Retrait du catalogue sans effacer les pièces de vente et leurs mouvements de stock. */
export const parfumActif = (alias = 'p') =>
  `NOT EXISTS (SELECT 1 FROM reglages retrait WHERE retrait.cle = 'parfum_supprime:' || ${alias}.slug)`;
