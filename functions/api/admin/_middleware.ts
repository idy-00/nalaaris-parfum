/**
 * Garde de toutes les routes /api/admin/* — en plus de Cloudflare Access devant le chemin :
 *  1. jeton Access vérifié ici (signature, audience, émetteur, dates) + e-mail dans ADMIN_EMAILS → sinon 401 ;
 *  2. écritures : en-tête X-Nalaaris obligatoire (impossible à poser depuis un autre site sans autorisation CORS)
 *     et Origin identique s'il est présent → protège contre les requêtes intersites (CSRF).
 */
import { authentifier, erreur, type Env, type Utilisateur } from '../../../server/base';

export const onRequest: PagesFunction<Env, string, { moi: Utilisateur }> = async (ctx) => {
  const { request, env } = ctx;
  const moi = await authentifier(request, env);
  if (!moi) return erreur(401, 'Connexion requise.');

  if (!['GET', 'HEAD'].includes(request.method)) {
    const origine = request.headers.get('Origin');
    if (request.headers.get('X-Nalaaris') !== '1' || (origine && origine !== new URL(request.url).origin)) {
      return erreur(403, 'Requête refusée.');
    }
  }
  ctx.data.moi = moi;
  const rep = await ctx.next();
  return rep;
};
