/**
 * Prix et disponibilité « en direct » : après l'hydratation, quand le navigateur est libre, on lit
 * /api/public/catalogue (cache edge 60 s, quelques Ko) et on met à jour les valeurs affichées.
 * Un prix modifié dans l'admin apparaît ainsi en moins d'une minute, avant même la republication.
 *
 * Zéro saut de mise en page (CLS) : seule la VALEUR d'une contenance déjà affichée change (prix, disponibilité).
 * Si la forme change (contenance ajoutée / retirée, premier prix, premier badge), on attend la republication
 * (bouton « Publier sur le site ») : le HTML pré-rendu est alors refait proprement.
 */
import { useSyncExternalStore } from 'react';
import { parfums, type Dispo } from '../data/parfums';

let version = 0;
const abonnes = new Set<() => void>();
const abonner = (f: () => void) => {
  abonnes.add(f);
  return () => abonnes.delete(f);
};

/** À appeler dans un composant qui affiche un prix ou une disponibilité : il se redessine après la mise à jour. */
export const useVivant = () => useSyncExternalStore(abonner, () => version, () => 0);

const DISPOS = ['disponible', 'limite', 'epuise', 'sur_commande'];

export async function chargerCatalogueVivant() {
  if (!('fetch' in window) || navigator.webdriver) return;
  try {
    const r = await fetch('/api/public/catalogue', { credentials: 'omit' });
    if (!r.ok) return;
    const { p } = (await r.json()) as { p?: Record<string, [number, number | null, Dispo | null][]> };
    if (!p) return;
    let change = false;
    for (const parfum of parfums) {
      const frais = p[parfum.slug];
      if (!frais || frais.length !== parfum.contenances.length) continue;
      // Même forme exigée : mêmes contenances, prix présent / absent et badge présent / absent identiques
      const memeForme = parfum.contenances.every((c, i) => {
        const [ml, prix, dispo] = frais[i];
        return c.ml === ml && (c.prix == null) === (prix == null) && !c.dispo === !dispo && (!dispo || DISPOS.includes(dispo));
      });
      if (!memeForme) continue;
      parfum.contenances.forEach((c, i) => {
        const [, prix, dispo] = frais[i];
        if (c.prix !== (prix ?? undefined) || c.dispo !== (dispo ?? undefined)) {
          c.prix = prix ?? undefined;
          c.dispo = dispo ?? undefined;
          change = true;
        }
      });
    }
    if (change) {
      version++;
      abonnes.forEach((f) => f());
    }
  } catch {
    /* hors ligne, API absente : les données du build restent affichées */
  }
}
