/**
 * Visuels Instagram : capture de /carte/<slug> dans les deux thèmes (1080 × 1350).
 *   → public/parfums/cartes/<slug>-clair.jpg et <slug>-sombre.jpg
 * La version claire sert aussi d'image de partage (og:image) de la fiche.
 *
 * Lancer avec `npm run cartes` (build → capture → build, pour que les fiches pointent sur les nouvelles images).
 * Un parfum est capturé dès qu'il a son flacon détouré dans public/parfums/flacons/<slug>.webp.
 */
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { preview } from 'vite';
import { chromium } from 'playwright';

const racine = resolve(import.meta.dirname, '..');
const sortie = resolve(racine, 'public/parfums/cartes');
const slugs = (await readdir(resolve(racine, 'public/parfums/flacons')))
  .filter((f) => f.endsWith('.webp'))
  .map((f) => f.replace(/\.webp$/, ''));

await mkdir(sortie, { recursive: true });
const serveur = await preview({ root: racine, preview: { port: 4321, strictPort: false, open: false }, logLevel: 'warn' });
const base = serveur.resolvedUrls.local[0].replace(/\/$/, '');
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));

try {
  for (const slug of slugs) {
    for (const theme of ['clair', 'sombre']) {
      const r = await page.goto(`${base}/carte/${slug}?theme=${theme}`, { waitUntil: 'networkidle' });
      if (!r || r.status() !== 200 || !(await page.locator('.carte-affiche').count())) {
        console.warn(`! ${slug} : pas de carte (parfum masqué ou absent du catalogue ?)`);
        break;
      }
      // Polices et images chargées avant la photo
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))));
      });
      const cible = resolve(sortie, `${slug}-${theme}.jpg`);
      await page.locator('.carte-affiche').screenshot({ path: cible, type: 'jpeg', quality: 88 });
      console.log(`✓ parfums/cartes/${slug}-${theme}.jpg`);
    }
  }
} finally {
  await navigateur.close();
  await serveur.close();
}
if (erreurs.length) {
  console.error('Erreurs dans la page :', erreurs);
  process.exit(1);
}
