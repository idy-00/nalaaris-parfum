/**
 * Import du catalogue réel : catalogue.json + visuels <slug>.webp → site.
 *
 *   npm run import-catalogue -- "C:\Users\RYZEN  5\Downloads\img-nal\visuels"
 *
 * 1. lit catalogue.json (fiches au statut « valide » uniquement) ;
 * 2. génère public/parfums/<slug>/360.webp (grille mobile, q75), 480, 800, 1122.webp (q80), jamais agrandi ;
 * 3. écrit src/data/catalogue.generated.ts (format Parfum du site) ;
 * 4. régénère docs/descriptions-a-valider.md (scripts/docs-a-valider.mjs, données finales du site).
 *
 * Idempotent : relancé, il réécrit les mêmes fichiers (rien n'est dupliqué) et ne régénère une image que si
 * le visuel source est plus récent. Un parfum ajouté au catalogue apparaît au prochain import.
 * Le dossier source n'est jamais modifié (lecture seule).
 *
 * Ce que la cliente choisit (prix, contenances, nouveau, coup de cœur, description validée) ne vit PAS ici :
 * voir src/data/reglages-parfums.ts, qui n'est jamais écrasé par l'import.
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import sharp from 'sharp';

const racine = resolve(import.meta.dirname, '..');
const source = process.argv[2];
if (!source) {
  console.error('Usage : npm run import-catalogue -- "<chemin du dossier visuels>"');
  process.exit(1);
}

/* ---------- Table de correspondance notes → styles (à corriger librement) ----------
   Chaque note est comparée sans accents ni majuscules ; un motif = une expression régulière.
   Un parfum reçoit au maximum 2 styles : ceux qui comptent le plus de notes (à égalité, l'ordre ci-dessous). */
const STYLES_PAR_NOTE = {
  frais: [
    /\bagrume/, /bergamote/, /citron/, /mandarine/, /pamplemousse/, /\borange\b/, /petitgrain/, /menthe/,
    /marine/, /\bsel\b/, /gingembre/, /lavand/, /notes? vertes?/,
    // fruits (pomme, poire, ananas, fruits rouges…) : volontairement sans style
    /aloe/, /genevrier/, /\bthe\b/, /feuille/, /sauge/, /armoise/, /laurier/, /coriandre/,
  ],
  fleuri: [
    /\brose\b/, /jasmin/, /fleur d.oranger/, /neroli/, /pivoine/, /tubereuse/, /muguet/, /gardenia/,
    /ylang/, /geranium/, /\biris\b/, /violette/, /orchidee/, /magnolia/, /\blys\b/, /fleurs? blanches?/,
    /freesia/, /chevrefeuille/, /heliotrope/, /oeillet|œillet/, /belle-de-nuit/, /camomille/, /aubepine/,
    /fleur de cerisier/, /davana/,
  ],
  boise: [
    /vetiver/, /cedre/, /santal/, /patchouli/, /\bbois/, /boise/, /gaiac/, /mousse de chene/, /mousse d.arbre/,
    /papyrus/, /cashmeran/, /akigalawood/, /bouleau/,
  ],
  vanille: [
    /vanille/, /tonka/, /caramel/, /prali/, /sucre/, /\bmiel\b/, /cacao/, /chocolat/, /\bcafe\b/, /guimauve/,
    /creme/, /\blait\b/, /amande/, /noisette/, /gourmand/, /noix de coco/, /cire d.abeille/,
  ],
  oriental: [
    /\boud\b/, /encens/, /\bambr/, /epice/, /cannelle/, /cardamome/, /safran/, /poivre/, /muscade/, /\bcuir\b/,
    /labdanum/, /myrrhe/, /benjoin/, /tabac/, /\bdaim\b/, /elemi/, /cassia/, /dattes/, /reglisse/,
  ],
  doux: [/\bmusc\b/, /poudr/, /ambrette/, /aldehyde/, /mousse cristalline/],
};

const ADJECTIF = { frais: 'frais', fleuri: 'fleuri', boise: 'boisé', doux: 'doux', vanille: 'vanillé', oriental: 'oriental' };

const CONCENTRATIONS = {
  edp: 'Eau de parfum',
  'eau de parfum': 'Eau de parfum',
  'eau de toilette': 'Eau de toilette',
  'eau de parfum intense': 'Eau de parfum intense',
  'parfum intense': 'Parfum intense',
  parfum: 'Parfum',
  elixir: 'Elixir',
  extrait: 'Extrait de parfum',
};

/* ---------- Outils ---------- */
const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const minuscule = (n) => n.charAt(0).toLowerCase() + n.slice(1);
const de = (n) => (/^[aeiouyhâéèêîïôœ]/i.test(n) ? `d’${minuscule(n)}` : `de ${minuscule(n)}`);
const et = (l) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} et ${l.at(-1)}` : l[0]);
/**
 * « des notes de cardamome, de lavande et d’ambre » ; les notes qui sont déjà des « notes » ou des « accords »
 * gardent leur propre article : « des notes de musc et des notes boisées ».
 */
function liste(notes) {
  const speciale = (n) => /^(notes?|accords?)\s/i.test(n);
  const parties = [];
  const simples = notes.filter((n) => !speciale(n));
  const autres = notes.length - simples.length;
  if (simples.length) parties.push(`des notes ${autres ? simples.map(de).join(", ") : et(simples.map(de))}`);
  for (const n of notes.filter(speciale)) parties.push(/^(notes|accords)\s/i.test(n) ? `des ${minuscule(n)}` : `un ${minuscule(n)}`);
  return et(parties);
}

function concentration(brute) {
  if (!brute || /confirmer/i.test(brute)) return undefined; // inconnue : on n'affiche rien plutôt que d'inventer
  return CONCENTRATIONS[norm(brute).trim()] ?? brute;
}

function categorie(brute) {
  const c = norm(brute).replace(/\(.*\)/, '').trim();
  if (!['femme', 'homme', 'unisexe'].includes(c)) throw new Error(`Catégorie inconnue : ${brute}`);
  return c;
}

const toutes = (n) => ('bouquet' in n ? n.bouquet : [...n.tete, ...n.coeur, ...n.fond]);

function styles(notes) {
  const score = Object.fromEntries(Object.keys(STYLES_PAR_NOTE).map((s) => [s, 0]));
  for (const note of toutes(notes)) {
    const n = norm(note);
    for (const [s, motifs] of Object.entries(STYLES_PAR_NOTE)) if (motifs.some((m) => m.test(n))) score[s]++;
  }
  return Object.entries(score)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]) // tri stable : à égalité, l'ordre de la table
    .slice(0, 2)
    .map(([s]) => s);
}

/** Deux phrases factuelles, tirées des notes seulement. */
function description(notes, st) {
  const genre = st.length ? `Un parfum ${st.map((s) => ADJECTIF[s]).join(' et ')}` : 'Un parfum';
  if ('bouquet' in notes) {
    const b = notes.bouquet;
    const p1 = `${genre} qui associe ${liste(b.slice(0, 3))}.`;
    const p2 = b.length > 3 ? `On y trouve aussi ${liste(b.slice(3, 6))}.` : 'Sa pyramide détaillée (tête, cœur, fond) n’est pas publiée.';
    return `${p1} ${p2}`;
  }
  const { tete, coeur, fond } = notes;
  const p1 = tete.length ? `${genre} qui s’ouvre sur ${liste(tete.slice(0, 2))}.` : `${genre}.`;
  const parties = [];
  if (coeur.length) parties.push(`le cœur apporte ${liste(coeur.slice(0, 2))}`);
  if (fond.length) parties.push(`le fond mêle ${liste(fond.slice(0, 3))}`);
  const p2 = parties.length ? `${parties.join(', et ')}.` : '';
  return `${p1} ${p2.charAt(0).toUpperCase()}${p2.slice(1)}`.trim();
}

function notesPropres(n) {
  if (Array.isArray(n?.bouquet)) return { bouquet: n.bouquet };
  return { tete: n?.tete ?? [], coeur: n?.coeur ?? [], fond: n?.fond ?? [] };
}

async function plusRecent(src, cible) {
  if (!existsSync(cible)) return true;
  return (await stat(src)).mtimeMs > (await stat(cible)).mtimeMs;
}

/* ---------- Import ---------- */
const fiches = JSON.parse(await readFile(join(source, 'catalogue.json'), 'utf8')).filter((f) => f.statut === 'valide');
const vus = new Set();
const parfums = [];
let images = 0;

for (const f of fiches) {
  if (vus.has(f.slug)) throw new Error(`Slug en double : ${f.slug}`);
  vus.add(f.slug);
  const visuel = join(source, f.visuel_webp ?? `${f.slug}.webp`);
  if (!existsSync(visuel)) throw new Error(`Visuel manquant : ${visuel}`);

  const dossier = resolve(racine, 'public/parfums', f.slug);
  await mkdir(dossier, { recursive: true });
  // 360 : grille mobile (2 colonnes) ; qualité 75 pour cette petite taille, 80 au-delà
  for (const largeur of [360, 480, 800, 1122]) {
    const cible = join(dossier, `${largeur}.webp`);
    if (!(await plusRecent(visuel, cible))) continue;
    await sharp(visuel).resize({ width: largeur, withoutEnlargement: true }).webp({ quality: largeur === 360 ? 75 : 80 }).toFile(cible);
    images++;
  }

  const notes = notesPropres(f.notes);
  const st = styles(notes);
  parfums.push({
    slug: f.slug,
    nom: f.nom,
    marque: f.marque,
    ...(concentration(f.concentration) ? { concentration: concentration(f.concentration) } : {}),
    categorie: categorie(f.categorie),
    styles: st,
    description: description(notes, st),
    notes,
    ingredients: f.ingredients_visuels ?? [],
    images: [`/parfums/${f.slug}/1122.webp`],
  });
}

parfums.sort((a, b) => a.marque.localeCompare(b.marque, 'fr') || a.nom.localeCompare(b.nom, 'fr'));

await writeFile(
  resolve(racine, 'src/data/catalogue.generated.ts'),
  `// FICHIER GÉNÉRÉ par scripts/import-catalogue.mjs — ne pas modifier à la main (il serait écrasé).
// Prix, contenances, nouveautés, coups de cœur, descriptions validées : src/data/reglages-parfums.ts
import type { ParfumImporte } from './parfums';

export const catalogue: ParfumImporte[] = ${JSON.stringify(parfums, null, 2)};
`,
);

// Les descriptions finales (écrites à la main + réglages) : docs/descriptions-a-valider.md
await import('./docs-a-valider.mjs');

console.log(`Import : ${parfums.length} parfums, ${images} image(s) générée(s), ${parfums.filter((p) => !p.styles.length).length} sans style.`);
