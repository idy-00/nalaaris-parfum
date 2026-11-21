-- Aucun recalcul des stocks existants ; seuls les mouvements futurs sont concernés.
CREATE TRIGGER ligne_verifier_contenance BEFORE INSERT ON lignes_vente
BEGIN
  SELECT RAISE(ABORT, 'contenance_introuvable') WHERE NOT EXISTS (
    SELECT 1 FROM contenances WHERE slug = NEW.slug AND ml = NEW.ml
  );
  SELECT RAISE(ABORT, 'vente_annulee') WHERE EXISTS (
    SELECT 1 FROM ventes WHERE id = NEW.vente_id AND statut = 'annulee'
  );
END;
CREATE TRIGGER ligne_retirer_stock AFTER INSERT ON lignes_vente
BEGIN
  UPDATE contenances SET stock = stock - NEW.quantite
    WHERE slug = NEW.slug AND ml = NEW.ml AND stock IS NOT NULL;
END;
CREATE TRIGGER ligne_restituer_stock AFTER DELETE ON lignes_vente
WHEN EXISTS (SELECT 1 FROM ventes WHERE id = OLD.vente_id AND statut != 'annulee')
BEGIN
  UPDATE contenances SET stock = stock + OLD.quantite
    WHERE slug = OLD.slug AND ml = OLD.ml AND stock IS NOT NULL;
END;
CREATE TRIGGER vente_annuler_stock AFTER UPDATE OF statut ON ventes
WHEN NEW.statut = 'annulee' AND OLD.statut != 'annulee'
BEGIN
  UPDATE contenances SET stock = stock + COALESCE((
    SELECT sum(quantite) FROM lignes_vente
    WHERE vente_id = NEW.id AND slug = contenances.slug AND ml = contenances.ml
  ), 0) WHERE stock IS NOT NULL AND EXISTS (
    SELECT 1 FROM lignes_vente WHERE vente_id = NEW.id AND slug = contenances.slug AND ml = contenances.ml
  );
END;
CREATE TRIGGER vente_annulee_immuable BEFORE UPDATE ON ventes
WHEN OLD.statut = 'annulee' AND (
  NEW.statut != 'annulee' OR NEW.total != OLD.total OR NEW.frais_livraison != OLD.frais_livraison
  OR NEW.paiement != OLD.paiement OR NEW.livraison != OLD.livraison
)
BEGIN
  SELECT RAISE(ABORT, 'vente_annulee');
END;
CREATE TRIGGER contenance_vente_active BEFORE DELETE ON contenances
WHEN EXISTS (
  SELECT 1 FROM lignes_vente l JOIN ventes v ON v.id = l.vente_id
  WHERE l.slug = OLD.slug AND l.ml = OLD.ml AND v.statut != 'annulee'
)
BEGIN
  SELECT RAISE(ABORT, 'contenance_utilisee');
END;
CREATE INDEX alertes_date ON alertes_stock (cree_le);
