import { ErreurHttp, type Env, type Utilisateur } from '../base';
import { parfumActif } from '../suppression';

export interface Ctx {
  req: Request;
  env: Env;
  url: URL;
  p: Record<string, string>;
  moi: Utilisateur;
}
export type Handler = (c: Ctx) => Promise<Response>;

/** Ligne de journal simple (création, suppression, action). */
export const journal = (
  c: Ctx,
  action: string,
  entite: string,
  cle: string | null,
  libelle: string | null,
  champ: string | null = null,
  avant: unknown = null,
  apres: unknown = null,
) =>
  c.env.DB.prepare(
    'INSERT INTO journal (qui, action, entite, cle, libelle, champ, avant, apres) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).bind(c.moi.prenom, action, entite, cle, libelle, champ, enTexte(avant), enTexte(apres));

const enTexte = (v: unknown) => (v == null ? null : typeof v === 'string' ? v.slice(0, 2000) : JSON.stringify(v).slice(0, 2000));

/**
 * Journalise un champ en lisant l'ANCIENNE valeur dans la même transaction que la mise à jour
 * (à placer juste avant l'UPDATE dans le même db.batch). Rien n'est écrit si la valeur ne change pas.
 * `table` et `col` viennent toujours d'une liste blanche du code, jamais du client.
 */
export const journalChamp = (
  c: Ctx,
  table: 'parfums' | 'contenances',
  col: string,
  where: string,
  binds: unknown[],
  cle: string,
  libelle: string,
  nouvelle: unknown,
) =>
  c.env.DB.prepare(
    `INSERT INTO journal (qui, action, entite, cle, libelle, champ, avant, apres)
     SELECT ?, 'modifier', ?, ?, ?, ?, CAST(${col} AS TEXT), ? FROM ${table} WHERE ${where} AND ${col} IS NOT ?`,
  ).bind(c.moi.prenom, table === 'parfums' ? 'parfum' : 'contenance', cle, libelle, col, enTexte(nouvelle), ...binds, nouvelle);

/** « Afnan 9pm » — nom affiché dans le journal et les listes. */
export async function libelleParfum(c: Ctx, slug: string): Promise<string> {
  const r = await c.env.DB.prepare(`SELECT marque, COALESCE(nom_public, nom) AS nom FROM parfums p WHERE slug = ? AND ${parfumActif()}`)
    .bind(slug)
    .first<{ marque: string; nom: string }>();
  if (!r) throw new ErreurHttp(404, 'Parfum introuvable.');
  return `${r.marque} ${r.nom}`;
}

/** Bornes de dates (Africa/Dakar = UTC). */
export const jourIso = (d: Date) => d.toISOString().slice(0, 10);
export function debutSemaine(d = new Date()): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); // lundi
  return x;
}
export const ajouterJours = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/** Cellule CSV sûre : séparateur « ; », guillemets doublés, formules neutralisées (=, +, -, @). */
export const celluleCsv = (v: unknown) => {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csv = (nom: string, entetes: string[], lignes: unknown[][]) =>
  new Response('﻿' + [entetes, ...lignes].map((l) => l.map(celluleCsv).join(';')).join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nom}"`,
      'Cache-Control': 'no-store',
    },
  });

/** Erreur SQLite de contrainte « stock >= 0 » → message clair. */
export const estRuptureStock = (e: unknown) => /CHECK constraint failed/i.test(String((e as Error)?.message ?? e)) && /stock/i.test(String((e as Error)?.message ?? e));
