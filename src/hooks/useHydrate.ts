import { useSyncExternalStore } from 'react';

const rien = () => () => {};

/**
 * false pendant le pré-rendu et l'hydratation, true ensuite.
 *
 * Pour ce qui dépend du navigateur (paramètres d'URL…) : le HTML pré-rendu n'en tient pas compte,
 * le premier rendu client doit donc l'ignorer aussi, sinon React jette le HTML (erreurs #418/#421).
 * Lors d'une navigation côté client (pas d'hydratation), vaut true dès le premier rendu : pas de flash.
 */
export const useHydrate = () =>
  useSyncExternalStore(
    rien,
    () => true,
    () => false,
  );
