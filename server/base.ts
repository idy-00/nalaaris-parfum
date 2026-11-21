/**
 * Socle commun des Pages Functions : environnement, réponses HTTP, validation des entrées, authentification Access.
 * Rien ici n'est servi tel quel : ce dossier est hors de functions/ (pas de route), importé par les Functions.
 */

import { lireSession } from './session';

export interface Env {
  ADMIN_USERNAME?: string;
  ADMIN_NAME?: string;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_SESSION_SECRET?: string;
  DB: D1Database;
  PHOTOS?: R2Bucket;
  /** Tag « Application Audience » de l'application Cloudflare Access. */
  ACCESS_AUD?: string;
  /** Ex. « nalaaris.cloudflareaccess.com ». */
  ACCESS_TEAM_DOMAIN?: string;
  /** « e-mail:Prénom,e-mail:Prénom » — le prénom sert au journal. */
  ADMIN_EMAILS?: string;
  DEPLOY_HOOK_URL?: string;
  /** Développement local uniquement (.dev.vars) : autorise l'en-tête X-Dev-Admin sur localhost. */
  DEV_AUTH?: string;
}

export interface Utilisateur {
  email: string;
  prenom: string;
}

/* ---------- Réponses ---------- */

const ENTETES_PRIVES = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

export const json = (data: unknown, status = 200, entetes: Record<string, string> = ENTETES_PRIVES) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...entetes } });

/** Erreur lisible par la cliente (le message s'affiche tel quel dans l'admin). */
export class ErreurHttp extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const erreur = (status: number, message: string) => json({ erreur: message }, status);

/** Corps JSON, borné à 256 Ko. */
export async function lireJson(req: Request): Promise<Record<string, unknown>> {
  const texte = await req.text();
  if (texte.length > 256_000) throw new ErreurHttp(413, 'Requête trop volumineuse.');
  try {
    const v = JSON.parse(texte || '{}');
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v as Record<string, unknown>;
  } catch {
    throw new ErreurHttp(400, 'Données illisibles.');
  }
}

/* ---------- Validation (toujours côté serveur) ---------- */

const invalide = (champ: string, detail: string) => new ErreurHttp(422, `${champ} : ${detail}`);

export function entier(v: unknown, champ: string, min: number, max: number): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v.replace(/\s/g, '')) : v;
  if (typeof n !== 'number' || !Number.isInteger(n)) throw invalide(champ, 'nombre entier attendu');
  if (n < min || n > max) throw invalide(champ, `entre ${min} et ${max}`);
  return n;
}

/** Entier ou null (champ vidé). */
export const entierOuNull = (v: unknown, champ: string, min: number, max: number): number | null =>
  v === null || v === '' ? null : entier(v, champ, min, max);

export function texte(v: unknown, champ: string, max: number, requis = false): string | null {
  if (v == null || (typeof v === 'string' && v.trim() === '')) {
    if (requis) throw invalide(champ, 'obligatoire');
    return null;
  }
  if (typeof v !== 'string') throw invalide(champ, 'texte attendu');
  // Caractères de contrôle retirés (sauf retours à la ligne)
  const t = v.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim();
  if (t.length > max) throw invalide(champ, `${max} caractères maximum`);
  return t;
}

export function choix<T extends string>(v: unknown, champ: string, valeurs: readonly T[]): T {
  if (typeof v !== 'string' || !valeurs.includes(v as T)) throw invalide(champ, `valeur attendue : ${valeurs.join(', ')}`);
  return v as T;
}

export const booleen = (v: unknown, champ: string): 0 | 1 => {
  if (typeof v !== 'boolean') throw invalide(champ, 'oui / non attendu');
  return v ? 1 : 0;
};

/** Téléphone sénégalais → 9 chiffres (« 771234567 »). Accepte espaces, points, +221 / 00221. */
export function telephone(v: unknown, champ = 'Téléphone'): string | null {
  const t = texte(v, champ, 30);
  if (!t) return null;
  const n = t.replace(/[\s.\-()]/g, '').replace(/^(\+|00)?221/, '');
  if (!/^(7[05678]|3[03])\d{7}$/.test(n)) throw invalide(champ, 'numéro sénégalais attendu (ex. 77 123 45 67)');
  return n;
}

export const ML_COURANTS = [30, 50, 75, 80, 90, 100, 200] as const;
export const ml = (v: unknown) => entier(v, 'Contenance (ml)', 1, 1000);
export const prix = (v: unknown, champ = 'Prix') => entierOuNull(v, champ, 0, 10_000_000);
export const slug = (v: unknown) => {
  if (typeof v !== 'string' || !/^[a-z0-9][a-z0-9-]{0,119}$/.test(v)) throw invalide('Parfum', 'identifiant invalide');
  return v;
};

export const maintenant = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

/** « afnan-9pm » à partir de « Afnan » + « 9pm ». */
export const enSlug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

/** Recherche normalisée : minuscules, sans accents, espaces simples. */
export const normaliser = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’‘`´]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/* ---------- Authentification Cloudflare Access ---------- */

/** Liste blanche « e-mail:Prénom ». */
export function equipe(env: Env): Map<string, string> {
  const m = new Map<string, string>();
  for (const entree of (env.ADMIN_EMAILS ?? '').split(',')) {
    const [email, prenom] = entree.split(':').map((s) => s.trim());
    if (email) m.set(email.toLowerCase(), prenom || email.split('@')[0]);
  }
  return m;
}

const b64url = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

interface Jwk extends JsonWebKey {
  kid?: string;
}
let cacheCles: { domaine: string; expire: number; cles: Jwk[] } | null = null;

async function clesAccess(domaine: string, forcer = false): Promise<Jwk[]> {
  if (!forcer && cacheCles && cacheCles.domaine === domaine && cacheCles.expire > Date.now()) return cacheCles.cles;
  const r = await fetch(`https://${domaine}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error(`certs Access : ${r.status}`);
  const { keys } = (await r.json()) as { keys: Jwk[] };
  cacheCles = { domaine, expire: Date.now() + 60 * 60 * 1000, cles: keys };
  return keys;
}

/**
 * Vérifie le jeton Access (en-tête Cf-Access-Jwt-Assertion) : signature RS256, audience, émetteur, dates.
 * Retourne l'e-mail vérifié, ou null. `cles` : injectable pour les tests.
 */
export async function verifierJwt(
  jeton: string,
  { aud, domaine, cles }: { aud: string; domaine: string; cles?: Jwk[] },
): Promise<string | null> {
  const morceaux = jeton.split('.');
  if (morceaux.length !== 3) return null;
  let entete: { alg?: string; kid?: string };
  let charge: { aud?: string | string[]; exp?: number; nbf?: number; iss?: string; email?: string };
  try {
    entete = JSON.parse(new TextDecoder().decode(b64url(morceaux[0])));
    charge = JSON.parse(new TextDecoder().decode(b64url(morceaux[1])));
  } catch {
    return null;
  }
  if (entete.alg !== 'RS256') return null;

  const trouver = async (forcer: boolean) => (cles ?? (await clesAccess(domaine, forcer))).find((k) => k.kid === entete.kid);
  // Clé inconnue : Access a peut-être fait tourner ses clés → un seul rechargement
  const jwk = (await trouver(false)) ?? (cles ? undefined : await trouver(true));
  if (!jwk) return null;

  const cle = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cle,
    b64url(morceaux[2]),
    new TextEncoder().encode(`${morceaux[0]}.${morceaux[1]}`),
  );
  if (!ok) return null;

  const t = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(charge.aud) ? charge.aud : [charge.aud];
  if (!audiences.includes(aud)) return null;
  if (typeof charge.exp !== 'number' || charge.exp < t - 30) return null;
  if (typeof charge.nbf === 'number' && charge.nbf > t + 30) return null;
  if (charge.iss !== `https://${domaine}`) return null;
  return typeof charge.email === 'string' ? charge.email.toLowerCase() : null;
}

/**
 * Qui fait la requête ? null = refus (401). Ne se fie jamais au seul chemin protégé par Access :
 * le jeton est vérifié ici à chaque requête, et l'e-mail doit être dans ADMIN_EMAILS.
 */
export async function authentifier(req: Request, env: Env): Promise<Utilisateur | null> {
  // Dès qu’un mot de passe est configuré, seule cette session donne accès à l’admin.
  if (env.ADMIN_PASSWORD_HASH) return lireSession(req, env);
  const liste = equipe(env);
  const url = new URL(req.url);

  // Développement local seulement : variable DEV_AUTH (fichier .dev.vars, jamais en ligne) ET adresse locale.
  const dev = req.headers.get('X-Dev-Admin');
  if (dev && env.DEV_AUTH === '1' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    const prenom = liste.get(dev.toLowerCase());
    return prenom ? { email: dev.toLowerCase(), prenom } : null;
  }

  const jeton = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!jeton || !env.ACCESS_AUD || !env.ACCESS_TEAM_DOMAIN) return null;
  try {
    const email = await verifierJwt(jeton, { aud: env.ACCESS_AUD, domaine: env.ACCESS_TEAM_DOMAIN });
    const prenom = email ? liste.get(email) : undefined;
    return email && prenom ? { email, prenom } : null;
  } catch {
    return null;
  }
}
