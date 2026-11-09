/**
 * Dérivés web des médias d'ambiance (public/media et public/media/sombre) — les maîtres ne sont jamais modifiés.
 *
 *   node scripts/derives-medias.mjs
 *
 * - gravure-vaporisateur-360|480|800.webp (qualité 70) : la gravure s'affiche en ~270 px, le maître fait 900 px (319 Ko).
 * - manifeste-roses-1440.webp (qualité 70) : bandeau plein écran sur desktop, sans servir le 1920 (567 Ko) à 1350–1440 px.
 * - grain.webp : tuile de bruit 128×128 qui remplace le filtre SVG feTurbulence + mix-blend-multiply de la brume
 *   (même rendu, mais plus aucun calcul de filtre ni de fusion à chaque image : c'était la plus longue tâche au chargement).
 * Idempotent : un dérivé n'est régénéré que si le maître est plus récent.
 */
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const media = resolve(import.meta.dirname, '../public/media');
const dossiers = [media, resolve(media, 'sombre')];

const date = async (f) => (await stat(f).catch(() => null))?.mtimeMs ?? 0;
let n = 0;
async function derive(dossier, maitre, nom, largeur) {
  const source = resolve(dossier, maitre);
  const cible = resolve(dossier, nom);
  if (!(await date(source)) || (await date(cible)) >= (await date(source))) return;
  await sharp(source).resize({ width: largeur, withoutEnlargement: true }).webp({ quality: 70 }).toFile(cible);
  n++;
}

for (const d of dossiers) {
  await derive(d, 'gravure-vaporisateur.webp', 'gravure-vaporisateur-360.webp', 360);
  await derive(d, 'gravure-vaporisateur.webp', 'gravure-vaporisateur-480.webp', 480);
  await derive(d, 'gravure-vaporisateur.webp', 'gravure-vaporisateur-800.webp', 800);
  await derive(d, 'manifeste-roses-1920.webp', 'manifeste-roses-1440.webp', 1440);
}

// Grain : noir, alpha = bruit (graine fixe → fichier identique à chaque exécution).
// Un calque noir d'alpha a×(1−n) équivaut exactement à « multiply » d'un bruit n à l'opacité a.
const grain = resolve(media, 'grain.webp');
if (!(await date(grain))) {
  const cote = 128;
  const px = Buffer.alloc(cote * cote * 4);
  let graine = 7;
  const alea = () => ((graine = (graine * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < cote * cote; i++) px[i * 4 + 3] = Math.round(255 * alea());
  await sharp(px, { raw: { width: cote, height: cote, channels: 4 } }).webp({ quality: 40, alphaQuality: 40 }).toFile(grain);
  n++;
}

console.log(`Dérivés médias : ${n} fichier(s) généré(s).`);
