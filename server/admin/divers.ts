import { preparerImages } from '../images';
/** Plus : boutique, avis, alertes, journal, publication, sauvegarde. */
import { ErreurHttp, booleen, choix, entier, json, lireJson, maintenant, telephone, texte } from '../base';
import { lireBoutique } from '../catalogue';
import { journal, type Ctx } from './commun';

export const moi = async (c: Ctx) => json({ email: c.moi.email, prenom: c.moi.prenom });

/* ---------- Boutique ---------- */

const PAIEMENTS = ['wave', 'orange_money', 'especes', 'autre'] as const;

export const lireReglages = async (c: Ctx) => json(await lireBoutique(c.env.DB));

/** PUT /reglages/boutique — remplace tout le bloc (validé), ancienne valeur au journal. */
export async function ecrireReglages(c: Ctx) {
  const b = await lireJson(c.req);
  const tel = telephone(b.whatsapp, 'Numéro WhatsApp');
  if (!Array.isArray(b.zones ?? []) || ((b.zones as unknown[]) ?? []).length > 30) throw new ErreurHttp(422, 'Zones : 30 maximum');
  if (!Array.isArray(b.paiements ?? [])) throw new ErreurHttp(422, 'Paiements : liste attendue');
  const boutique = {
    whatsapp: tel ? `221${tel}` : undefined,
    horaires: texte(b.horaires, 'Horaires', 120) ?? undefined,
    retrait: b.retrait == null ? undefined : !!booleen(b.retrait, 'Retrait'),
    retraitAdresse: texte(b.retraitAdresse, 'Lieu de retrait', 120) ?? undefined,
    paiements: [...new Set(((b.paiements as unknown[]) ?? []).map((p) => choix(p, 'Paiement', PAIEMENTS)))],
    zones: ((b.zones as Record<string, unknown>[]) ?? []).map((z) => ({
      nom: texte(z?.nom, 'Zone', 40, true)!,
      frais: entier(z?.frais ?? 0, 'Frais', 0, 1_000_000),
      delai: texte(z?.delai, 'Délai', 40) ?? '',
    })),
  };
  const avant = await lireBoutique(c.env.DB);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO reglages (cle, valeur, maj_le, maj_par) VALUES ('boutique', ?1, ?2, ?3)
       ON CONFLICT (cle) DO UPDATE SET valeur = ?1, maj_le = ?2, maj_par = ?3`,
    ).bind(JSON.stringify(boutique), maintenant(), c.moi.prenom),
    journal(c, 'modifier', 'boutique', 'boutique', 'Informations de la boutique', null, avant, boutique),
  ]);
  return json(boutique);
}

/* ---------- Avis clients (réels, avec accord) ---------- */

export const listerAvis = async (c: Ctx) =>
  json((await c.env.DB.prepare('SELECT * FROM avis ORDER BY date_avis DESC, id DESC').all()).results);

function validerAvis(b: Record<string, unknown>) {
  const date = texte(b.date_avis, 'Date', 10, true)!;
  const jour = Date.parse(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(jour) || new Date(jour).toISOString().slice(0, 10) !== date || jour > Date.now() + 86_400_000) throw new ErreurHttp(422, 'Date : invalide');
  if (b.accord_cliente !== true) throw new ErreurHttp(422, 'Accord de la cliente : obligatoire pour enregistrer un avis.');
  return {
    prenom: texte(b.prenom, 'Prénom', 40, true),
    ville: texte(b.ville, 'Ville', 40),
    texte: texte(b.texte, 'Avis', 600, true),
    note: b.note == null || b.note === '' ? null : entier(b.note, 'Note', 1, 5),
    date_avis: date,
    publie: b.publie == null ? 0 : booleen(b.publie, 'Publier'),
  };
}

export async function creerAvis(c: Ctx) {
  const a = validerAvis(await lireJson(c.req));
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO avis (prenom, ville, texte, note, date_avis, accord_cliente, publie, cree_par) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
    ).bind(a.prenom, a.ville, a.texte, a.note, a.date_avis, a.publie, c.moi.prenom),
    journal(c, 'ajouter', 'avis', null, `Avis de ${a.prenom}`, null, null, a),
  ]);
  return listerAvis(c);
}

export async function modifierAvis(c: Ctx) {
  const id = entier(c.p.id, 'Avis', 1, 1e12);
  const b = await lireJson(c.req);
  const avant = await c.env.DB.prepare('SELECT * FROM avis WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!avant) throw new ErreurHttp(404, 'Avis introuvable.');
  // Bascule « publié » seule, ou avis complet
  const a = Object.keys(b).length === 1 && 'publie' in b ? { publie: booleen(b.publie, 'Publier') } : validerAvis(b);
  const cols = Object.keys(a);
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE avis SET ${cols.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).bind(...cols.map((k) => (a as Record<string, unknown>)[k]), id),
    journal(c, 'modifier', 'avis', String(id), `Avis de ${avant.prenom}`, null, Object.fromEntries(cols.map((k) => [k, avant[k]])), a),
  ]);
  return listerAvis(c);
}

export async function supprimerAvis(c: Ctx) {
  const id = entier(c.p.id, 'Avis', 1, 1e12);
  const avant = await c.env.DB.prepare('SELECT * FROM avis WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!avant) throw new ErreurHttp(404, 'Avis introuvable.');
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM avis WHERE id = ?').bind(id),
    journal(c, 'supprimer', 'avis', String(id), `Avis de ${avant.prenom}`, null, avant, null),
  ]);
  return listerAvis(c);
}

/* ---------- « Me prévenir » ---------- */

export const listerAlertes = async (c: Ctx) =>
  json(
    (
      await c.env.DB.prepare(
        `SELECT a.*, p.marque || ' ' || COALESCE(p.nom_public, p.nom) AS libelle FROM alertes_stock a
         LEFT JOIN parfums p ON p.slug = a.slug WHERE a.cree_le >= ? ORDER BY a.prevenue_le IS NOT NULL, a.cree_le DESC LIMIT 200`,
      ).bind(new Date(Date.now() - 183 * 86_400_000).toISOString()).all()
    ).results,
  );

export async function alertePrevenue(c: Ctx) {
  const id = entier(c.p.id, 'Alerte', 1, 1e12);
  const r = await c.env.DB.batch([
    c.env.DB.prepare('UPDATE alertes_stock SET prevenue_le = ? WHERE id = ? AND prevenue_le IS NULL').bind(maintenant(), id),
    journal(c, 'prevenir', 'alerte', String(id), 'Cliente prévenue du retour en stock'),
  ]);
  if (!r[0].meta.changes) throw new ErreurHttp(404, 'Alerte introuvable ou déjà traitée.');
  return json({ ok: true });
}

export async function supprimerAlerte(c: Ctx) {
  const id = entier(c.p.id, 'Alerte', 1, 1e12);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM alertes_stock WHERE id = ?').bind(id),
    journal(c, 'supprimer', 'alerte', String(id), 'Numéro supprimé (demande de la cliente)'),
  ]);
  return json({ ok: true });
}

/* ---------- Journal ---------- */

export async function lireJournal(c: Ctx) {
  const page = Math.max(0, Number(c.url.searchParams.get('page')) || 0);
  const r = await c.env.DB.prepare('SELECT * FROM journal ORDER BY id DESC LIMIT 51 OFFSET ?').bind(page * 50).all();
  return json({ lignes: r.results.slice(0, 50), suivante: r.results.length > 50 });
}

/* ---------- Publier sur le site (deploy hook) ---------- */

// Le site lit directement D1 : aucun deploy hook nécessaire.
export const lirePublication = async (_c: Ctx) => json({derniere:null,enAttente:0,configure:true,automatique:true});
export const publier = lirePublication;

/* ---------- Sauvegarde ---------- */

const TABLES = ['parfums', 'contenances', 'ventes', 'lignes_vente', 'reglages', 'avis', 'alertes_stock', 'journal', 'publications', 'evenements'] as const;

/** GET /export.json — sauvegarde complète (à garder en lieu sûr : contient des numéros de clientes). */
export async function exporter(c: Ctx) {
  const r = await c.env.DB.batch(TABLES.map((t) => c.env.DB.prepare(`SELECT * FROM ${t}`)));
  const data = Object.fromEntries(TABLES.map((t, i) => [t, r[i].results]));
  await journal(c, 'exporter', 'sauvegarde', null, 'Export JSON complet').run();
  await preparerImages(c.env.DB);
  const encoder=new TextEncoder();
  async function* morceaux() {
    yield JSON.stringify({exporteLe:maintenant(),version:2,...data}).slice(0,-1)+',"images_boutique":[';
    let curseur='';let premier=true;
    while(true){
      const lot=await c.env.DB.prepare('SELECT cle,type,contenu,cree_le FROM images_boutique WHERE cle>? ORDER BY cle LIMIT 20').bind(curseur).all<{cle:string;type:string;contenu:ArrayBuffer;cree_le:string}>();
      if(!lot.results.length)break;
      for(const image of lot.results){
        const bytes=new Uint8Array(image.contenu);let binaire='';
        for(let i=0;i<bytes.length;i+=32768)binaire+=String.fromCharCode(...bytes.subarray(i,i+32768));
        yield (premier?'':',')+JSON.stringify({cle:image.cle,type:image.type,cree_le:image.cree_le,contenu_base64:btoa(binaire)});
        premier=false;curseur=image.cle;
      }
    }
    yield ']}';
  }
  const iterateur=morceaux();
  const corps=new ReadableStream<Uint8Array>({async pull(controller){try{const r=await iterateur.next();if(r.done)controller.close();else controller.enqueue(encoder.encode(r.value));}catch(e){controller.error(e);}},async cancel(){await iterateur.return(undefined);}});
  return new Response(corps, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="nalaaris-sauvegarde-${maintenant().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
