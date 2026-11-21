import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const fichier = resolve(import.meta.dirname, '../.dev.vars');
const password = process.env.NALAARIS_MOT_DE_PASSE || `Nala-${randomBytes(9).toString('base64url')}!`;
if (password.length < 12 || password.length > 256) throw new Error('Utilise un mot de passe de 12 à 256 caractères.');
const salt = randomBytes(16);
const hash = `pbkdf2_sha256$100000$${salt.toString('base64url')}$${pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('base64url')}`;
const secret = randomBytes(32).toString('base64url');
const avant = await readFile(fichier, 'utf8').catch(() => '');
const conserve = avant.split(/\r?\n/).filter((l) => !/^(ADMIN_USERNAME|ADMIN_NAME|ADMIN_PASSWORD_HASH|ADMIN_SESSION_SECRET)=/.test(l)).join('\n').trimEnd();
await writeFile(fichier, `${conserve}\nADMIN_USERNAME=admin\nADMIN_NAME=Admin\nADMIN_PASSWORD_HASH="${hash}"\nADMIN_SESSION_SECRET="${secret}"\n`, { mode: 0o600 });
console.log(`Identifiant : admin\nMot de passe local : ${password}\nConfiguration enregistrée dans .dev.vars (ignoré par Git).\nPour la production, reporter ADMIN_USERNAME, ADMIN_NAME, ADMIN_PASSWORD_HASH et ADMIN_SESSION_SECRET dans les variables Cloudflare.`);
