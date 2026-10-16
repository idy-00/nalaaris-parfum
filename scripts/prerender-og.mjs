/**
 * Génère une page HTML par fiche (dist/parfum/<slug>.html) avec ses balises Open Graph.
 * WhatsApp, Instagram et Facebook n'exécutent pas le JavaScript : sans ce fichier,
 * tous les liens partagés afficheraient l'aperçu de l'accueil.
 * L'application React prend ensuite le relais normalement dans le navigateur.
 *
 * Lit src/data/parfums.ts sans dépendance supplémentaire (transpilation TS minimale).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import ts from 'typescript';

const racine = resolve(import.meta.dirname, '..');
const dist = resolve(racine, 'dist');
const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://nalaaris.pages.dev').replace(/\/$/, '');

// Charge le catalogue TypeScript
const source = await readFile(resolve(racine, 'src/data/parfums.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const tmp = resolve(dist, '.parfums.tmp.mjs');
await writeFile(tmp, js);
const { parfums } = await import(pathToFileURL(tmp).href);

const echapper = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const gabarit = await readFile(resolve(dist, 'index.html'), 'utf8');
if (!gabarit.includes('<!--og:start-->')) throw new Error('Marqueurs <!--og:start--> / <!--og:end--> absents de index.html');

await mkdir(resolve(dist, 'parfum'), { recursive: true });

for (const p of parfums) {
  const titre = `${p.nom} — ${p.marque} · Nal’Aaris Perfumes`;
  const description = `${p.description.split('. ')[0]}. Commande sur WhatsApp, livraison à Dakar.`;
  const image = p.images[0] ? `${SITE_URL}${p.images[0]}` : `${SITE_URL}/brand/logo-nalaaris.jpg`;
  const url = `${SITE_URL}/parfum/${p.slug}`;
  const meta = `<!--og:start-->
    <title>${echapper(titre)}</title>
    <meta name="description" content="${echapper(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="Nal’Aaris Perfumes" />
    <meta property="og:locale" content="fr_SN" />
    <meta property="og:title" content="${echapper(`${p.nom} — ${p.marque}`)}" />
    <meta property="og:description" content="${echapper(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:alt" content="${echapper(`${p.nom}, ${p.marque}`)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <!--og:end-->`;
  const html = gabarit.replace(/<!--og:start-->[\s\S]*?<!--og:end-->/, meta);
  await writeFile(resolve(dist, 'parfum', `${p.slug}.html`), html);
}

// Pages intérieures (garder en phase avec src/lib/routes.ts et les useSeo des pages)
const PAGES = [
  {
    fichier: 'catalogue.html',
    chemin: '/catalogue',
    titre: 'Catalogue · Nal’Aaris Perfumes',
    description: `Les ${parfums.length} parfums authentiques de Nal’Aaris à Dakar : cherche par nom ou marque, filtre par humeur, et commande sur WhatsApp.`,
    image: '/media/humeur-oriental-900.webp',
  },
  {
    fichier: 'la-maison.html',
    chemin: '/la-maison',
    titre: 'La maison — Yannick & Laetitia · Nal’Aaris Perfumes',
    description: 'Une sélection de parfums authentiques choisis un par un à Dakar, et des conseils sincères sur WhatsApp.',
    image: '/media/univers-bouquet-1100.webp',
  },
  {
    fichier: 'commander.html',
    chemin: '/commander',
    titre: 'Commander & livraison · Nal’Aaris Perfumes',
    description: 'Choisis, envoie ta sélection sur WhatsApp, on confirme la livraison à Dakar et le paiement (Wave, Orange Money, espèces).',
    image: '/brand/logo-nalaaris.jpg',
  },
];
for (const pg of PAGES) {
  const url = `${SITE_URL}${pg.chemin}`;
  const meta = `<!--og:start-->
    <title>${echapper(pg.titre)}</title>
    <meta name="description" content="${echapper(pg.description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Nal’Aaris Perfumes" />
    <meta property="og:locale" content="fr_SN" />
    <meta property="og:title" content="${echapper(pg.titre)}" />
    <meta property="og:description" content="${echapper(pg.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE_URL}${pg.image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <!--og:end-->`;
  await writeFile(resolve(dist, pg.fichier), gabarit.replace(/<!--og:start-->[\s\S]*?<!--og:end-->/, meta));
}

// Plan du site pour les moteurs de recherche
const urls = ['/', ...PAGES.map((p) => p.chemin), ...parfums.map((p) => `/parfum/${p.slug}`)];
await writeFile(
  resolve(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
);
await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

// Accueil : URL absolue pour l'image par défaut
await writeFile(
  resolve(dist, 'index.html'),
  gabarit.replace('content="/brand/logo-nalaaris.jpg"', `content="${SITE_URL}/brand/logo-nalaaris.jpg"`),
);

const { rm } = await import('node:fs/promises');
await rm(tmp);
console.log(`Open Graph : ${parfums.length} fiches + ${PAGES.length} pages générées, sitemap.xml + robots.txt (base ${SITE_URL})`);
