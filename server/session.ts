import type { Env, Utilisateur } from './base';

const encoder = new TextEncoder();
const duree = 8 * 60 * 60;
const b64 = (v: Uint8Array) => btoa(String.fromCharCode(...v)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const octets = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
export const connexionConfiguree = (env: Env) => !!env.ADMIN_PASSWORD_HASH && (env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32;

export async function verifierMotDePasse(password: string, hash: string): Promise<boolean> {
  try {
    const [type, tours, sel, attendu] = hash.split('$');
    if (type !== 'pbkdf2_sha256' || tours !== '100000' || !sel || !attendu) return false;
    const cle = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const derive = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: octets(sel), iterations: 100000 }, cle, 256));
    const reference = octets(attendu);
    if (reference.length !== derive.length) return false;
    let diff = 0;
    for (let i = 0; i < derive.length; i++) diff |= derive[i] ^ reference[i];
    return diff === 0;
  } catch { return false; }
}

async function cleSession(env: Env) {
  return crypto.subtle.importKey('raw', encoder.encode(`${env.ADMIN_SESSION_SECRET}|${env.ADMIN_PASSWORD_HASH}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function creerSession(env: Env) {
  if (!connexionConfiguree(env)) throw new Error('Connexion non configurée');
  const payload = b64(encoder.encode(JSON.stringify({ sub: env.ADMIN_USERNAME ?? 'admin', exp: Math.floor(Date.now() / 1000) + duree, nonce: crypto.randomUUID() })));
  return `${payload}.${b64(new Uint8Array(await crypto.subtle.sign('HMAC', await cleSession(env), encoder.encode(payload))))}`;
}
export async function lireSession(req: Request, env: Env): Promise<Utilisateur | null> {
  if (!connexionConfiguree(env)) return null;
  const cookie = req.headers.get('Cookie')?.split(';').map((s) => s.trim()).find((s) => s.startsWith('nalaaris_session='))?.slice('nalaaris_session='.length);
  if (!cookie || cookie.length > 2048) return null;
  try {
    const morceaux = cookie.split('.');
    if (morceaux.length !== 2 || !await crypto.subtle.verify('HMAC', await cleSession(env), octets(morceaux[1]), encoder.encode(morceaux[0]))) return null;
    const p = JSON.parse(new TextDecoder().decode(octets(morceaux[0]))) as { sub?: string; exp?: number };
    if (p.sub !== (env.ADMIN_USERNAME ?? 'admin') || typeof p.exp !== 'number' || p.exp <= Date.now() / 1000) return null;
    return { email: p.sub, prenom: env.ADMIN_NAME ?? 'Admin' };
  } catch { return null; }
}
export function cookieSession(req: Request, token: string | null) {
  return `nalaaris_session=${token ?? ''}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${token ? duree : 0}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
