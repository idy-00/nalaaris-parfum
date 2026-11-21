/**
 * POST /api/public/prevenir — « Me prévenir quand il revient », numéro laissé volontairement
 * (formulaire de la fiche, avec mention : finalité, durée 6 mois, suppression sur demande).
 */
import { ErreurHttp, entierOuNull, erreur, json, lireJson, slug, telephone, texte, type Env } from '../../../server/base';
import { estRobot, limiter } from '../../../server/limite';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const origine = request.headers.get('Origin');
  if (origine && origine !== new URL(request.url).origin) return erreur(403, 'Origine refusée.');
  if (estRobot(request.headers.get('User-Agent') ?? '')) return erreur(403, 'Refusé.');
  if (!(await limiter(request, 'prevenir', 5))) return erreur(429, 'Trop de demandes, réessaie dans une minute.');
  try {
    const b = await lireJson(request);
    const s = slug(b.slug);
    const tel = telephone(b.telephone);
    if (!tel) throw new ErreurHttp(422, 'Téléphone : obligatoire');
    const ml = entierOuNull(b.ml ?? null, 'Contenance', 1, 1000);
    const existe = await env.DB.prepare("SELECT 1 FROM parfums WHERE slug = ? AND statut = 'publie'").bind(s).first();
    if (!existe) throw new ErreurHttp(404, 'Parfum introuvable.');
    await env.DB.batch([
      // Un seul enregistrement en attente par numéro et par parfum
      env.DB.prepare(
        `INSERT INTO alertes_stock (slug, ml, prenom, telephone)
         SELECT ?1, ?2, ?3, ?4 WHERE NOT EXISTS
           (SELECT 1 FROM alertes_stock WHERE slug = ?1 AND telephone = ?4 AND prevenue_le IS NULL)`,
      ).bind(s, ml, texte(b.prenom, 'Prénom', 40), tel),
      env.DB.prepare("INSERT INTO evenements (type, slug, ml) VALUES ('me_prevenir', ?, ?)").bind(s, ml),
    ]);
    return json({ ok: true });
  } catch (e) {
    if (e instanceof ErreurHttp) return erreur(e.status, e.message);
    return erreur(500, 'Enregistrement impossible, réessaie.');
  }
};
