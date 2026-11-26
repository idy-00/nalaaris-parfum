/**
 * Import du catalogue dans D1 — sans rien perdre, sans rien écraser.
 *
 *   npm run seed-d1                       base locale (wrangler pages dev)
 *   npm run seed-d1 -- --cible=test       base des aperçus (en ligne)
 *   npm run seed-d1 -- --cible=prod       base du site
 *
 * Lit catalogue.generated.ts (import), reglages-parfums.ts (styles corrigés, noms publics, prix éventuels),
 * descriptions.ts et porter.ts.
 *  - Parfum absent de D1 : créé avec tout (colonnes de l'import + réglages + descriptions + « Quand le porter »).
 *  - Parfum déjà dans D1 : seules les colonnes de l'IMPORT sont mises à jour (visuels, notes, ingrédients…).
 *    Jamais les prix, le stock, les noms publics, ambiances, descriptions, conseils, drapeaux saisis dans l'admin.
 * Relançable autant de fois que voulu (après chaque `npm run import-catalogue`).
 * Contrôle final : chaque parfum du fichier est dans D1, avec son conseil et sa description ; sinon échec.
 */
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { d1 } from './wrangler.mjs';

const racine = resolve(import.meta.dirname, '..');
const cible = (process.argv.find((a) => a.startsWith('--cible='))?.split('=')[1] ?? 'local').toLowerCase();
if (!['local', 'test', 'prod'].includes(cible)) {
  console.error('--cible=local|test|prod');
  process.exit(1);
}
const charger = (f) => import(pathToFileURL(resolve(racine, 'src/data', f)).href);
const [{ catalogue }, { REGLAGES }, { PORTER }, { DESCRIPTIONS }] = await Promise.all(
  ['catalogue.generated.ts', 'reglages-parfums.ts', 'porter.ts', 'descriptions.ts'].map(charger),
);

const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => (v == null ? 'NULL' : q(JSON.stringify(v)));

const sql = [];
catalogue.forEach((p, i) => {
  const r = REGLAGES[p.slug] ?? {};
  const description = r.description ?? DESCRIPTIONS[p.slug] ?? null;
  sql.push(
    `INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES (${[
       q(p.slug), q(p.marque), q(p.nom), q(r.nom ?? null), q(p.concentration ?? null), q(p.categorie), j(p.styles), j(r.styles ?? null),
       q(p.description), q(description), j(p.notes), j(p.ingredients), j(p.images), j(PORTER[p.slug] ?? null),
       r.nouveau ? 1 : 0, r.coupDeCoeur ? 1 : 0, q(r.dispo ?? null), q('publie'), q('import'), i, q('import'),
     ].join(', ')})
     ON CONFLICT (slug) DO NOTHING;`,
  );
  // Contenances déjà saisies dans le fichier : créées si absentes, jamais modifiées ensuite
  for (const [k, c] of (r.contenances ?? []).entries()) {
    if (!(c.ml > 0)) continue;
    sql.push(
      `INSERT INTO contenances (slug, ml, prix_vente, dispo_force, ordre, maj_par)
       VALUES (${q(p.slug)}, ${c.ml}, ${q(c.prix ?? null)}, ${q(c.dispo === 'epuise' ? 'epuise' : null)}, ${k}, 'import')
       ON CONFLICT (slug, ml) DO NOTHING;`,
    );
  }
});

// Export pour une installation via la console D1, sans accès Wrangler distant.
const exportSql = process.argv.find((a) => a.startsWith('--export='))?.slice('--export='.length);
if (exportSql) {
  await writeFile(resolve(racine, exportSql), sql.join('\n') + '\n');
  console.log(`SQL exporté : ${catalogue.length} parfums (${exportSql}).`);
  process.exit(0);
}

const env = cible === 'prod' ? ['--env', 'production'] : [];
const lieu = cible === 'local' ? ['--local'] : ['--remote'];
const wrangler = (args) => d1(['execute', 'DB', ...lieu, ...env, '-y', ...args]);

const dossier = await mkdtemp(join(tmpdir(), 'nalaaris-seed-'));
const fichier = join(dossier, 'seed.sql');
await writeFile(fichier, sql.join('\n'));
try {
  console.log(`Import de ${catalogue.length} parfums dans D1 (${cible})…`);
  wrangler(['--file', fichier]);
} finally {
  await rm(dossier, { recursive: true, force: true });
}

// Contrôle : rien de perdu
const sortie = wrangler([
  '--json',
  '--command',
  `SELECT slug, porter IS NOT NULL AS porter, description IS NOT NULL AS descr, styles, nom_public FROM parfums WHERE source = 'import'`,
]);
const lignes = JSON.parse(sortie.slice(sortie.indexOf('[')))[0].results;
const parSlug = new Map(lignes.map((l) => [l.slug, l]));
const erreurs = [];
for (const p of catalogue) {
  const l = parSlug.get(p.slug);
  if (!l) erreurs.push(`${p.slug} : absent de D1`);
  else {
    if (PORTER[p.slug] && !l.porter) erreurs.push(`${p.slug} : « Quand le porter » manquant`);
    if (DESCRIPTIONS[p.slug] && !l.descr) erreurs.push(`${p.slug} : description manquante`);
    const r = REGLAGES[p.slug] ?? {};
    if (r.styles && !l.styles) erreurs.push(`${p.slug} : ambiances corrigées manquantes`);
    if (r.nom && !l.nom_public) erreurs.push(`${p.slug} : nom public manquant`);
  }
}
if (erreurs.length) {
  console.error(`Contrôle ÉCHOUÉ :\n  ${erreurs.join('\n  ')}`);
  process.exit(1);
}
const n = (f) => catalogue.filter(f).length;
console.log(
  `Contrôle OK : ${catalogue.length}/${catalogue.length} parfums, ${n((p) => PORTER[p.slug])} conseils, ` +
    `${n((p) => DESCRIPTIONS[p.slug])} descriptions, ${n((p) => REGLAGES[p.slug]?.styles)} ambiances corrigées, ` +
    `${n((p) => REGLAGES[p.slug]?.nom)} noms publics.`,
);
