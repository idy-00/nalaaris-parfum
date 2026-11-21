import { erreur, json, type Env } from '../../../server/base';
import { cookieSession } from '../../../server/session';
export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  if (request.headers.get('Origin') !== new URL(request.url).origin || request.headers.get('X-Nalaaris') !== '1') return erreur(403, 'Requête refusée.');
  return json({ ok: true }, 200, { 'Cache-Control': 'no-store', 'Set-Cookie': cookieSession(request, null) });
};
