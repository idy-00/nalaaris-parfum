/**
 * Appel de `wrangler d1 …` depuis les scripts, sans shell (arguments passés tels quels).
 * Sous Windows, wrangler plante parfois en quittant (assertion libuv, code 3221226505) APRÈS avoir fini :
 * on juge donc sur la sortie (erreur wrangler affichée = échec), pas sur le code de retour seul.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const racine = resolve(import.meta.dirname, '..');
const bin = resolve(racine, 'node_modules/wrangler/bin/wrangler.js');

export function d1(args) {
  const r = spawnSync(process.execPath, [bin, 'd1', ...args], { cwd: racine, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const sortie = `${r.stdout ?? ''}`;
  const erreurs = `${r.stderr ?? ''}`;
  const plantageSortie = r.status === 3221226505 || /UV_HANDLE_CLOSING/.test(erreurs);
  if (/\[ERROR\]|✘|X \[/.test(sortie + erreurs) || (r.status !== 0 && !plantageSortie)) {
    throw new Error(`wrangler d1 ${args.slice(0, 2).join(' ')} a échoué :\n${erreurs || sortie}`);
  }
  return sortie;
}
