/** Catalogue : liste, fiche, contenances (prix / stock), modification groupée, ajout, photos. */
import {
  ErreurHttp,
  booleen,
  choix,
  enSlug,
  entier,
  entierOuNull,
  json,
  lireJson,
  maintenant,
  ml as validerMl,
  prix,
  slug as validerSlug,
  texte,
} from '../base';
import { dispoContenance } from '../catalogue';
import { csv, journal, journalChamp, libelleParfum, type Ctx } from './commun';

const STYLES = ['frais', 'fleuri', 'boise', 'doux', 'vanille', 'oriental'] as const;
const CATEGORIES = ['femme', 'homme', 'unisexe'] as const;
const FILTRES = ['sans_prix', 'stock_bas', 'epuise', 'masque', 'visuel'] as const;

interface LigneC {
  slug: string;
  ml: number;
  prix_vente: number | null;
  prix_achat: number | null;
  stock: number | null;
  seuil_alerte: number;
  dispo_force: string | null;
}

const contenancesDe = async (c: Ctx, slugs: string[] | null) => {
  const r = await c.env.DB.prepare(
    `SELECT slug, ml, prix_vente, prix_achat, stock, seuil_alerte, dispo_force FROM contenances ORDER BY slug, ordre, ml`,
  ).all<LigneC>();
  const m = new Map<string, (LigneC & { dispo: string | null })[]>();
  for (const x of r.results) {
    if (slugs && !slugs.includes(x.slug)) continue;
    if (!m.has(x.slug)) m.set(x.slug, []);
    m.get(x.slug)!.push({ ...x, dispo: dispoContenance(x) });
  }
  return m;
};

const vignette = (images: string) => {
  try {
    const [premiere] = JSON.parse(images) as string[];
    return premiere?.replace(/1122\.webp$/, '360.webp') ?? null;
  } catch {
    return null;
  }
};

/** GET /parfums?q=&filtre=&marque=&cat= — recherche entièrement paramétrée (aucune concaténation). */
export async function lister(c: Ctx) {
  const q = (c.url.searchParams.get('q') ?? '').trim().slice(0, 80);
  const filtre = c.url.searchParams.get('filtre');
  const marque = c.url.searchParams.get('marque');
  const cat = c.url.searchParams.get('cat');
  const conditions: string[] = [];
  const binds: unknown[] = [];
  if (q) {
    conditions.push("(p.marque || ' ' || COALESCE(p.nom_public, p.nom) || ' ' || p.slug) LIKE ? ESCAPE '\\'");
    binds.push(`%${q.replace(/[\\%_]/g, (x) => `\\${x}`)}%`);
  }
  if (marque) {
    conditions.push('p.marque = ?');
    binds.push(marque.slice(0, 80));
  }
  if (cat) {
    conditions.push('p.categorie = ?');
    binds.push(choix(cat, 'Catégorie', CATEGORIES));
  }
  switch (filtre ? choix(filtre, 'Filtre', FILTRES) : null) {
    case 'sans_prix':
      conditions.push('NOT EXISTS (SELECT 1 FROM contenances x WHERE x.slug = p.slug AND x.prix_vente IS NOT NULL)');
      break;
    case 'stock_bas':
      conditions.push('EXISTS (SELECT 1 FROM contenances x WHERE x.slug = p.slug AND x.stock > 0 AND x.stock <= x.seuil_alerte)');
      break;
    case 'epuise':
      conditions.push("EXISTS (SELECT 1 FROM contenances x WHERE x.slug = p.slug AND (x.stock = 0 OR x.dispo_force = 'epuise'))");
      break;
    case 'masque':
      conditions.push('p.masque = 1');
      break;
    case 'visuel':
      conditions.push("p.statut = 'visuel_a_creer'");
      break;
  }
  const r = await c.env.DB.prepare(
    `SELECT p.slug, p.marque, COALESCE(p.nom_public, p.nom) AS nom, p.categorie, p.images, p.masque, p.statut,
            p.nouveau, p.coup_de_coeur, p.photo_r2
     FROM parfums p ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY p.marque, nom`,
  )
    .bind(...binds)
    .all<Record<string, unknown> & { slug: string; images: string }>();
  const cs = await contenancesDe(c, null);
  const [compte, marques] = await c.env.DB.batch([
    c.env.DB.prepare(
      `SELECT count(*) AS total,
              sum(NOT EXISTS (SELECT 1 FROM contenances x WHERE x.slug = p.slug AND x.prix_vente IS NOT NULL)) AS sans_prix,
              sum(EXISTS (SELECT 1 FROM contenances x WHERE x.slug = p.slug AND x.stock > 0 AND x.stock <= x.seuil_alerte)) AS stock_bas,
              sum(EXISTS (SELECT 1 FROM contenances x WHERE x.slug = p.slug AND (x.stock = 0 OR x.dispo_force = 'epuise'))) AS epuise,
              sum(p.masque) AS masque, sum(p.statut = 'visuel_a_creer') AS visuel
       FROM parfums p`,
    ),
    c.env.DB.prepare('SELECT DISTINCT marque FROM parfums ORDER BY marque'),
  ]);
  return json({
    parfums: r.results.map(({ images, ...p }) => ({ ...p, vignette: vignette(images), contenances: cs.get(p.slug) ?? [] })),
    compteurs: compte.results[0],
    marques: (marques.results as { marque: string }[]).map((m) => m.marque),
  });
}

/** GET /parfums/:slug — fiche complète pour l'édition. */
export async function lire(c: Ctx) {
  const s = validerSlug(c.p.slug);
  const p = await c.env.DB.prepare('SELECT * FROM parfums WHERE slug = ?').bind(s).first<Record<string, unknown>>();
  if (!p) throw new ErreurHttp(404, 'Parfum introuvable.');
  const cs = await contenancesDe(c, [s]);
  const parse = (v: unknown) => {
    try {
      return v == null ? null : JSON.parse(String(v));
    } catch {
      return null;
    }
  };
  return json({
    ...p,
    vignette: vignette(String(p.images)),
    styles: parse(p.styles) ?? parse(p.styles_import),
    styles_import: parse(p.styles_import),
    notes: parse(p.notes),
    ingredients: parse(p.ingredients),
    images: parse(p.images),
    porter: parse(p.porter),
    description: p.description ?? p.description_import,
    contenances: cs.get(s) ?? [],
  });
}

const MOMENTS = ['jour', 'soir', 'jourSoir'] as const;
const SAISONS = ['fraiche', 'chaude', 'annee'] as const;
const OCCASIONS = ['quotidien', 'bureau', 'sortie', 'diner', 'ceremonie'] as const;

function validerPorter(v: unknown) {
  if (v == null) return null;
  if (typeof v !== 'object') throw new ErreurHttp(422, 'Quand le porter : format invalide');
  const o = v as Record<string, unknown>;
  const occ = (o.occasion ?? {}) as Record<string, unknown>;
  return JSON.stringify({
    moment: choix(o.moment, 'Moment', MOMENTS),
    momentDetail: texte(o.momentDetail, 'Détail du moment', 80) ?? '',
    saison: choix(o.saison, 'Saison', SAISONS),
    saisonDetail: texte(o.saisonDetail, 'Détail de la saison', 80) ?? '',
    occasion: {
      icone: choix(occ.icone, 'Occasion', OCCASIONS),
      titre: texte(occ.titre, 'Occasion', 60, true),
      detail: texte(occ.detail, 'Détail de l’occasion', 120) ?? '',
    },
  });
}

/** PATCH /parfums/:slug — seuls les champs envoyés changent, chacun journalisé. */
export async function modifier(c: Ctx) {
  const s = validerSlug(c.p.slug);
  const b = await lireJson(c.req);
  const actuel = await c.env.DB.prepare('SELECT source, statut FROM parfums WHERE slug = ?').bind(s).first<{ source: string; statut: string }>();
  if (!actuel) throw new ErreurHttp(404, 'Parfum introuvable.');
  if (b.masque === false && actuel.statut !== 'publie') throw new ErreurHttp(422, 'Le visuel studio doit être intégré avant de rendre ce parfum visible.');
  const libelle = await libelleParfum(c, s);

  const champs: [string, unknown][] = [];
  if ('nom_public' in b) champs.push(['nom_public', texte(b.nom_public, 'Nom affiché', 80)]);
  if ('description' in b) champs.push(['description', texte(b.description, 'Description', 1200)]);
  if ('styles' in b) {
    if (!Array.isArray(b.styles) || b.styles.length > 3) throw new ErreurHttp(422, 'Ambiances : 1 à 3');
    champs.push(['styles', JSON.stringify(b.styles.map((x) => choix(x, 'Ambiance', STYLES)))]);
  }
  if ('porter' in b) champs.push(['porter', validerPorter(b.porter)]);
  for (const k of ['nouveau', 'coup_de_coeur', 'masque'] as const) if (k in b) champs.push([k, booleen(b[k], k)]);
  if ('dispo_force' in b)
    champs.push(['dispo_force', b.dispo_force == null ? null : choix(b.dispo_force, 'Disponibilité', ['disponible', 'limite', 'epuise', 'sur_commande'] as const)]);
  // Champs de l'import : modifiables seulement pour un parfum ajouté depuis l'admin
  const champsImport = ['marque', 'nom', 'concentration', 'categorie', 'notes'].filter((k) => k in b);
  if (champsImport.length && actuel.source !== 'admin') throw new ErreurHttp(422, 'Ce champ vient du catalogue importé : il ne se modifie pas ici.');
  if ('marque' in b) champs.push(['marque', texte(b.marque, 'Marque', 60, true)]);
  if ('nom' in b) champs.push(['nom', texte(b.nom, 'Nom', 80, true)]);
  if ('concentration' in b) champs.push(['concentration', texte(b.concentration, 'Concentration', 40)]);
  if ('categorie' in b) champs.push(['categorie', choix(b.categorie, 'Catégorie', CATEGORIES)]);
  if ('notes' in b) champs.push(['notes', JSON.stringify({ bouquet: listeNotes(b.notes) })]);
  if (!champs.length) throw new ErreurHttp(422, 'Rien à modifier.');

  const stmts = champs.flatMap(([col, v]) => [
    journalChamp(c, 'parfums', col, 'slug = ?', [s], s, libelle, v),
    c.env.DB.prepare(`UPDATE parfums SET ${col} = ?, maj_le = ?, maj_par = ? WHERE slug = ?`).bind(v, maintenant(), c.moi.prenom, s),
  ]);
  await c.env.DB.batch(stmts);
  return lire(c);
}

const listeNotes = (v: unknown): string[] => {
  const t = Array.isArray(v) ? v.join(',') : (texte(v, 'Notes', 600) ?? '');
  return t
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((x) => x.slice(0, 40));
};

const CHAMPS_CONTENANCE = ['prix_vente', 'prix_achat', 'stock', 'seuil_alerte', 'dispo_force'] as const;

/** Valeurs validées d'une contenance (champs envoyés seulement). */
function valeursContenance(b: Record<string, unknown>): [string, unknown][] {
  const v: [string, unknown][] = [];
  if ('prix_vente' in b) v.push(['prix_vente', prix(b.prix_vente, 'Prix de vente')]);
  if ('prix_achat' in b) v.push(['prix_achat', prix(b.prix_achat, 'Prix d’achat')]);
  if ('stock' in b) v.push(['stock', entierOuNull(b.stock, 'Stock', 0, 100_000)]);
  if ('seuil_alerte' in b) v.push(['seuil_alerte', entier(b.seuil_alerte, 'Seuil d’alerte', 0, 1000)]);
  if ('dispo_force' in b) v.push(['dispo_force', b.dispo_force == null ? null : choix(b.dispo_force, 'Disponibilité', ['sur_commande', 'epuise'] as const)]);
  return v;
}

/** Instructions SQL pour créer (si besoin) puis modifier une contenance — dernière écriture gagne, tout est journalisé. */
function instructionsContenance(c: Ctx, s: string, mlv: number, libelle: string, valeurs: [string, unknown][]) {
  const cle = `${s} ${mlv}`;
  const lib = `${libelle} ${mlv} ml`;
  const db = c.env.DB;
  return [
    // Journal de création seulement si la contenance n'existe pas encore (lu avant l'insertion)
    db
      .prepare(
        `INSERT INTO journal (qui, action, entite, cle, libelle) SELECT ?, 'ajouter', 'contenance', ?, ?
         WHERE NOT EXISTS (SELECT 1 FROM contenances WHERE slug = ? AND ml = ?)`,
      )
      .bind(c.moi.prenom, cle, lib, s, mlv),
    db
      .prepare(
        `INSERT INTO contenances (slug, ml, ordre, maj_par) VALUES (?, ?, ?, ?) ON CONFLICT (slug, ml) DO NOTHING`,
      )
      .bind(s, mlv, mlv, c.moi.prenom),
    ...valeurs.flatMap(([col, v]) => [
      journalChamp(c, 'contenances', col, 'slug = ? AND ml = ?', [s, mlv], cle, lib, v),
      db
        .prepare(`UPDATE contenances SET ${col} = ?, maj_le = ?, maj_par = ? WHERE slug = ? AND ml = ?`)
        .bind(v, maintenant(), c.moi.prenom, s, mlv),
    ]),
  ];
}

/** PUT /parfums/:slug/contenances/:ml — crée ou modifie (prix, prix d'achat, stock, seuil, dispo forcée). */
export async function ecrireContenance(c: Ctx) {
  const s = validerSlug(c.p.slug);
  const mlv = validerMl(c.p.ml);
  const b = await lireJson(c.req);
  const valeurs = valeursContenance(b);
  if (valeurs.some(([k]) => !CHAMPS_CONTENANCE.includes(k as (typeof CHAMPS_CONTENANCE)[number]))) throw new ErreurHttp(422, 'Champ inconnu.');
  const libelle = await libelleParfum(c, s);
  await c.env.DB.batch(instructionsContenance(c, s, mlv, libelle, valeurs));
  const r = await c.env.DB.prepare(
    'SELECT slug, ml, prix_vente, prix_achat, stock, seuil_alerte, dispo_force FROM contenances WHERE slug = ? AND ml = ?',
  )
    .bind(s, mlv)
    .first<LigneC>();
  return json({ ...r!, dispo: dispoContenance(r!) });
}

/** DELETE /parfums/:slug/contenances/:ml */
export async function supprimerContenance(c: Ctx) {
  const s = validerSlug(c.p.slug);
  const mlv = validerMl(c.p.ml);
  const libelle = await libelleParfum(c, s);
  const r = await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO journal (qui, action, entite, cle, libelle, avant)
       SELECT ?, 'supprimer', 'contenance', ?, ?, json_object('prix', prix_vente, 'stock', stock) FROM contenances WHERE slug = ? AND ml = ?`,
    ).bind(c.moi.prenom, `${s} ${mlv}`, `${libelle} ${mlv} ml`, s, mlv),
    c.env.DB.prepare('DELETE FROM contenances WHERE slug = ? AND ml = ?').bind(s, mlv),
  ]);
  if (!r[1].meta.changes) throw new ErreurHttp(404, 'Contenance introuvable.');
  return json({ ok: true });
}

/** POST /parfums/groupe { slugs, ml, prix_vente } — même prix pour une contenance sur plusieurs parfums. */
export async function groupe(c: Ctx) {
  const b = await lireJson(c.req);
  if (!Array.isArray(b.slugs) || !b.slugs.length || b.slugs.length > 200) throw new ErreurHttp(422, 'Sélection : 1 à 200 parfums');
  const slugs = [...new Set(b.slugs.map(validerSlug))];
  const mlv = validerMl(b.ml);
  const valeurs = valeursContenance({ prix_vente: b.prix_vente });
  const noms = await c.env.DB.prepare(
    `SELECT slug, marque || ' ' || COALESCE(nom_public, nom) AS libelle FROM parfums WHERE slug IN (${slugs.map(() => '?').join(',')})`,
  )
    .bind(...slugs)
    .all<{ slug: string; libelle: string }>();
  if (noms.results.length !== slugs.length) throw new ErreurHttp(404, 'Un des parfums est introuvable.');
  await c.env.DB.batch(noms.results.flatMap((n) => instructionsContenance(c, n.slug, mlv, n.libelle, valeurs)));
  return json({ ok: true, n: slugs.length });
}

/** POST /parfums — nouveau parfum : « Visuel à créer », masqué du site tant que le visuel studio n'existe pas. */
export async function creer(c: Ctx) {
  const b = await lireJson(c.req);
  const marque = texte(b.marque, 'Marque', 60, true)!;
  const nom = texte(b.nom, 'Nom', 80, true)!;
  const base = enSlug(`${marque} ${nom}`);
  if (!base) throw new ErreurHttp(422, 'Nom : lettres ou chiffres attendus');
  const existants = await c.env.DB.prepare("SELECT slug FROM parfums WHERE slug = ? OR slug LIKE ? || '-%'")
    .bind(base, base)
    .all<{ slug: string }>();
  let s = base;
  for (let i = 2; existants.results.some((x) => x.slug === s); i++) s = `${base}-${i}`;
  const photo = b.photo_r2 == null ? null : texte(b.photo_r2, 'Photo', 200);
  if (photo && !/^parfums\/[a-z0-9-]+\/[0-9]+\.(jpg|png|webp)$/.test(photo)) throw new ErreurHttp(422, 'Photo invalide.');
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO parfums (slug, marque, nom, concentration, categorie, notes, statut, masque, source, photo_r2, maj_par)
       VALUES (?, ?, ?, ?, ?, ?, 'visuel_a_creer', 1, 'admin', ?, ?)`,
    ).bind(
      s,
      marque,
      nom,
      texte(b.concentration, 'Concentration', 40),
      choix(b.categorie, 'Catégorie', CATEGORIES),
      JSON.stringify({ bouquet: listeNotes(b.notes) }),
      photo,
      c.moi.prenom,
    ),
    journal(c, 'ajouter', 'parfum', s, `${marque} ${nom}`),
  ]);
  return json({ slug: s }, 201);
}

/** POST /photos?slug= (corps = l'image) — envoi vers R2, 5 Mo max, JPEG / PNG / WebP vérifiés par signature. */
export async function envoyerPhoto(c: Ctx) {
  if (!c.env.PHOTOS) throw new ErreurHttp(503, 'Stockage des photos pas encore activé (R2).');
  const base = enSlug(c.url.searchParams.get('slug') ?? 'nouveau') || 'nouveau';
  const corps = new Uint8Array(await c.req.arrayBuffer());
  if (!corps.length) throw new ErreurHttp(422, 'Photo vide.');
  if (corps.length > 5_000_000) throw new ErreurHttp(413, 'Photo trop lourde (5 Mo maximum).');
  const sig = (o: number, octets: number[]) => octets.every((x, i) => corps[o + i] === x);
  const ext = sig(0, [0xff, 0xd8, 0xff])
    ? 'jpg'
    : sig(0, [0x89, 0x50, 0x4e, 0x47])
      ? 'png'
      : sig(0, [0x52, 0x49, 0x46, 0x46]) && sig(8, [0x57, 0x45, 0x42, 0x50])
        ? 'webp'
        : null;
  if (!ext) throw new ErreurHttp(415, 'Format accepté : JPEG, PNG ou WebP.');
  const cle = `parfums/${base}/${Date.now()}.${ext}`;
  await c.env.PHOTOS.put(cle, corps, { httpMetadata: { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` } });
  return json({ cle }, 201);
}

/** GET /photos/<clé> — photo envoyée (réservée à l'admin). */
export async function lirePhoto(c: Ctx) {
  if (!c.env.PHOTOS) throw new ErreurHttp(404, 'Photo introuvable.');
  const cle = c.p.cle;
  if (!/^parfums\/[a-z0-9-]+\/[0-9]+\.(jpg|png|webp)$/.test(cle)) throw new ErreurHttp(404, 'Photo introuvable.');
  const o = await c.env.PHOTOS.get(cle);
  if (!o) throw new ErreurHttp(404, 'Photo introuvable.');
  return new Response(o.body, {
    headers: { 'Content-Type': o.httpMetadata?.contentType ?? 'application/octet-stream', 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
  });
}

/** GET /visuels-a-creer.csv — liste à transmettre pour les visuels studio. */
export async function visuelsCsv(c: Ctx) {
  const r = await c.env.DB.prepare(
    "SELECT slug, marque, nom, concentration, categorie, notes, photo_r2, cree_le FROM parfums WHERE statut = 'visuel_a_creer' ORDER BY cree_le",
  ).all<Record<string, string>>();
  const origine = c.url.origin;
  return csv(
    'visuels-a-creer.csv',
    ['Identifiant', 'Marque', 'Nom', 'Concentration', 'Catégorie', 'Notes', 'Photo envoyée', 'Ajouté le'],
    r.results.map((p) => [
      p.slug,
      p.marque,
      p.nom,
      p.concentration,
      p.categorie,
      (() => {
        try {
          return (JSON.parse(p.notes).bouquet as string[]).join(', ');
        } catch {
          return '';
        }
      })(),
      p.photo_r2 ? `${origine}/api/admin/photos/${p.photo_r2}` : '',
      p.cree_le.slice(0, 10),
    ]),
  );
}
