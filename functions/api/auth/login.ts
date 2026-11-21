import { erreur, json, lireJson, type Env } from '../../../server/base';
import { connexionConfiguree, cookieSession, creerSession, verifierMotDePasse } from '../../../server/session';
import { limiter } from '../../../server/limite';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (request.headers.get('Origin') !== new URL(request.url).origin || request.headers.get('X-Nalaaris') !== '1') return erreur(403, 'Requête refusée.');
  if (!connexionConfiguree(env)) return erreur(503, 'Le mot de passe administrateur doit être configuré sur le serveur.');
  if (!await limiter(request, 'connexion', 5)) return erreur(429, 'Trop de tentatives. Réessaie dans une minute.');
  try {
    const b = await lireJson(request);
    if (typeof b.identifiant !== 'string' || typeof b.motDePasse !== 'string' || b.motDePasse.length > 256 || b.identifiant.length > 80) return erreur(401, 'Identifiant ou mot de passe incorrect.');
    const valide = await verifierMotDePasse(b.motDePasse, env.ADMIN_PASSWORD_HASH!);
    if (!valide || b.identifiant !== (env.ADMIN_USERNAME ?? 'admin')) return erreur(401, 'Identifiant ou mot de passe incorrect.');
    return json({ ok: true }, 200, { 'Cache-Control': 'no-store', 'Set-Cookie': cookieSession(request, await creerSession(env)) });
  } catch { return erreur(400, 'Données de connexion illisibles.'); }
};
