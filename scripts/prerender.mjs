/**
 * Pré-rendu statique de toutes les pages (après `vite build` + `vite build --ssr`).
 *
 * Pour chaque URL : HTML rendu par React (texte visible avant le JS), balises Open Graph,
 * données structurées JSON-LD. Écrit aussi 404.html (vraie 404 sur
 * Cloudflare Pages), sitemap.xml et robots.txt.
 *
 * Cloudflare Pages sert /catalogue depuis catalogue.html, /parfum/x depuis parfum/x.html, etc.
 * Une adresse inconnue reçoit 404.html avec le statut 404.
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const racine = resolve(import.meta.dirname, '..');
const dist = resolve(racine, 'dist');
const ssr = resolve(racine, 'dist-ssr');

const { render, parfums, contacts, marque, SITE_URL } = await import(pathToFileURL(resolve(ssr, 'entry-server.js')).href);

const echapper = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const absolue = (u) => (u.startsWith('http') ? u : `${SITE_URL}${u}`);
const IMAGE_PARTAGE = '/brand/partage-1200x630.jpg';

const gabarit = await readFile(resolve(dist, 'index.html'), 'utf8');
for (const m of ['<!--app-->', '<!--og:start-->', '<!--jsonld-->']) {
  if (!gabarit.includes(m)) throw new Error(`Marqueur ${m} absent de index.html`);
}

const DISPO_SCHEMA = { disponible: 'InStock', limite: 'LimitedAvailability', epuise: 'OutOfStock' };

const magasin = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Nal’Aaris Perfumes',
  slogan: marque.devise,
  description: 'Parfums authentiques pour femmes et hommes à Dakar. Commande et conseil sur WhatsApp.',
  url: SITE_URL,
  logo: absolue('/brand/logo-nalaaris.jpg'),
  image: absolue(IMAGE_PARTAGE),
  telephone: `+${contacts.whatsappNumero}`,
  address: { '@type': 'PostalAddress', addressLocality: 'Dakar', addressCountry: 'SN' },
  sameAs: contacts.reseaux.map((r) => r.url),
};

function produit(p) {
  const image = p.images[0] ? absolue(p.images[0]) : absolue(IMAGE_PARTAGE);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.nom,
    brand: { '@type': 'Brand', name: p.marque },
    description: p.description,
    image,
    url: `${SITE_URL}/parfum/${p.slug}`,
    category: 'Parfum',
    // Une offre par contenance ; pas de prix tant qu'il n'est pas renseigné
    offers: p.contenances.map((c) => ({
      '@type': 'Offer',
      name: `${c.ml} ml`,
      availability: `https://schema.org/${DISPO_SCHEMA[c.dispo]}`,
      seller: { '@type': 'Organization', name: 'Nal’Aaris Perfumes' },
      ...(c.prix != null ? { price: c.prix, priceCurrency: 'XOF' } : {}),
    })),
  };
}

const PAGES = [
  {
    url: '/',
    fichier: 'index.html',
    titre: 'Nal’Aaris Perfumes — Parfums authentiques à Dakar',
    description:
      'Parfums authentiques pour elle et lui, à Dakar. Choisis ton parfum, envoie ta sélection sur WhatsApp, on s’occupe du reste. By Yannick & Laetitia.',
    jsonld: [magasin],
  },
  {
    url: '/catalogue',
    fichier: 'catalogue.html',
    titre: 'Catalogue · Nal’Aaris Perfumes',
    description: `Les ${parfums.length} parfums authentiques de Nal’Aaris à Dakar : cherche par nom ou marque, filtre par humeur, et commande sur WhatsApp.`,
  },
  {
    url: '/la-maison',
    fichier: 'la-maison.html',
    titre: 'La maison — Yannick & Laetitia · Nal’Aaris Perfumes',
    description: 'Une sélection de parfums authentiques choisis un par un à Dakar, et des conseils sincères sur WhatsApp.',
  },
  {
    url: '/commander',
    fichier: 'commander.html',
    titre: 'Commander & livraison · Nal’Aaris Perfumes',
    description: 'Choisis, envoie ta sélection sur WhatsApp, on confirme la livraison à Dakar et le paiement.',
  },
  ...parfums.map((p) => ({
    url: `/parfum/${p.slug}`,
    fichier: `parfum/${p.slug}.html`,
    titre: `${p.nom} — ${p.marque} · Nal’Aaris Perfumes`,
    ogTitre: `${p.nom} — ${p.marque}`,
    description: `${p.description.split('. ')[0]}. Commande sur WhatsApp, livraison à Dakar.`,
    // Image de partage par fiche : la photo du parfum quand elle sera fournie, sinon l'image générale
    image: p.images[0] ?? IMAGE_PARTAGE,
    type: 'product',
    jsonld: [produit(p)],
  })),
  {
    url: '/404',
    fichier: '404.html',
    titre: 'Page introuvable · Nal’Aaris Perfumes',
    description: 'Cette page n’existe pas ou plus.',
    noindex: true,
  },
];

for (const pg of PAGES) {
  const url = `${SITE_URL}${pg.url === '/' ? '' : pg.url}`;
  const image = absolue(pg.image ?? IMAGE_PARTAGE);
  const meta = `<!--og:start-->
    <title>${echapper(pg.titre)}</title>
    <meta name="description" content="${echapper(pg.description)}" />
    ${pg.noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${url}" />`}
    <meta property="og:type" content="${pg.type ?? 'website'}" />
    <meta property="og:site_name" content="Nal’Aaris Perfumes" />
    <meta property="og:locale" content="fr_SN" />
    <meta property="og:title" content="${echapper(pg.ogTitre ?? pg.titre)}" />
    <meta property="og:description" content="${echapper(pg.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    ${image.endsWith(IMAGE_PARTAGE) ? '<meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />' : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <!--og:end-->`;
  const jsonld = (pg.jsonld ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n    ');

  let html = gabarit
    .replace(/<!--og:start-->[\s\S]*?<!--og:end-->/, meta)
    .replace('<!--jsonld-->', jsonld)
    .replace('<!--app-->', render(pg.url));
  if (!html.includes('<h1')) throw new Error(`Rendu vide pour ${pg.url}`);

  const cible = resolve(dist, pg.fichier);
  await mkdir(resolve(cible, '..'), { recursive: true });
  await writeFile(cible, html);
}

// Plan du site et robots
const urls = PAGES.filter((p) => !p.noindex).map((p) => p.url);
await writeFile(
  resolve(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE_URL}${u === '/' ? '/' : u}</loc></url>`)
    .join('\n')}\n</urlset>\n`,
);
await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

await rm(ssr, { recursive: true, force: true });
console.log(`Pré-rendu : ${PAGES.length} pages (dont 404.html), sitemap.xml, robots.txt — base ${SITE_URL}`);
