/**
 * Écrit docs/descriptions-a-valider.md à partir des données FINALES du site :
 * catalogue importé + descriptions écrites à la main (src/data/descriptions.ts)
 * + réglages de la cliente (src/data/reglages-parfums.ts : nom public, styles, description validée).
 *
 *   npm run docs-a-valider        (lancé aussi à la fin de npm run import-catalogue)
 *
 * Node ≥ 22.18 lit directement les fichiers .ts (types effacés).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const racine = resolve(import.meta.dirname, '..');
const charger = (f) => import(pathToFileURL(resolve(racine, 'src/data', f)).href);
const { catalogue } = await charger('catalogue.generated.ts');
const { DESCRIPTIONS } = await charger('descriptions.ts');
const { REGLAGES } = await charger('reglages-parfums.ts');

const LIBELLES = { frais: 'Frais', fleuri: 'Fleuri', boise: 'Boisé', doux: 'Doux', vanille: 'Vanillé', oriental: 'Oriental' };
const styles = (l) => l.map((s) => LIBELLES[s] ?? s).join(', ') || '—';

const lignes = catalogue.map((p, i) => {
  const r = REGLAGES[p.slug] ?? {};
  const nom = r.nom ?? p.nom;
  const source = r.description ? 'validée' : DESCRIPTIONS[p.slug] ? 'à valider' : 'automatique';
  const description = r.description ?? DESCRIPTIONS[p.slug] ?? p.description;
  const st = r.styles ? `${styles(r.styles)} <br><small>corrigé (calcul : ${styles(p.styles)})</small>` : styles(p.styles);
  const conc = p.concentration ? ` (${p.concentration})` : ' (concentration à confirmer)';
  return `| ${i + 1} | **${p.marque} — ${nom}**${conc} <br>\`${p.slug}\` | ${st} | ${description} <br><small>${source}</small> |`;
});

await mkdir(resolve(racine, 'docs'), { recursive: true });
await writeFile(
  resolve(racine, 'docs/descriptions-a-valider.md'),
  `# Descriptions à valider (${catalogue.length} parfums)

Deux phrases par parfum : **la sensation, puis l'usage** (moment, saison, occasion de « Quand le porter »).
La pyramide de notes s'affiche juste en dessous sur la fiche : elle n'est pas répétée ici.
Rédigées à partir des notes et des conseils uniquement : aucune année, aucun parfumeur, aucune tenue chiffrée, aucun superlatif.

- **Corriger une description** : l'écrire dans \`src/data/reglages-parfums.ts\` (champ \`description\`), elle passe avant tout le reste.
  Sinon, elle vient de \`src/data/descriptions.ts\` (écrites à la main), sinon de l'import automatique.
- **Ambiances (styles)** : calculées d'après les notes à l'import ; les corrections manuelles sont dans \`src/data/reglages-parfums.ts\`
  (table \`STYLES\`), avec l'ancienne valeur en commentaire.
- Ce fichier est régénéré par \`npm run docs-a-valider\` (et à chaque \`npm run import-catalogue\`).

| # | Parfum | Ambiances | Description |
|---|---|---|---|
${lignes.join('\n')}
`,
);
console.log(`docs/descriptions-a-valider.md : ${catalogue.length} parfums.`);
