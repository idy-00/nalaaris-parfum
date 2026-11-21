/**
 * GET /api/public/catalogue          → prix et disponibilité par contenance (navigateur, mis en cache 60 s)
 * GET /api/public/catalogue?complet=1 → toutes les données publiques (build du site)
 * Aucune donnée personnelle, ni stock chiffré, ni prix d'achat.
 */
import { erreur, json, type Env } from '../../../server/base';
import { cataloguePublic } from '../../../server/catalogue';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const url = new URL(request.url);
  const complet = url.searchParams.get('complet') === '1';
  const cleCache = new Request(`${url.origin}/api/public/catalogue`);
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const enCache = complet ? undefined : await cache?.match(cleCache).catch(() => undefined);
  if (enCache) return enCache;
  try {
    const data = await cataloguePublic(env, complet);
    const rep = json(data, 200, {
      'Cache-Control': complet ? 'no-store' : 'public, max-age=60',
      'X-Content-Type-Options': 'nosniff',
    });
    if (!complet && cache) waitUntil(cache.put(cleCache, rep.clone()).catch(() => undefined));
    return rep;
  } catch {
    return erreur(503, 'Catalogue momentanément indisponible.');
  }
};
