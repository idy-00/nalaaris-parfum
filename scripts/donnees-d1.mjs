/**
 * Avant le build : récupère les données publiques de D1 (prix, contenances, disponibilité, textes, réglages
 * boutique, avis publiés) et écrit src/data/d1.generated.json — lu par src/data/parfums.ts et infos.ts.
 *
 * Le build Cloudflare Pages n'a pas accès à D1 : on lit l'API publique du site déjà en ligne
 * (branche main → site de production ; autre branche → son dernier aperçu). Aucun secret nécessaire.
 * Seules les DIFFÉRENCES avec les fichiers du dépôt sont écrites : rien de changé = fichier quasi vide,
 * le JavaScript du site ne grossit pas.
 *
 * Repli : API injoignable → fichier supprimé, le site se construit avec les fichiers du dépôt (avertissement).
 * Forcer une source : DONNEES_URL=http://127.0.0.1:8788 npm run build. Désactiver : DONNEES_URL=aucune.
 */
import { writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const racine = resolve(import.meta.dirname, '..');
const sortie = resolve(racine, 'src/data/d1.generated.json');
const PROJET = 'nalaaris-parfum';

function source() {
  if (process.env.DONNEES_URL) return process.env.DONNEES_URL === 'aucune' ? null : process.env.DONNEES_URL;
  const branche = process.env.CF_PAGES_BRANCH;
  if (!branche) return null; // build local : fichiers du dépôt (DONNEES_URL pour tester avec D1)
  if (branche === 'main') return (process.env.VITE_SITE_URL || `https://${PROJET}.pages.dev`).replace(/\/$/, '');
  const alias = branche.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28);
  return `https://${alias}.${PROJET}.pages.dev`;
}

const base = source();
if (!base) {
  await rm(sortie, { force: true });
  console.log('Données D1 : non utilisées (build local) → fichiers du dépôt.');
  process.exit(0);
}

let api;
try {
  const r = await fetch(`${base}/api/public/catalogue?complet=1`, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  api = await r.json();
  if (!api?.parfums || typeof api.parfums !== 'object') throw new Error('réponse inattendue');
} catch (e) {
  throw new Error(`Données D1 injoignables (${base} : ${e.message}). Publication interrompue pour conserver le catalogue en ligne. Pour une première installation sans API, utiliser DONNEES_URL=aucune.`);
}

await writeFile(sortie,JSON.stringify({complet:api.complet===true,parfums:api.parfums,boutique:api.boutique??{},avis:api.avis??[]}));
console.log(`Catalogue D1 : ${Object.keys(api.parfums).length} parfums.`);
