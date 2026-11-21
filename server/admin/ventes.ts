/**
 * Ventes notées depuis WhatsApp. Le stock bouge dans la MÊME transaction que la vente :
 * la contrainte SQL `stock >= 0` fait échouer tout le lot si un flacon manque (rien n'est enregistré).
 */
import { ErreurHttp, choix, entier, json, lireJson, maintenant, ml as validerMl, slug as validerSlug, telephone, texte } from '../base';
import { ajouterJours, csv, debutSemaine, estRuptureStock, journal, jourIso, type Ctx } from './commun';

const PAIEMENTS = ['wave', 'orange_money', 'especes', 'autre'] as const;
const STATUTS = ['a_livrer', 'livree', 'payee'] as const;
const LIVRAISONS = ['retrait', 'livraison'] as const;

interface Ligne {
  slug: string;
  ml: number;
  quantite: number;
  prix_unitaire: number;
}

function validerLignes(v: unknown): Ligne[] {
  if (!Array.isArray(v) || !v.length || v.length > 20) throw new ErreurHttp(422, 'Parfums : 1 à 20 lignes');
  const lignes = v.map((x: Record<string, unknown>) => ({
    slug: validerSlug(x?.slug),
    ml: validerMl(x?.ml),
    quantite: entier(x?.quantite, 'Quantité', 1, 50),
    prix_unitaire: entier(x?.prix_unitaire, 'Prix', 0, 10_000_000),
  }));
  // Une même contenance deux fois : on regroupe (le contrôle du stock reste juste)
  const m = new Map<string, Ligne>();
  for (const l of lignes) {
    const k = `${l.slug}|${l.ml}`;
    const deja = m.get(k);
    if (deja && deja.prix_unitaire !== l.prix_unitaire) throw new ErreurHttp(422, 'Même parfum et même contenance avec deux prix : une seule ligne.');
    if (deja) deja.quantite = entier(deja.quantite + l.quantite, 'Quantité', 1, 50);
    else m.set(k, { ...l });
  }
  return [...m.values()];
}

/** Champs de la vente (création : tous ; modification : ceux envoyés). */
function validerVente(b: Record<string, unknown>, partiel: boolean) {
  const v: Record<string, unknown> = {};
  const a = (k: string) => !partiel || k in b;
  if (a('statut')) v.statut = choix(b.statut, 'Statut', STATUTS);
  if (a('paiement')) v.paiement = choix(b.paiement, 'Paiement', PAIEMENTS);
  if (a('livraison')) v.livraison = choix(b.livraison, 'Livraison', LIVRAISONS);
  if (a('zone')) v.zone = texte(b.zone, 'Zone', 60);
  if (a('frais_livraison')) v.frais_livraison = b.frais_livraison == null || b.frais_livraison === '' ? 0 : entier(b.frais_livraison, 'Frais de livraison', 0, 1_000_000);
  if (a('client_prenom')) v.client_prenom = texte(b.client_prenom, 'Prénom', 40);
  if (a('client_tel')) v.client_tel = telephone(b.client_tel);
  if (a('note')) v.note = texte(b.note, 'Note', 300);
  if (a('date_vente')) {
    const d = b.date_vente == null || b.date_vente === '' ? maintenant() : texte(b.date_vente, 'Date', 30)!;
    const t = Date.parse(d);
    if (Number.isNaN(t) || t > Date.now() + 86_400_000 || t < Date.UTC(2024, 0, 1)) throw new ErreurHttp(422, 'Date : invalide');
    v.date_vente = new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  if (v.livraison === 'retrait') {
    v.zone = null;
    v.frais_livraison = 0;
  }
  return v;
}

const insererLignes = (c: Ctx, lignes: Ligne[], venteId: number | null, historiques?: Map<string, number | null>) =>
  lignes.map((l) =>
    c.env.DB.prepare(
      `INSERT INTO lignes_vente (vente_id, slug, ml, quantite, prix_unitaire, prix_achat_unitaire)
        VALUES (${venteId == null ? '(SELECT max(id) FROM ventes)' : '?'}, ?, ?, ?, ?, ${historiques?.has(`${l.slug}|${l.ml}`) ? '?' : '(SELECT prix_achat FROM contenances WHERE slug = ? AND ml = ?)'})`,
    ).bind(...(venteId == null ? [] : [venteId]), l.slug, l.ml, l.quantite, l.prix_unitaire,
      ...(historiques?.has(`${l.slug}|${l.ml}`) ? [historiques.get(`${l.slug}|${l.ml}`)] : [l.slug, l.ml])),
  );

/** Message clair quand le stock manque : « Stock insuffisant : il reste 1 flacon de Afnan 9pm 100 ml. » */
async function messageRupture(c: Ctx, lignes: Ligne[]): Promise<string> {
  for (const l of lignes) {
    const r = await c.env.DB.prepare(
      `SELECT c.stock, p.marque || ' ' || COALESCE(p.nom_public, p.nom) AS libelle
       FROM contenances c JOIN parfums p ON p.slug = c.slug WHERE c.slug = ? AND c.ml = ?`,
    )
      .bind(l.slug, l.ml)
      .first<{ stock: number | null; libelle: string }>();
    if (r && r.stock != null && r.stock < l.quantite) {
      const reste = r.stock === 0 ? 'plus aucun flacon' : `${r.stock} flacon${r.stock > 1 ? 's' : ''}`;
      return `Stock insuffisant : il reste ${reste} de ${r.libelle} ${l.ml} ml (demandé : ${l.quantite}). Corrige le stock dans le catalogue si besoin.`;
    }
  }
  return 'Stock insuffisant pour cette vente.';
}

async function verifierParfums(c: Ctx, lignes: Ligne[]) {
  const slugs = [...new Set(lignes.map((l) => l.slug))];
  const r = await c.env.DB.prepare(`SELECT slug FROM parfums WHERE slug IN (${slugs.map(() => '?').join(',')})`).bind(...slugs).all();
  if (r.results.length !== slugs.length) throw new ErreurHttp(404, 'Parfum introuvable.');
  for (const l of lignes) {
    const existe = await c.env.DB.prepare('SELECT 1 FROM contenances WHERE slug = ? AND ml = ?').bind(l.slug, l.ml).first();
    if (!existe) throw new ErreurHttp(422, 'Cette contenance n’existe plus. Recharge le catalogue.');
  }
}

const resume = (lignes: Ligne[]) => lignes.map((l) => `${l.slug} ${l.ml} ml ×${l.quantite} à ${l.prix_unitaire}`).join(' + ');

/** POST /ventes */
export async function creer(c: Ctx) {
  const b = await lireJson(c.req);
  const lignes = validerLignes(b.lignes);
  const v = validerVente(b, false);
  await verifierParfums(c, lignes);
  const total = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0) + (v.frais_livraison as number);
  const avant = await stocks(c, lignes);
  try {
    const resultats = await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO ventes (date_vente, statut, paiement, livraison, zone, frais_livraison, client_prenom, client_tel, total, note, cree_par)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(v.date_vente, v.statut, v.paiement, v.livraison, v.zone, v.frais_livraison, v.client_prenom, v.client_tel, total, v.note, c.moi.prenom),
      ...insererLignes(c, lignes, null),
      c.env.DB.prepare(
        `INSERT INTO journal (qui, action, entite, cle, libelle, apres) SELECT ?, 'ajouter', 'vente', CAST(max(id) AS TEXT), ?, ? FROM ventes`,
      ).bind(c.moi.prenom, `Vente ${total} FCFA`, resume(lignes)),
    ]);
    const id = resultats[0].meta.last_row_id;
    const apres = await stocks(c, lignes);
    return json({ ...(await lireVente(c, id)), stocks: lignes.map((l, i) => ({ slug: l.slug, ml: l.ml, avant: avant[i], apres: apres[i] })) }, 201);
  } catch (e) {
    if (estRuptureStock(e)) throw new ErreurHttp(409, await messageRupture(c, lignes));
    throw e;
  }
}

const stocks = async (c: Ctx, lignes: Ligne[]) =>
  Promise.all(
    lignes.map(async (l) => (await c.env.DB.prepare('SELECT stock FROM contenances WHERE slug = ? AND ml = ?').bind(l.slug, l.ml).first<{ stock: number | null }>())?.stock ?? null),
  );

async function lireVente(c: Ctx, id: number): Promise<Record<string, unknown> & { lignes: Record<string, unknown>[] }> {
  const v = await c.env.DB.prepare('SELECT * FROM ventes WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!v) throw new ErreurHttp(404, 'Vente introuvable.');
  const l = await c.env.DB.prepare(
    `SELECT l.slug, l.ml, l.quantite, l.prix_unitaire, l.prix_achat_unitaire, p.marque, COALESCE(p.nom_public, p.nom) AS nom
     FROM lignes_vente l LEFT JOIN parfums p ON p.slug = l.slug WHERE l.vente_id = ? ORDER BY l.id`,
  )
    .bind(id)
    .all();
  return { ...v, lignes: l.results };
}

/** GET /ventes/top — les 5 parfums les plus vendus (90 jours), proposés en premier dans « + Vente ». */
export async function top(c: Ctx) {
  const r = await c.env.DB.prepare(
    `SELECT l.slug, sum(l.quantite) AS n FROM lignes_vente l JOIN ventes v ON v.id = l.vente_id
     WHERE v.statut != 'annulee' AND v.date_vente >= ? GROUP BY l.slug ORDER BY n DESC LIMIT 5`,
  )
    .bind(ajouterJours(new Date(), -90).toISOString())
    .all<{ slug: string; n: number }>();
  return json(r.results);
}

/** GET /ventes/:id */
export const lire = async (c: Ctx) => json(await lireVente(c, entier(c.p.id, 'Vente', 1, 1e12)));

/** Filtre période / statut / paiement → clause SQL paramétrée. */
function filtres(c: Ctx) {
  const sp = c.url.searchParams;
  const conds: string[] = [];
  const binds: unknown[] = [];
  const auj = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  const periode = sp.get('periode') ?? 'mois';
  const debut =
    periode === 'jour'
      ? auj
      : periode === 'semaine'
        ? debutSemaine()
        : periode === 'mois'
          ? new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), 1))
          : periode === 'mois_precedent'
            ? new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth() - 1, 1))
            : null;
  if (debut) {
    conds.push('v.date_vente >= ?');
    binds.push(debut.toISOString());
  }
  if (periode === 'mois_precedent') {
    conds.push('v.date_vente < ?');
    binds.push(new Date(Date.UTC(auj.getUTCFullYear(), auj.getUTCMonth(), 1)).toISOString());
  }
  const statut = sp.get('statut');
  if (statut) {
    conds.push('v.statut = ?');
    binds.push(choix(statut, 'Statut', [...STATUTS, 'annulee'] as const));
  } else if (sp.get('annulees') !== '1') conds.push("v.statut != 'annulee'");
  const paiement = sp.get('paiement');
  if (paiement) {
    conds.push('v.paiement = ?');
    binds.push(choix(paiement, 'Paiement', PAIEMENTS));
  }
  if (sp.get('livraison') === 'a_faire') conds.push("v.statut = 'a_livrer' AND v.livraison = 'livraison'");
  return { where: conds.length ? `WHERE ${conds.join(' AND ')}` : '', binds };
}

/** GET /ventes?periode=jour|semaine|mois|mois_precedent|tout&statut=&paiement= */
export async function lister(c: Ctx) {
  const { where, binds } = filtres(c);
  const ventes = await c.env.DB.prepare(`SELECT v.* FROM ventes v ${where} ORDER BY v.date_vente DESC, v.id DESC LIMIT 500`)
    .bind(...binds)
    .all<Record<string, unknown> & { id: number; total: number; statut: string }>();
  const ids = ventes.results.map((v) => v.id);
  const lignes = ids.length
    ? await c.env.DB.prepare(
        `SELECT l.vente_id, l.slug, l.ml, l.quantite, l.prix_unitaire, p.marque, COALESCE(p.nom_public, p.nom) AS nom
         FROM lignes_vente l LEFT JOIN parfums p ON p.slug = l.slug
         WHERE l.vente_id IN (SELECT v.id FROM ventes v ${where} ORDER BY v.date_vente DESC, v.id DESC LIMIT 500) ORDER BY l.id`,
      )
        .bind(...binds)
        .all<{ vente_id: number }>()
    : { results: [] as { vente_id: number }[] };
  const parVente = new Map<number, unknown[]>();
  for (const l of lignes.results) {
    if (!parVente.has(l.vente_id)) parVente.set(l.vente_id, []);
    parVente.get(l.vente_id)!.push(l);
  }
  const actives = ventes.results.filter((v) => v.statut !== 'annulee');
  return json({
    ventes: ventes.results.map((v) => ({ ...v, lignes: parVente.get(v.id) ?? [] })),
    total: actives.reduce((s, v) => s + v.total, 0),
    nb: actives.length,
  });
}

/** PATCH /ventes/:id — champs simples, et lignes (stock rectifié : anciennes remises, nouvelles retirées). */
export async function modifier(c: Ctx) {
  const id = entier(c.p.id, 'Vente', 1, 1e12);
  const b = await lireJson(c.req);
  const actuelle = await lireVente(c, id);
  if (actuelle.statut === 'annulee') throw new ErreurHttp(409, 'Vente annulée : elle ne se modifie plus.');
  const v = validerVente(b, true);
  const nouvelles = 'lignes' in b ? validerLignes(b.lignes) : null;
  if (nouvelles) await verifierParfums(c, nouvelles);
  const anciennes = (actuelle.lignes as unknown as Ligne[]).map((l) => ({ slug: l.slug, ml: l.ml, quantite: l.quantite, prix_unitaire: l.prix_unitaire }));
  const historiques = new Map((actuelle.lignes as unknown as (Ligne & { prix_achat_unitaire: number | null })[]).map((l) => [`${l.slug}|${l.ml}`, l.prix_achat_unitaire]));
  const lignes = nouvelles ?? anciennes;
  const frais = (v.frais_livraison ?? actuelle.frais_livraison) as number;
  v.total = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0) + frais;
  v.maj_le = maintenant();
  v.maj_par = c.moi.prenom;
  const cols = Object.keys(v); // clés issues de validerVente (liste blanche)

  const avant: Record<string, unknown> = {};
  for (const k of cols) if (!['maj_le', 'maj_par'].includes(k)) avant[k] = actuelle[k];
  try {
    await c.env.DB.batch([
      ...(nouvelles
        ? [
            c.env.DB.prepare('DELETE FROM lignes_vente WHERE vente_id = ?').bind(id),
            ...insererLignes(c, nouvelles, id, historiques),
          ]
        : []),
      c.env.DB.prepare(`UPDATE ventes SET ${cols.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).bind(...cols.map((k) => v[k]), id),
      journal(c, 'modifier', 'vente', String(id), `Vente n° ${id}`, null, nouvelles ? { ...avant, lignes: resume(anciennes) } : avant, nouvelles ? { ...v, lignes: resume(nouvelles) } : v),
    ]);
  } catch (e) {
    if (estRuptureStock(e)) throw new ErreurHttp(409, await messageRupture(c, nouvelles ?? []));
    throw e;
  }
  return json(await lireVente(c, id));
}

/** POST /ventes/:id/annuler — stock rétabli. */
export async function annuler(c: Ctx) {
  const id = entier(c.p.id, 'Vente', 1, 1e12);
  const v = await lireVente(c, id);
  if (v.statut === 'annulee') return json(v);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE ventes SET statut = 'annulee', maj_le = ?, maj_par = ? WHERE id = ? AND statut != 'annulee'").bind(maintenant(), c.moi.prenom, id),
    journal(c, 'annuler', 'vente', String(id), `Vente n° ${id} (${v.total} FCFA)`, 'statut', v.statut, 'annulee'),
  ]);
  return json(await lireVente(c, id));
}

const LIB_PAIEMENT: Record<string, string> = { wave: 'Wave', orange_money: 'Orange Money', especes: 'Espèces', autre: 'Autre' };
const LIB_STATUT: Record<string, string> = { a_livrer: 'À livrer', livree: 'Livrée', payee: 'Payée', annulee: 'Annulée' };

/** GET /ventes.csv — Excel : « ; », UTF-8 avec BOM. Mêmes filtres que la liste. */
export async function exporterCsv(c: Ctx) {
  const { where, binds } = filtres(c);
  const r = await c.env.DB.prepare(
    `SELECT v.*, (SELECT group_concat(p.marque || ' ' || COALESCE(p.nom_public, p.nom) || ' ' || l.ml || ' ml x' || l.quantite, ' + ')
                  FROM lignes_vente l LEFT JOIN parfums p ON p.slug = l.slug WHERE l.vente_id = v.id) AS parfums
     FROM ventes v ${where} ORDER BY v.date_vente`,
  )
    .bind(...binds)
    .all<Record<string, string | number | null>>();
  const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' });
  return csv(
    `ventes-${jourIso(new Date())}.csv`,
    ['N°', 'Date', 'Parfums', 'Total (FCFA)', 'Frais de livraison', 'Paiement', 'Livraison', 'Zone', 'Statut', 'Prénom', 'Téléphone', 'Note'],
    r.results.map((v) => [
      v.id,
      fmt(String(v.date_vente)),
      v.parfums,
      v.total,
      v.frais_livraison,
      LIB_PAIEMENT[String(v.paiement)],
      v.livraison === 'retrait' ? 'Retrait' : 'Livraison',
      v.zone,
      LIB_STATUT[String(v.statut)],
      v.client_prenom,
      v.client_tel,
      v.note,
    ]),
  );
}

/** POST /anonymiser — ventes de plus de 12 mois : prénom et téléphone effacés (loi sénégalaise, CDP). */
export async function anonymiser(c: Ctx) {
  const limite = ajouterJours(new Date(), -365).toISOString();
  const r = await c.env.DB.batch([
    c.env.DB.prepare(
       `UPDATE ventes SET client_prenom = NULL, client_tel = NULL, note = NULL, anonymise_le = ?
        WHERE date_vente < ? AND (client_prenom IS NOT NULL OR client_tel IS NOT NULL OR note IS NOT NULL)`,
    ).bind(maintenant(), limite),
    c.env.DB.prepare("UPDATE journal SET avant = NULL, apres = NULL WHERE entite = 'vente' AND cle IN (SELECT CAST(id AS TEXT) FROM ventes WHERE date_vente < ?)").bind(limite),
  ]);
  const n = r[0].meta.changes ?? 0;
  await journal(c, 'anonymiser', 'vente', null, `${n} vente(s) de plus de 12 mois`).run();
  return json({ n });
}
