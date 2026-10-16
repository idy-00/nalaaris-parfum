/** localStorage tolérant : navigation privée, stockage bloqué… le site doit marcher sans. */
export function lire<T>(cle: string, defaut: T): T {
  try {
    const brut = window.localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : defaut;
  } catch {
    return defaut;
  }
}

export function ecrire(cle: string, valeur: unknown): void {
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible : la sélection vit le temps de la visite */
  }
}
