import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '../dist');
const pages = ['index.html', 'catalogue.html', 'la-maison.html', 'commander.html', '404.html', ...readdirSync(join(dist, 'parfum')).map((f) => `parfum/${f}`)];
let liens = 0;
for (const fichier of [...pages, 'admin.html', 'parfum-dynamique.html']) {
  const html = readFileSync(join(dist, fichier), 'utf8');
  if (fichier === 'parfum-dynamique.html') {
    assert.ok(html.includes('<div id="root"></div>'), 'Gabarit des nouveaux parfums manquant');
  } else if (fichier !== 'admin.html') {
    assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1, `${fichier} : un seul h1`);
    assert.ok(!html.includes('<!--app-->'), `${fichier} : pré-rendu manquant`);
  }
  for (const [, url] of html.matchAll(/(?:src|href)="(\/(?:assets|admin-assets|parfums|media|brand)\/[^"?#]+)"/g)) {
    assert.ok(existsSync(join(dist, decodeURI(url))), `${fichier} : fichier absent ${url}`);
    liens++;
  }
  assert.ok(!html.includes('/src/main.tsx'), `${fichier} : entrée non compilée`);
}
const headers = readFileSync(join(dist, '_headers'), 'utf8');
assert.ok(!headers.includes('{{HASH_SCRIPTS}}'), 'CSP : hash non remplacé');
assert.ok(readFileSync(join(dist, '_redirects'), 'utf8').includes('/admin/* /admin.html 200'), 'Routes admin manquantes');
const manifeste = JSON.parse(readFileSync(join(dist, 'admin.webmanifest'), 'utf8'));
for (const icon of manifeste.icons) assert.ok(existsSync(join(dist, icon.src)), `Icône manquante : ${icon.src}`);
assert.ok(existsSync(join(dist, 'sitemap.xml')) && existsSync(join(dist, 'robots.txt')), 'SEO : fichiers manquants');
console.log(`${pages.length} pages publiques, admin, ${liens} références de fichiers, CSP, routes et manifeste : OK.`);
