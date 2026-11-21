/** GET /accueil — tous les chiffres du tableau de bord en un seul appel (une seule transaction de lecture). */
import { json } from '../base';
import { ajouterJours, debutSemaine, type Ctx } from './commun';

export async function accueil(c: Ctx) {
  const db = c.env.DB;
  const now = new Date();
  const sem = debutSemaine(now).toISOString();
  const semPrec = ajouterJours(debutSemaine(now), -7).toISOString();
  // Même durée écoulée la semaine précédente (comparaison juste un mercredi)
  const memeMomentPrec = ajouterJours(now, -7).toISOString();
  const j30 = ajouterJours(now, -30).toISOString();
  const mois = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const auj = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  // Purge des données anciennes (événements > 13 mois, alertes > 6 mois) : légère, indexée
  await c.env.DB.batch([
    db.prepare('DELETE FROM evenements WHERE cree_le < ?').bind(ajouterJours(now, -396).toISOString()),
    db.prepare('DELETE FROM alertes_stock WHERE cree_le < ?').bind(ajouterJours(now, -183).toISOString()),
    db.prepare('DELETE FROM compteurs WHERE jour < ?').bind(ajouterJours(now, -7).toISOString().slice(0, 10)),
  ]).catch(() => undefined);

  const [semaine, evts, catalogue, stock, livraisons, aPrevenir, top, recherches, moisV, paiements, marge, parJour] = await db.batch([
    db.prepare(
      `SELECT sum(date_vente >= ?1) AS nb, coalesce(sum(CASE WHEN date_vente >= ?1 THEN total END), 0) AS ca,
              sum(date_vente < ?3) AS nb_prec, coalesce(sum(CASE WHEN date_vente < ?3 THEN total END), 0) AS ca_prec
       FROM ventes WHERE statut != 'annulee' AND date_vente >= ?2`,
    ).bind(sem, semPrec, memeMomentPrec),
    db.prepare(
      `SELECT type, sum(cree_le >= ?1) AS n, sum(cree_le < ?3) AS n_prec
       FROM evenements WHERE cree_le >= ?2 AND type IN ('clic_commander', 'vue_fiche') GROUP BY type`,
    ).bind(sem, semPrec, memeMomentPrec),
    db.prepare(
      `SELECT count(*) AS total,
              sum(EXISTS (SELECT 1 FROM contenances x WHERE x.slug = p.slug AND x.prix_vente IS NOT NULL)) AS avec_prix
       FROM parfums p WHERE p.statut = 'publie'`,
    ),
    db.prepare(
      `SELECT c.slug, c.ml, c.stock, c.seuil_alerte, p.marque || ' ' || COALESCE(p.nom_public, p.nom) AS libelle
       FROM contenances c JOIN parfums p ON p.slug = c.slug
       WHERE c.stock IS NOT NULL AND c.stock <= c.seuil_alerte AND c.dispo_force IS NULL AND p.masque = 0
       ORDER BY c.stock, libelle LIMIT 30`,
    ),
    db.prepare(
      `SELECT count(*) AS n, sum(date_vente >= ?) AS aujourdhui FROM ventes WHERE statut = 'a_livrer' AND livraison = 'livraison'`,
    ).bind(auj),
    db.prepare(
      `SELECT a.id, a.slug, a.ml, a.prenom, a.telephone, a.cree_le, p.marque || ' ' || COALESCE(p.nom_public, p.nom) AS libelle
       FROM alertes_stock a JOIN parfums p ON p.slug = a.slug
       WHERE a.prevenue_le IS NULL AND EXISTS (
         SELECT 1 FROM contenances c WHERE c.slug = a.slug AND (a.ml IS NULL OR c.ml = a.ml)
           AND (c.stock IS NULL OR c.stock > 0) AND (c.dispo_force IS NULL OR c.dispo_force != 'epuise'))
       ORDER BY a.cree_le LIMIT 20`,
    ),
    db.prepare(
      `SELECT e.slug, count(*) AS clics, p.marque || ' ' || COALESCE(p.nom_public, p.nom) AS libelle,
              (SELECT sum(stock) FROM contenances c WHERE c.slug = e.slug) AS stock,
              (SELECT count(*) FROM contenances c WHERE c.slug = e.slug AND c.stock IS NOT NULL) AS suivi
       FROM evenements e JOIN parfums p ON p.slug = e.slug
       WHERE e.type = 'clic_commander' AND e.cree_le >= ? GROUP BY e.slug ORDER BY clics DESC LIMIT 5`,
    ).bind(j30),
    db.prepare(
      `SELECT texte, count(*) AS n, max(cree_le) AS derniere FROM evenements
       WHERE type = 'recherche' AND nb_resultats = 0 AND cree_le >= ? AND texte IS NOT NULL
       GROUP BY texte ORDER BY n DESC, derniere DESC LIMIT 10`,
    ).bind(j30),
    db.prepare(`SELECT count(*) AS nb, coalesce(sum(total), 0) AS ca, coalesce(sum(frais_livraison), 0) AS frais FROM ventes WHERE statut != 'annulee' AND date_vente >= ?`).bind(mois),
    db.prepare(
      `SELECT paiement, count(*) AS nb, sum(total) AS ca FROM ventes WHERE statut != 'annulee' AND date_vente >= ? GROUP BY paiement ORDER BY ca DESC`,
    ).bind(mois),
    db.prepare(
      `SELECT coalesce(sum(l.quantite * l.prix_unitaire), 0) AS ventes_connues,
              coalesce(sum(l.quantite * (l.prix_unitaire - l.prix_achat_unitaire)), 0) AS marge,
              (SELECT coalesce(sum(l2.quantite * l2.prix_unitaire), 0) FROM lignes_vente l2 JOIN ventes v2 ON v2.id = l2.vente_id
               WHERE v2.statut != 'annulee' AND v2.date_vente >= ?1) AS ventes_total
       FROM lignes_vente l JOIN ventes v ON v.id = l.vente_id
       WHERE v.statut != 'annulee' AND v.date_vente >= ?1 AND l.prix_achat_unitaire IS NOT NULL`,
    ).bind(mois),
    db.prepare(
      `SELECT substr(date_vente, 1, 10) AS jour, count(*) AS nb, sum(total) AS ca FROM ventes
       WHERE statut != 'annulee' AND date_vente >= ? GROUP BY jour ORDER BY jour`,
    ).bind(ajouterJours(new Date(auj), -29).toISOString()),
  ]);

  const evt = (t: string) => (evts.results as { type: string; n: number; n_prec: number }[]).find((e) => e.type === t) ?? { n: 0, n_prec: 0 };
  const s = semaine.results[0] as Record<string, number | null>;
  const st = stock.results as { stock: number }[];
  const m = moisV.results[0] as { nb: number; ca: number };
  const mg = marge.results[0] as { ventes_connues: number; marge: number; ventes_total: number };
  return json({
    semaine: {
      ventes: { n: s.nb ?? 0, prec: s.nb_prec ?? 0 },
      ca: { n: s.ca ?? 0, prec: s.ca_prec ?? 0 },
      demandes: { n: evt('clic_commander').n ?? 0, prec: evt('clic_commander').n_prec ?? 0 },
      vues: { n: evt('vue_fiche').n ?? 0, prec: evt('vue_fiche').n_prec ?? 0 },
    },
    catalogue: catalogue.results[0],
    stockBas: st,
    ruptures: st.filter((x) => x.stock === 0).length,
    livraisons: livraisons.results[0],
    aPrevenir: aPrevenir.results,
    plusDemandes: top.results,
    recherchesSansResultat: recherches.results,
    mois: {
      nb: m.nb,
      ca: m.ca,
      panierMoyen: m.nb ? Math.round(m.ca / m.nb) : 0,
      paiements: paiements.results,
      // Marge calculée seulement sur les lignes dont le prix d'achat est connu ; couverture affichée à côté
      marge: mg.ventes_connues ? { montant: mg.marge, taux: mg.marge / mg.ventes_connues, couverture: mg.ventes_total ? mg.ventes_connues / mg.ventes_total : 0 } : null,
    },
    parJour: parJour.results,
  });
}
