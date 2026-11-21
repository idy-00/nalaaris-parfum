/**
 * POST /api/evt — statistiques du site (navigator.sendBeacon). Sans cookie, sans IP, sans identifiant :
 * type d'événement, slug, contenance, recherche normalisée, appareil, domaine d'origine, date.
 * Répond toujours 204 (un beacon n'attend rien) ; robots et abus ignorés en silence.
 */
import { normaliser, type Env } from '../../server/base';
import { appareil, estRobot, limiter } from '../../server/limite';

const TYPES = ['vue_fiche', 'clic_commander', 'clic_whatsapp_general', 'recherche', 'ajout_selection', 'me_prevenir'];
const AVEC_SLUG = ['vue_fiche', 'clic_commander', 'ajout_selection', 'me_prevenir'];
const PLAFOND_JOUR = 20_000;
const vide = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ua = request.headers.get('User-Agent') ?? '';
  if (estRobot(ua)) return vide();
  const origine = request.headers.get('Origin');
  if (origine && origine !== new URL(request.url).origin) return vide();
  if (!(await limiter(request, 'evt', 30))) return vide();

  let b: Record<string, unknown>;
  try {
    const t = await request.text();
    if (t.length > 2000) return vide();
    b = JSON.parse(t);
    if (!b || typeof b !== 'object') return vide();
  } catch {
    return vide();
  }
  const type = typeof b.t === 'string' && TYPES.includes(b.t) ? b.t : null;
  if (!type) return vide();
  const slug = typeof b.s === 'string' && /^[a-z0-9][a-z0-9-]{0,119}$/.test(b.s) ? b.s : null;
  const ml = Number.isInteger(b.ml) && (b.ml as number) > 0 && (b.ml as number) <= 1000 ? (b.ml as number) : null;
  const texte = type === 'recherche' && typeof b.q === 'string' ? normaliser(b.q).slice(0, 60) : null;
  const nb = type === 'recherche' && Number.isInteger(b.n) && (b.n as number) >= 0 ? Math.min(b.n as number, 999) : null;
  const ref = typeof b.o === 'string' && /^[a-z0-9.-]{3,80}$/i.test(b.o) ? b.o.toLowerCase().replace(/^www\./, '') : null;
  if (type === 'recherche' && (!texte || texte.length < 2)) return vide();
  if (AVEC_SLUG.includes(type) && !slug) return vide();

  const jour = new Date().toISOString().slice(0, 10);
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO compteurs (jour, n) VALUES (?1, 1) ON CONFLICT (jour) DO UPDATE SET n = n + 1').bind(jour),
      env.DB.prepare(
        `INSERT INTO evenements (type, slug, ml, texte, nb_resultats, appareil, origine)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE (SELECT n FROM compteurs WHERE jour = ?8) <= ?9`,
      ).bind(type, slug, ml, texte, nb, appareil(ua), ref, jour, PLAFOND_JOUR),
    ]);
  } catch {
    /* statistiques : jamais bloquant */
  }
  return vide();
};
