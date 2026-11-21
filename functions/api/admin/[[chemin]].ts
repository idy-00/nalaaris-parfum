/** Toutes les routes /api/admin/* (l'authentification est faite par _middleware.ts). */
import { ErreurHttp, erreur, type Env, type Utilisateur } from '../../../server/base';
import { trouverRoute } from '../../../server/admin/routes';

export const onRequest: PagesFunction<Env, 'chemin', { moi: Utilisateur }> = async ({ request, env, params, data }) => {
  const segments = Array.isArray(params.chemin) ? params.chemin : params.chemin ? [params.chemin] : [];
  const trouve = trouverRoute(request.method, segments);
  if (!trouve) return erreur(404, 'Route inconnue.');
  try {
    return await trouve.handler({ req: request, env, url: new URL(request.url), p: trouve.params, moi: data.moi });
  } catch (e) {
    if (e instanceof ErreurHttp) return erreur(e.status, e.message);
    const message = String((e as Error)?.message ?? e);
    if (message.includes('vente_annulee')) return erreur(409, 'Cette vente a déjà été annulée. Recharge la page.');
    if (message.includes('contenance_introuvable')) return erreur(422, 'Cette contenance n’existe plus. Recharge le catalogue.');
    if (message.includes('contenance_utilisee')) return erreur(409, 'Ce format est utilisé dans une vente. Masque le parfum ou indique-le épuisé pour arrêter sa vente.');
    console.error(e);
    return erreur(500, 'Erreur inattendue. Réessaie dans un instant.');
  }
};
