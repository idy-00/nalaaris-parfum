import { json, type Env } from '../../../server/base';
import { connexionConfiguree, lireSession } from '../../../server/session';
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const moi = await lireSession(request, env);
  return json({ connecte: !!moi, configure: connexionConfiguree(env), prenom: moi?.prenom });
};
