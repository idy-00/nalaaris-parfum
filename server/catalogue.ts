/**
 * Données publiques du catalogue, calculées depuis D1. Jamais : quantité en stock, prix d'achat, ventes, clientes.
 */
import type { Env } from './base';

export type Dispo = 'disponible' | 'limite' | 'epuise' | 'sur_commande';

/**
 * Disponibilité d'une contenance : forcée par la boutique, sinon déduite du stock.
 * Stock non suivi (NULL) → null : le site n'affiche aucun badge.
 */
export function dispoContenance(c: { stock: number | null; seuil_alerte: number; dispo_force: string | null }): Dispo | null {
  if (c.dispo_force === 'sur_commande' || c.dispo_force === 'epuise') return c.dispo_force;
  if (c.stock == null) return null;
  if (c.stock <= 0) return 'epuise';
  if (c.stock <= c.seuil_alerte) return 'limite';
  return 'disponible';
}

interface LigneParfum {
  slug: string;
  nom: string;
  nom_public: string | null;
  styles: string | null;
  description: string | null;
  porter: string | null;
  nouveau: number;
  coup_de_coeur: number;
  masque: number;
  dispo_force: string | null;
}
interface LigneContenance {
  slug: string;
  ml: number;
  prix_vente: number | null;
  stock: number | null;
  seuil_alerte: number;
  dispo_force: string | null;
}

export interface Boutique {
  whatsapp?: string;
  horaires?: string;
  retrait?: boolean;
  retraitAdresse?: string;
  paiements?: string[];
  zones?: { nom: string; frais: number; delai: string }[];
}

export async function lireBoutique(db: D1Database): Promise<Boutique> {
  const r = await db.prepare("SELECT valeur FROM reglages WHERE cle = 'boutique'").first<{ valeur: string }>();
  try {
    return r ? (JSON.parse(r.valeur) as Boutique) : {};
  } catch {
    return {};
  }
}

/**
 * `complet` = version du build (descriptions, styles, conseils, réglages boutique, avis publiés).
 * Sinon version légère pour le navigateur : prix et disponibilité par contenance (~quelques Ko).
 */
export async function cataloguePublic(env: Env, complet: boolean) {
  const [parfums, contenances] = await env.DB.batch([
    env.DB.prepare(
      `SELECT slug, nom, nom_public, styles, description, porter, nouveau, coup_de_coeur, masque, dispo_force
       FROM parfums WHERE statut = 'publie' ORDER BY ordre, slug`,
    ),
    env.DB.prepare(
      `SELECT c.slug, c.ml, c.prix_vente, c.stock, c.seuil_alerte, c.dispo_force
       FROM contenances c JOIN parfums p ON p.slug = c.slug
       WHERE p.statut = 'publie' ORDER BY c.slug, c.ordre, c.ml`,
    ),
  ]);
  const parSlug = new Map<string, LigneContenance[]>();
  for (const c of contenances.results as unknown as LigneContenance[]) {
    if (!parSlug.has(c.slug)) parSlug.set(c.slug, []);
    parSlug.get(c.slug)!.push(c);
  }

  if (!complet) {
    // Format compact : { slug: [[ml, prix, dispo], …] } — seulement les parfums visibles
    const p: Record<string, [number, number | null, Dispo | null][]> = {};
    for (const x of parfums.results as unknown as LigneParfum[]) {
      if (x.masque) continue;
      p[x.slug] = (parSlug.get(x.slug) ?? []).map((c) => [c.ml, c.prix_vente, dispoContenance(c)]);
    }
    return { v: 1, p };
  }

  const json = <T>(s: string | null): T | undefined => {
    if (!s) return undefined;
    try {
      return JSON.parse(s) as T;
    } catch {
      return undefined;
    }
  };
  const sortie: Record<string, unknown> = {};
  for (const x of parfums.results as unknown as LigneParfum[]) {
    sortie[x.slug] = {
      nom: x.nom_public ?? undefined,
      styles: json<string[]>(x.styles),
      description: x.description ?? undefined,
      porter: json(x.porter),
      contenances: (parSlug.get(x.slug) ?? []).map((c) => ({ ml: c.ml, prix: c.prix_vente, dispo: dispoContenance(c) })),
      dispo: x.dispo_force ?? undefined,
      nouveau: !!x.nouveau,
      coupDeCoeur: !!x.coup_de_coeur,
      masque: !!x.masque,
    };
  }
  const avis = await env.DB.prepare(
    'SELECT prenom, ville, texte, note, date_avis AS date FROM avis WHERE publie = 1 AND accord_cliente = 1 ORDER BY date_avis DESC LIMIT 12',
  ).all();
  return { v: 1, genereLe: new Date().toISOString(), parfums: sortie, boutique: await lireBoutique(env.DB), avis: avis.results };
}
