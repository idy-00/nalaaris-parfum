import { registerHooks } from 'node:module';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';

// Exécute les vraies Functions TS sans émettre de fichiers dans le projet.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(url)) return { url: url.href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (!url.endsWith('.ts')) return next(url, context);
    return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
  },
});

export function base() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const f of readdirSync(new URL('../migrations/', import.meta.url)).filter((f) => f.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL(`../migrations/${f}`, import.meta.url), 'utf8'));
  class Requete {
    constructor(sql, valeurs = []) { this.sql = sql; this.valeurs = valeurs; }
    bind(...valeurs) { return new Requete(this.sql, valeurs); }
    execute() {
      const stmt = sqlite.prepare(this.sql);
      if (stmt.columns().length) return { results: stmt.all(...this.valeurs), meta: { changes: 0 } };
      const r = stmt.run(...this.valeurs);
      return { results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    }
    async all() { return this.execute(); }
    async run() { return this.execute(); }
    async first(champ) { const row = this.execute().results[0] ?? null; return champ ? row?.[champ] ?? null : row; }
  }
  const db = {
    prepare(sql) { return new Requete(sql); },
    async batch(requetes) {
      sqlite.exec('BEGIN');
      try { const r = requetes.map((r) => r.execute()); sqlite.exec('COMMIT'); return r; }
      catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    },
  };
  sqlite.exec("INSERT INTO parfums (slug, marque, nom, categorie) VALUES ('test-rose', 'Test', 'Rose', 'unisexe'); INSERT INTO contenances (slug, ml, prix_vente, prix_achat, stock) VALUES ('test-rose', 100, 25000, 10000, 5)");
  return { db, sqlite, close: () => sqlite.close() };
}

export function contexte(db, corps = {}, params = {}, chemin = '') {
  return { env: { DB: db }, req: new Request('https://test.local/api/admin/' + chemin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) }), url: new URL('https://test.local/api/admin/' + chemin), p: params, moi: { email: 'test@example.com', prenom: 'Test' } };
}
export const vente = (quantite = 1) => ({ paiement: 'wave', livraison: 'retrait', statut: 'payee', lignes: [{ slug: 'test-rose', ml: 100, quantite, prix_unitaire: 25000 }] });
export const root = fileURLToPath(new URL('../', import.meta.url));
