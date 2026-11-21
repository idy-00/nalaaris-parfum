-- Installation unique sur une base D1 vide. Données publiques du catalogue uniquement.
-- Schéma initial de l'espace admin Nal'Aaris (Cloudflare D1 / SQLite).
-- Montants : FCFA entiers. Dates : ISO 8601 UTC (Africa/Dakar = UTC toute l'année).
-- Appliquer : npx wrangler d1 migrations apply DB --local   (ou --remote --env preview|production)

PRAGMA foreign_keys = ON;

-- Parfums. Deux familles de colonnes :
--  * possédées par l'import (npm run import-catalogue) : marque, nom, concentration, categorie, notes, ingredients,
--    images, description_import, styles_import — réécrites à chaque import ;
--  * possédées par la boutique (admin) : nom_public, styles, description, porter, drapeaux — jamais touchées par l'import.
CREATE TABLE parfums (
  slug               TEXT PRIMARY KEY CHECK (slug GLOB '[a-z0-9]*' AND length(slug) <= 120),
  marque             TEXT NOT NULL,
  nom                TEXT NOT NULL,
  nom_public         TEXT,
  concentration      TEXT,
  categorie          TEXT NOT NULL CHECK (categorie IN ('femme', 'homme', 'unisexe')),
  styles_import      TEXT NOT NULL DEFAULT '[]',
  styles             TEXT,
  description_import TEXT NOT NULL DEFAULT '',
  description        TEXT,
  notes              TEXT NOT NULL DEFAULT '{"bouquet":[]}',
  ingredients        TEXT NOT NULL DEFAULT '[]',
  images             TEXT NOT NULL DEFAULT '[]',
  porter             TEXT,
  nouveau            INTEGER NOT NULL DEFAULT 0 CHECK (nouveau IN (0, 1)),
  coup_de_coeur      INTEGER NOT NULL DEFAULT 0 CHECK (coup_de_coeur IN (0, 1)),
  masque             INTEGER NOT NULL DEFAULT 0 CHECK (masque IN (0, 1)),
  dispo_force        TEXT CHECK (dispo_force IN ('disponible', 'limite', 'epuise', 'sur_commande')),
  statut             TEXT NOT NULL DEFAULT 'publie' CHECK (statut IN ('publie', 'visuel_a_creer')),
  photo_r2           TEXT,
  source             TEXT NOT NULL DEFAULT 'import' CHECK (source IN ('import', 'admin')),
  ordre              INTEGER NOT NULL DEFAULT 0,
  cree_le            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  maj_le             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  maj_par            TEXT
);
CREATE INDEX parfums_marque ON parfums (marque);
CREATE INDEX parfums_statut ON parfums (statut, masque);

-- Contenances : une ligne par format vendu. prix_vente NULL = « Demander le prix ».
-- stock NULL = stock pas suivi (aucun badge sur le site) ; sinon jamais négatif.
CREATE TABLE contenances (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL REFERENCES parfums (slug) ON DELETE CASCADE ON UPDATE CASCADE,
  ml            INTEGER NOT NULL CHECK (ml BETWEEN 0 AND 1000),
  prix_vente    INTEGER CHECK (prix_vente BETWEEN 0 AND 10000000),
  prix_achat    INTEGER CHECK (prix_achat BETWEEN 0 AND 10000000),
  stock         INTEGER CHECK (stock >= 0),
  seuil_alerte  INTEGER NOT NULL DEFAULT 2 CHECK (seuil_alerte BETWEEN 0 AND 1000),
  dispo_force   TEXT CHECK (dispo_force IN ('sur_commande', 'epuise')),
  ordre         INTEGER NOT NULL DEFAULT 0,
  maj_le        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  maj_par       TEXT,
  UNIQUE (slug, ml)
);
CREATE INDEX contenances_slug ON contenances (slug);

-- Ventes notées depuis WhatsApp. Prénom / téléphone facultatifs, jamais exposés par l'API publique.
CREATE TABLE ventes (
  id              INTEGER PRIMARY KEY,
  date_vente      TEXT NOT NULL,
  statut          TEXT NOT NULL CHECK (statut IN ('a_livrer', 'livree', 'payee', 'annulee')),
  paiement        TEXT NOT NULL CHECK (paiement IN ('wave', 'orange_money', 'especes', 'autre')),
  livraison       TEXT NOT NULL CHECK (livraison IN ('retrait', 'livraison')),
  zone            TEXT,
  frais_livraison INTEGER NOT NULL DEFAULT 0 CHECK (frais_livraison BETWEEN 0 AND 1000000),
  client_prenom   TEXT,
  client_tel      TEXT,
  total           INTEGER NOT NULL CHECK (total >= 0),
  note            TEXT,
  est_test        INTEGER NOT NULL DEFAULT 0 CHECK (est_test IN (0, 1)),
  anonymise_le    TEXT,
  cree_le         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  cree_par        TEXT,
  maj_le          TEXT,
  maj_par         TEXT
);
CREATE INDEX ventes_date ON ventes (date_vente);
CREATE INDEX ventes_statut ON ventes (statut);

-- Lignes : prix figés au moment de la vente (la marge reste juste si le prix change ensuite).
CREATE TABLE lignes_vente (
  id                  INTEGER PRIMARY KEY,
  vente_id            INTEGER NOT NULL REFERENCES ventes (id) ON DELETE CASCADE,
  slug                TEXT NOT NULL,
  ml                  INTEGER NOT NULL,
  quantite            INTEGER NOT NULL CHECK (quantite BETWEEN 1 AND 50),
  prix_unitaire       INTEGER NOT NULL CHECK (prix_unitaire >= 0),
  prix_achat_unitaire INTEGER
);
CREATE INDEX lignes_vente_vente ON lignes_vente (vente_id);
CREATE INDEX lignes_vente_slug ON lignes_vente (slug);

-- Statistiques du site : ni cookie, ni IP, ni identifiant. Purge > 13 mois.
CREATE TABLE evenements (
  id           INTEGER PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('vue_fiche', 'clic_commander', 'clic_whatsapp_general', 'recherche', 'ajout_selection', 'me_prevenir')),
  slug         TEXT,
  ml           INTEGER,
  texte        TEXT,
  nb_resultats INTEGER,
  appareil     TEXT CHECK (appareil IN ('mobile', 'tablette', 'ordinateur')),
  origine      TEXT,
  cree_le      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX evenements_type ON evenements (type, cree_le);
CREATE INDEX evenements_slug ON evenements (slug, type);
CREATE INDEX evenements_date ON evenements (cree_le);

-- Plafond global d'événements par jour (protection contre le gonflage des statistiques).
CREATE TABLE compteurs (
  jour TEXT PRIMARY KEY,
  n    INTEGER NOT NULL DEFAULT 0
);

-- « Me prévenir quand il revient » : numéro laissé volontairement (formulaire avec mention). Purge > 6 mois.
CREATE TABLE alertes_stock (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL,
  ml          INTEGER,
  prenom      TEXT,
  telephone   TEXT NOT NULL,
  cree_le     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  prevenue_le TEXT
);
CREATE INDEX alertes_slug ON alertes_stock (slug, prevenue_le);

-- Réglages clé / valeur JSON (« boutique » : WhatsApp, horaires, zones, paiements, retrait).
CREATE TABLE reglages (
  cle     TEXT PRIMARY KEY,
  valeur  TEXT NOT NULL,
  maj_le  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  maj_par TEXT
);

-- Avis clients réels. Impossible d'enregistrer un avis sans l'accord de la cliente.
CREATE TABLE avis (
  id             INTEGER PRIMARY KEY,
  prenom         TEXT NOT NULL,
  ville          TEXT,
  texte          TEXT NOT NULL,
  note           INTEGER CHECK (note BETWEEN 1 AND 5),
  date_avis      TEXT NOT NULL,
  accord_cliente INTEGER NOT NULL CHECK (accord_cliente = 1),
  publie         INTEGER NOT NULL DEFAULT 0 CHECK (publie IN (0, 1)),
  cree_le        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  cree_par       TEXT
);

-- Journal : qui a changé quoi, quand, avant → après.
CREATE TABLE journal (
  id      INTEGER PRIMARY KEY,
  quand   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  qui     TEXT NOT NULL,
  action  TEXT NOT NULL,
  entite  TEXT NOT NULL,
  cle     TEXT,
  libelle TEXT,
  champ   TEXT,
  avant   TEXT,
  apres   TEXT
);
CREATE INDEX journal_quand ON journal (quand);

-- Publications sur le site (deploy hook).
CREATE TABLE publications (
  id     INTEGER PRIMARY KEY,
  quand  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  qui    TEXT NOT NULL,
  statut TEXT NOT NULL CHECK (statut IN ('envoyee', 'echec')),
  detail TEXT
);

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

INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('afnan-9pm', 'Afnan', '9pm', NULL, 'Eau de parfum', 'homme', '["frais","fleuri"]', '["oriental","vanille"]', 'Un parfum frais et fleuri qui s’ouvre sur des notes de bergamote et de lavandin. Le cœur apporte des notes de muguet et de fleur d’oranger, et le fond mêle des notes de patchouli, d’ambre et de vanille.', 'Chaud et épicé, avec une douceur vanillée qui s’installe vite sur la peau. Un parfum de soirée, à garder pour les sorties de la saison fraîche.', '{"tete":["Bergamote","Lavandin","Cannelle","Pomme"],"coeur":["Muguet","Fleur d’oranger"],"fond":["Patchouli","Ambre","Vanille","Fève tonka"]}', '["Pomme verte","Cannelle","Lavande","Vanille","Ambre","Fève tonka"]', '["/parfums/afnan-9pm/1122.webp"]', '{"moment":"soir","momentDetail":"Sorties, rendez-vous","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"sortie","titre":"Sillage marqué","detail":"tient la nuit"}}', 0, 0, NULL, 'publie', 'import', 0, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('afnan-9pm-rebel', 'Afnan', '9pm Rebel', NULL, 'Eau de parfum', 'unisexe', '["boise","vanille"]', NULL, 'Un parfum boisé et vanillé qui s’ouvre sur des notes de mandarine et d’ananas. Le cœur apporte des notes de cèdre et de mousse de chêne, et le fond mêle des notes de caramel, de bois secs et d’ambre gris.', 'Il démarre fruité et pétillant, puis glisse vers un fond de caramel et de bois secs. Facile à porter du matin au soir, en toute saison.', '{"tete":["Mandarine","Ananas","Pomme Granny Smith"],"coeur":["Cèdre","Mousse de chêne","Vanille"],"fond":["Caramel","Bois secs","Ambre gris","Musc"]}', '["Mandarine","Ananas","Pomme verte","Cèdre","Vanille"]', '["/parfums/afnan-9pm-rebel/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Journée comme soirée","saison":"annee","saisonDetail":"frais comme chaud","occasion":{"icone":"sortie","titre":"Entre amis","detail":"fruité puis caramel"}}', 0, 0, NULL, 'publie', 'import', 1, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('al-rehab-choco-musk', 'Al Rehab', 'Choco Musk', NULL, 'Eau de parfum', 'unisexe', '["oriental","vanille"]', NULL, 'Un parfum oriental et vanillé qui associe des notes de vanille, de chocolat au lait et de musc blanc. On y trouve aussi des notes d’épices, de cannelle et d’ambre.', 'Une gourmandise chocolatée, enveloppée de musc et d’épices douces. À réserver aux soirées fraîches et aux fêtes comme la Korité ou la Tabaski.', '{"bouquet":["Vanille","Chocolat au lait","Musc blanc","Épices","Cannelle","Ambre","Santal","Myrrhe","Rose"]}', '["Vanille","Chocolat au lait","Cannelle","Santal","Myrrhe","Rose"]', '["/parfums/al-rehab-choco-musk/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées douces","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"ceremonie","titre":"Korité, Tabaski","detail":"chocolat, musc et épices"}}', 0, 0, NULL, 'publie', 'import', 2, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('ard-al-zaafaran-mousuf', 'Ard Al Zaafaran', 'Mousuf', NULL, 'Eau de parfum', 'unisexe', '["boise","frais"]', NULL, 'Un parfum boisé et frais qui s’ouvre sur des notes de bergamote et de prune. Le cœur apporte des notes d’ananas et de noisette grillée, et le fond mêle des notes de bois ambrés, de cèdre et de patchouli.', 'Un boisé net, réveillé par une touche fruitée et poivrée, qui reste discret. Il se porte au bureau comme le soir, toute l’année.', '{"tete":["Bergamote","Prune","Citron"],"coeur":["Ananas","Noisette grillée","Poivre noir"],"fond":["Bois ambrés","Cèdre","Patchouli"]}', '["Bergamote","Citron","Ananas","Noisette grillée","Poivre noir","Cèdre"]', '["/parfums/ard-al-zaafaran-mousuf/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du bureau au soir","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"bureau","titre":"Au bureau","detail":"boisé, sans excès"}}', 0, 0, NULL, 'publie', 'import', 3, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('ard-al-zaafaran-mousuf-blanc', 'Ard Al Zaafaran', 'Mousuf blanc (provisoire)', 'Mousuf — pochon blanc', 'Eau de parfum', 'unisexe', '["boise","frais"]', NULL, 'Un parfum boisé et frais qui s’ouvre sur des notes de bergamote et de prune. Le cœur apporte des notes d’ananas et de noisette grillée, et le fond mêle des notes de bois ambrés, de cèdre et de patchouli.', 'Un boisé fruité, simple à porter, qui ne prend pas toute la place. Pour tous les jours, de la journée jusqu’à la fin d’après-midi.', '{"tete":["Bergamote","Prune","Citron"],"coeur":["Ananas","Noisette grillée","Poivre noir"],"fond":["Bois ambrés","Cèdre","Patchouli"]}', '["Bergamote","Citron","Ananas","Noisette grillée","Poivre noir","Cèdre"]', '["/parfums/ard-al-zaafaran-mousuf-blanc/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Journée, fin d’après-midi","saison":"annee","saisonDetail":"frais comme chaud","occasion":{"icone":"quotidien","titre":"Au quotidien","detail":"boisé et fruité"}}', 0, 0, NULL, 'publie', 'import', 4, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('ard-al-zaafaran-mousuf-vert', 'Ard Al Zaafaran', 'Mousuf vert (provisoire)', 'Mousuf — vert', 'Eau de parfum', 'unisexe', '["boise","frais"]', NULL, 'Un parfum boisé et frais qui s’ouvre sur des notes de bergamote et de prune. Le cœur apporte des notes d’ananas et de noisette grillée, et le fond mêle des notes de bois ambrés, de cèdre et de patchouli.', 'Boisé et assuré, avec un départ d’agrumes qui donne une impression nette. Un bon compagnon pour les rendez-vous professionnels, en toute saison.', '{"tete":["Bergamote","Prune","Citron"],"coeur":["Ananas","Noisette grillée","Poivre noir"],"fond":["Bois ambrés","Cèdre","Patchouli"]}', '["Bergamote","Citron","Ananas","Noisette grillée","Poivre noir","Cèdre"]', '["/parfums/ard-al-zaafaran-mousuf-vert/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du matin au dîner","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"bureau","titre":"Rendez-vous pro","detail":"net et assuré"}}', 0, 0, NULL, 'publie', 'import', 5, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('ard-al-zaafaran-mousuf-wardi', 'Ard Al Zaafaran', 'Mousuf Wardi', NULL, 'Eau de parfum', 'femme', '["fleuri","boise"]', '["fleuri","doux"]', 'Un parfum fleuri et boisé qui s’ouvre sur des notes de litchi et de rhubarbe. Le cœur apporte des notes de rose et de vanille, et le fond mêle des notes de musc blanc et de cashmeran.', 'Une rose gourmande et fruitée, adoucie par un fond musqué. Lumineuse, elle se porte en journée, tous les jours.', '{"tete":["Litchi","Rhubarbe","Fraise"],"coeur":["Rose","Vanille","Pomme"],"fond":["Musc blanc","Cashmeran"]}', '["Litchi","Rhubarbe","Fraise","Rose","Vanille","Pomme"]', '["/parfums/ard-al-zaafaran-mousuf-wardi/1122.webp"]', '{"moment":"jour","momentDetail":"Lumineux, fruité","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"quotidien","titre":"Tous les jours","detail":"rose et fruits rouges"}}', 0, 0, NULL, 'publie', 'import', 6, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('armaf-club-de-nuit-intense-man', 'Armaf', 'Club de Nuit Intense Man', NULL, 'Eau de toilette', 'homme', '["frais","fleuri"]', '["frais","boise"]', 'Un parfum frais et fleuri qui s’ouvre sur des notes de pomme et de bergamote. Le cœur apporte des notes de rose et de bouleau, et le fond mêle des notes de musc, d’ambre gris et de patchouli.', 'Fruité au départ, il prend ensuite une allure boisée, légèrement fumée. Il passe de la journée à la soirée et accompagne bien les sorties.', '{"tete":["Pomme","Bergamote","Cassis","Ananas","Citron"],"coeur":["Rose","Bouleau","Jasmin"],"fond":["Musc","Ambre gris","Patchouli","Vanille"]}', '["Pomme","Bergamote","Cassis","Ananas","Bouleau","Vanille"]', '["/parfums/armaf-club-de-nuit-intense-man/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Journée et soirée","saison":"annee","saisonDetail":"frais comme chaud","occasion":{"icone":"sortie","titre":"Sorties","detail":"fruité et boisé"}}', 0, 0, NULL, 'publie', 'import', 7, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('armaf-odyssey-homme', 'Armaf', 'Odyssey Homme', NULL, 'Eau de parfum', 'homme', '["fleuri","boise"]', NULL, 'Un parfum fleuri et boisé qui s’ouvre sur des notes de mandarine et de néroli. Le cœur apporte des notes de rose et de fleur d’oranger, et le fond mêle des notes de santal, de vanille et d’ambre.', 'Floral et chaleureux, avec un fond ambré qui gagne en rondeur au fil des heures. Il suit une journée de travail jusqu’au dîner.', '{"tete":["Mandarine","Néroli","Cardamome"],"coeur":["Rose","Fleur d’oranger"],"fond":["Santal","Vanille","Ambre","Accords boisés"]}', '["Mandarine","Cardamome","Rose","Fleur d’oranger","Santal","Vanille"]', '["/parfums/armaf-odyssey-homme/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du bureau au dîner","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"diner","titre":"Dîner","detail":"floral, chaud et ambré"}}', 0, 0, NULL, 'publie', 'import', 8, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('asdaaf-ameerat-al-arab', 'Asdaaf', 'Ameerat Al Arab', NULL, 'Eau de parfum', 'femme', '["frais","doux"]', NULL, 'Un parfum frais et doux qui s’ouvre sur des notes d’agrumes et de bergamote. Le cœur apporte des notes de musc blanc et d’aloe vera, et le fond mêle des notes de jasmin, de musc et des notes boisées.', 'Un musc propre et doux, relevé d’une touche d’oud qui reste légère. Pour les cérémonies, mariages ou baptêmes, du matin à la nuit.', '{"tete":["Agrumes","Bergamote"],"coeur":["Musc blanc","Aloe vera"],"fond":["Jasmin","Musc","Notes boisées","Oud"]}', '["Bergamote","Aloe vera","Jasmin","Oud"]', '["/parfums/asdaaf-ameerat-al-arab/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du matin à la nuit","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"ceremonie","titre":"Mariages, baptêmes","detail":"musc propre, oud doux"}}', 0, 0, NULL, 'publie', 'import', 9, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('asdaaf-ameerat-al-arab-prive-rose', 'Asdaaf', 'Ameerat Al Arab Prive Rose', NULL, 'Eau de parfum', 'femme', '["fleuri","frais"]', NULL, 'Un parfum fleuri et frais qui s’ouvre sur des notes de fraise et de raisin. Le cœur apporte des notes de rose et de musc blanc, et le fond mêle des notes de fève tonka, d’ambre et de santal.', 'Une rose entourée de fleurs blanches et de fruits, généreuse sans être lourde. Elle trouve sa place à un dîner en famille, de l’après-midi au soir.', '{"tete":["Fraise","Raisin","Orange"],"coeur":["Rose","Musc blanc","Gardénia","Jasmin","Lys","Ylang-ylang"],"fond":["Fève tonka","Ambre","Santal"]}', '["Fraise","Raisin","Orange","Rose","Jasmin","Fève tonka"]', '["/parfums/asdaaf-ameerat-al-arab-prive-rose/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Après-midi, soirée","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"diner","titre":"Dîner en famille","detail":"rose et fleurs blanches"}}', 0, 0, NULL, 'publie', 'import', 10, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('azzaro-wanted', 'Azzaro', 'Wanted', NULL, 'Eau de toilette', 'homme', '["frais","boise"]', NULL, 'Un parfum frais et boisé qui s’ouvre sur des notes de citron et de gingembre. Le cœur apporte des notes de pomme et de cardamome, et le fond mêle des notes de fève tonka, de bois ambrés et de vétiver.', 'Frais et légèrement épicé, avec une pointe de gingembre qui réveille. Pensé pour la journée et la chaleur, il reste discret au bureau.', '{"tete":["Citron","Gingembre","Lavande","Menthe"],"coeur":["Pomme","Cardamome","Genévrier","Géranium"],"fond":["Fève tonka","Bois ambrés","Vétiver"]}', '["Citron","Gingembre","Lavande","Pomme","Cardamome","Fève tonka"]', '["/parfums/azzaro-wanted/1122.webp"]', '{"moment":"jour","momentDetail":"Matin et après-midi","saison":"chaude","saisonDetail":"idéal mai → nov.","occasion":{"icone":"bureau","titre":"Au bureau","detail":"frais, épicé léger"}}', 0, 0, NULL, 'publie', 'import', 11, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('carolina-herrera-212-men', 'Carolina Herrera', '212 Men', NULL, 'Eau de toilette', 'homme', '["frais","boise"]', NULL, 'Un parfum frais et boisé qui s’ouvre sur des notes de pamplemousse et des notes vertes. Le cœur apporte des notes de gingembre et de violette, et le fond mêle des notes de musc, de santal et d’encens.', 'Vert et propre, avec une impression de linge frais. Un parfum de tous les jours, à l’aise dans la chaleur de l’hivernage.', '{"tete":["Notes vertes","Pamplemousse","Épices","Bergamote","Lavande","Petitgrain"],"coeur":["Gingembre","Violette","Gardénia","Sauge"],"fond":["Musc","Santal","Encens","Vétiver","Gaïac","Labdanum"]}', '["Pamplemousse","Bergamote","Lavande","Gingembre","Violette","Santal"]', '["/parfums/carolina-herrera-212-men/1122.webp"]', '{"moment":"jour","momentDetail":"Le matin, la journée","saison":"chaude","saisonDetail":"chaleur de l’hivernage","occasion":{"icone":"quotidien","titre":"Tous les jours","detail":"vert et propre"}}', 0, 0, NULL, 'publie', 'import', 12, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('chanel-bleu-de-chanel', 'Chanel', 'Bleu de Chanel', NULL, 'Eau de parfum', 'homme', '["frais","oriental"]', '["frais","boise"]', 'Un parfum frais et oriental qui s’ouvre sur des notes de pamplemousse et de citron. Le cœur apporte des notes de gingembre et de jasmin, et le fond mêle des notes d’encens, d’ambre et de cèdre.', 'Frais et boisé, avec une élégance nette qui ne force pas. Il suit une journée de réunions jusqu’au dîner, toute l’année.', '{"tete":["Pamplemousse","Citron","Menthe","Bergamote","Poivre rose","Aldéhydes","Coriandre"],"coeur":["Gingembre","Jasmin","Muscade","Melon"],"fond":["Encens","Ambre","Cèdre","Santal","Bois ambrés","Patchouli","Labdanum"]}', '["Pamplemousse","Citron","Menthe","Gingembre","Cèdre","Santal"]', '["/parfums/chanel-bleu-de-chanel/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Réunion, puis dîner","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"bureau","titre":"Réunions, rendez-vous","detail":"net et élégant"}}', 0, 0, NULL, 'publie', 'import', 13, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('chanel-coco-mademoiselle', 'Chanel', 'Coco Mademoiselle', NULL, 'Eau de parfum', 'femme', '["fleuri","boise"]', NULL, 'Un parfum fleuri et boisé qui s’ouvre sur des notes d’orange. Le cœur apporte des notes de jasmin et de rose de mai, et le fond mêle des notes de patchouli et de vétiver.', 'Floral et chic, avec un fond boisé qui lui donne de la profondeur. Il va du bureau au dîner sans en faire trop.', '{"tete":["Orange"],"coeur":["Jasmin","Rose de mai"],"fond":["Patchouli","Vétiver"]}', '["Orange","Jasmin","Rose","Patchouli","Vétiver"]', '["/parfums/chanel-coco-mademoiselle/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du bureau au dîner","saison":"annee","saisonDetail":"frais comme chaud","occasion":{"icone":"bureau","titre":"Au bureau","detail":"chic, sans en faire trop"}}', 0, 0, NULL, 'publie', 'import', 14, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('chloe-leau-de-parfum-intense', 'Chloé', 'L’Eau de Parfum Intense', NULL, 'Eau de parfum intense', 'femme', '["boise","fleuri"]', NULL, 'Un parfum boisé et fleuri qui s’ouvre sur des notes de framboise. Le cœur apporte des notes de rose, et le fond mêle des notes d’ambrox, de cashmeran et de cèdre.', 'Une rose boisée et veloutée, plus profonde qu’une rose légère de journée. Elle se porte plutôt en fin de journée, pour un dîner.', '{"tete":["Framboise"],"coeur":["Rose"],"fond":["Ambrox","Cashmeran","Cèdre"]}', '["Framboise","Rose","Cèdre"]', '["/parfums/chloe-leau-de-parfum-intense/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Plutôt en fin de journée","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"diner","titre":"Dîner","detail":"rose boisée, plus intense"}}', 0, 0, NULL, 'publie', 'import', 15, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('dior-fahrenheit', 'Dior', 'Fahrenheit', NULL, 'Eau de toilette', 'homme', '["fleuri","frais"]', '["boise","fleuri"]', 'Un parfum fleuri et frais qui s’ouvre sur des notes de fleur de muscade et de lavande. Le cœur apporte des notes de feuille de violette et de muscade, et le fond mêle des notes de cuir, de vétiver et de musc.', 'Un mélange singulier de cuir et de violette, à la fois frais et sombre. Il se porte du bureau aux soirées, en toute saison.', '{"tete":["Fleur de muscade","Lavande","Cèdre","Mandarine","Camomille","Bergamote","Aubépine","Citron"],"coeur":["Feuille de violette","Muscade","Cèdre","Santal","Œillet","Chèvrefeuille","Jasmin","Muguet"],"fond":["Cuir","Vétiver","Musc","Ambre","Patchouli","Fève tonka"]}', '["Mandarine","Lavande","Feuilles de violette","Muscade","Santal","Fève tonka"]', '["/parfums/dior-fahrenheit/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du bureau à la soirée","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"sortie","titre":"Soirées","detail":"cuir et violette"}}', 0, 0, NULL, 'publie', 'import', 16, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('dior-hypnotic-poison', 'Dior', 'Hypnotic Poison', NULL, 'Eau de parfum', 'femme', '["vanille","fleuri"]', '["vanille","oriental"]', 'Un parfum vanillé et fleuri qui associe des notes d’amande amère, de jasmin sambac et de vanille. On y trouve aussi des notes de musc et de fève tonka.', 'L’amande et la vanille se mêlent dans un sillage doux et enveloppant. Un parfum du soir, à sortir pendant les soirées d’harmattan.', '{"bouquet":["Amande amère","Jasmin sambac","Vanille","Musc","Fève tonka"]}', '["Amandes","Jasmin sambac","Vanille","Fève tonka"]', '["/parfums/dior-hypnotic-poison/1122.webp"]', '{"moment":"soir","momentDetail":"Le soir venu","saison":"fraiche","saisonDetail":"soirées d’harmattan","occasion":{"icone":"diner","titre":"Dîner","detail":"amande et vanille"}}', 0, 0, NULL, 'publie', 'import', 17, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('dior-jadore', 'Dior', 'J’adore', NULL, 'Eau de parfum', 'femme', '["fleuri"]', NULL, 'Un parfum fleuri qui associe des notes d’ylang-ylang, de rose de Damas et de jasmin grandiflorum. On y trouve aussi des notes de jasmin sambac.', 'Un bouquet de fleurs blanches et de rose, lumineux et solaire. Il convient aux cérémonies et aux journées chaudes, de mai à novembre.', '{"bouquet":["Ylang-ylang","Rose de Damas","Jasmin grandiflorum","Jasmin sambac"]}', '["Ylang-ylang","Rose de Damas","Jasmin grandiflorum","Jasmin sambac"]', '["/parfums/dior-jadore/1122.webp"]', '{"moment":"jour","momentDetail":"lumineux, solaire","saison":"chaude","saisonDetail":"idéal mai → nov.","occasion":{"icone":"ceremonie","titre":"Cérémonies","detail":"bureau, mariages"}}', 0, 0, NULL, 'publie', 'import', 18, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('dior-miss-dior', 'Dior', 'Miss Dior', NULL, 'Eau de parfum', 'femme', '["fleuri","vanille"]', NULL, 'Un parfum fleuri et vanillé qui s’ouvre sur des notes d’iris et de pivoine. Le cœur apporte des notes de rose et d’abricot, et le fond mêle des notes de vanille, de musc et de fève tonka.', 'Floral et doux, avec une touche fruitée qui le rend facile à porter. Un parfum du quotidien, du matin à l’après-midi.', '{"tete":["Iris","Pivoine","Muguet"],"coeur":["Rose","Abricot","Pêche"],"fond":["Vanille","Musc","Fève tonka","Santal","Benjoin"]}', '["Iris","Rose","Pêche","Vanille","Fève tonka"]', '["/parfums/dior-miss-dior/1122.webp"]', '{"moment":"jour","momentDetail":"Matinées, après-midi","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"quotidien","titre":"Au quotidien","detail":"floral et doux"}}', 0, 0, NULL, 'publie', 'import', 19, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('dior-sauvage', 'Dior', 'Sauvage', NULL, 'Parfum', 'homme', '["frais","boise"]', NULL, 'Un parfum frais et boisé qui s’ouvre sur des notes de mandarine et de bergamote. Le cœur apporte des notes de santal et de cèdre, et le fond mêle des notes de vanille et de fève tonka.', 'Une fraîcheur d’agrumes posée sur un fond boisé, légèrement vanillé. Une ou deux pulvérisations suffisent, surtout pour les soirées.', '{"tete":["Mandarine","Bergamote"],"coeur":["Santal","Cèdre"],"fond":["Vanille","Fève tonka"]}', '["Mandarine","Bergamote","Santal","Cèdre","Vanille","Fève tonka"]', '["/parfums/dior-sauvage/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Surtout en soirée","saison":"annee","saisonDetail":"frais comme chaud","occasion":{"icone":"sortie","titre":"Sillage présent","detail":"une ou deux pulvérisations"}}', 0, 0, NULL, 'publie', 'import', 20, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('giorgio-armani-armani-code-profumo', 'Giorgio Armani', 'Armani Code Profumo', NULL, 'Eau de parfum', 'homme', '["oriental","frais"]', '["oriental","vanille"]', 'Un parfum oriental et frais qui s’ouvre sur des notes de cardamome et de pomme verte. Le cœur apporte des notes de muscade et de lavande, et le fond mêle des notes de fève tonka, d’ambre et de cuir.', 'Chaud et ambré, avec une touche de cuir qui le rend plus profond. Un parfum de rendez-vous du soir, pour la saison fraîche.', '{"tete":["Cardamome","Pomme verte","Mandarine verte"],"coeur":["Muscade","Lavande","Fleur d’oranger"],"fond":["Fève tonka","Ambre","Cuir"]}', '["Cardamome","Pomme verte","Mandarine verte","Muscade","Lavande","Fève tonka"]', '["/parfums/giorgio-armani-armani-code-profumo/1122.webp"]', '{"moment":"soir","momentDetail":"Rendez-vous du soir","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"sortie","titre":"Rendez-vous","detail":"chaud et ambré"}}', 0, 0, NULL, 'publie', 'import', 21, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('giorgio-armani-my-way-intense', 'Giorgio Armani', 'My Way Intense', NULL, 'Eau de parfum intense', 'femme', '["fleuri","boise"]', NULL, 'Un parfum fleuri et boisé qui s’ouvre sur des notes de fleur d’oranger. Le cœur apporte des notes de tubéreuse, et le fond mêle des notes de santal et de vanille.', 'La tubéreuse domine, crémeuse et dense, sur un fond de santal et de vanille. À réserver aux soirées habillées et aux mariages de la saison fraîche.', '{"tete":["Fleur d’oranger"],"coeur":["Tubéreuse"],"fond":["Santal","Vanille"]}', '["Fleur d’oranger","Tubéreuse","Santal","Vanille"]', '["/parfums/giorgio-armani-my-way-intense/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées habillées","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"ceremonie","titre":"Mariages","detail":"tubéreuse, sillage dense"}}', 0, 0, NULL, 'publie', 'import', 22, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('giorgio-armani-si', 'Giorgio Armani', 'Sì', NULL, 'Eau de parfum', 'femme', '["fleuri","frais"]', NULL, 'Un parfum fleuri et frais qui associe des notes de cassis, de mandarine et de fleur d’oranger. On y trouve aussi des notes de vanille, de rose de mai et de musc blanc.', 'Fruité et chic, avec une douceur vanillée qui reste légère. Il se porte toute la journée, toute l’année.', '{"bouquet":["Cassis","Mandarine","Fleur d’oranger","Vanille","Rose de mai","Musc blanc","Freesia"]}', '["Cassis","Mandarine","Fleur d’oranger","Vanille","Rose","Freesia"]', '["/parfums/giorgio-armani-si/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Toute la journée","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"quotidien","titre":"Au quotidien","detail":"fruité et chic"}}', 0, 0, NULL, 'publie', 'import', 23, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('giorgio-armani-si-intense', 'Giorgio Armani', 'Sì Intense', NULL, 'Eau de parfum', 'femme', '["fleuri","boise"]', NULL, 'Un parfum fleuri et boisé qui s’ouvre sur des notes de sirop de cassis. Le cœur apporte des notes de rose de Turquie et de davana, et le fond mêle des notes de benjoin et de patchouli.', 'Une rose profonde et un cassis sombre, sur un fond résineux. Un parfum de dîner, pour les soirées de la saison fraîche.', '{"tete":["Sirop de cassis"],"coeur":["Rose de Turquie","Davana"],"fond":["Benjoin","Patchouli"]}', '["Cassis","Rose","Davana","Benjoin","Patchouli"]', '["/parfums/giorgio-armani-si-intense/1122.webp"]', '{"moment":"soir","momentDetail":"Dîners, soirées","saison":"fraiche","saisonDetail":"soirées de janvier","occasion":{"icone":"diner","titre":"Dîner","detail":"rose et cassis profonds"}}', 0, 0, NULL, 'publie', 'import', 24, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('giorgio-armani-si-passione-eclat', 'Giorgio Armani', 'Sì Passione Éclat', NULL, 'Eau de parfum', 'femme', '["fleuri","frais"]', NULL, 'Un parfum fleuri et frais qui s’ouvre sur des notes de cassis et de bergamote. Le cœur apporte des notes de rose centifolia et de rose de Damas, et le fond mêle des notes de musc blanc et de vanille de Madagascar.', 'Une rose fraîche et discrète, éclairée par le cassis. Elle se porte en journée, au bureau, en toute saison.', '{"tete":["Cassis","Bergamote"],"coeur":["Rose centifolia","Rose de Damas"],"fond":["Musc blanc","Vanille de Madagascar"]}', '["Cassis","Bergamote","Rose centifolia","Rose de Damas","Vanille"]', '["/parfums/giorgio-armani-si-passione-eclat/1122.webp"]', '{"moment":"jour","momentDetail":"Journée lumineuse","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"bureau","titre":"Au bureau","detail":"rose fraîche, discrète"}}', 0, 0, NULL, 'publie', 'import', 25, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('givenchy-irresistible', 'Givenchy', 'Irresistible', NULL, 'Eau de parfum', 'femme', '["fleuri","boise"]', '["fleuri","doux"]', 'Un parfum fleuri et boisé qui s’ouvre sur des notes de poire et d’ambrette. Le cœur apporte des notes de rose et d’iris, et le fond mêle des notes de cèdre et de bois blonds.', 'Une rose légère et poudrée, adoucie par une touche de poire. Facile à porter tous les jours, du matin au goûter.', '{"tete":["Poire","Ambrette"],"coeur":["Rose","Iris"],"fond":["Cèdre","Bois blonds"]}', '["Poire","Graines d’ambrette","Rose","Iris","Cèdre"]', '["/parfums/givenchy-irresistible/1122.webp"]', '{"moment":"jour","momentDetail":"Du matin au goûter","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"quotidien","titre":"Tous les jours","detail":"rose légère, poudrée"}}', 0, 0, NULL, 'publie', 'import', 26, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('givenchy-linterdit', 'Givenchy', 'L’Interdit', NULL, 'Eau de parfum', 'femme', '["fleuri","boise"]', NULL, 'Un parfum fleuri et boisé qui associe des notes de fleur d’oranger, de jasmin et de tubéreuse. On y trouve aussi des notes de vétiver et de patchouli.', 'Des fleurs blanches sur un fond boisé un peu sombre, pour un contraste élégant. Il se porte de la fin de journée au dîner.', '{"bouquet":["Fleur d’oranger","Jasmin","Tubéreuse","Vétiver","Patchouli"]}', '["Fleur d’oranger","Jasmin","Tubéreuse","Vétiver","Patchouli"]', '["/parfums/givenchy-linterdit/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Fin de journée, soirée","saison":"annee","saisonDetail":"frais comme chaud","occasion":{"icone":"diner","titre":"Dîner","detail":"fleurs blanches, fond boisé"}}', 0, 0, NULL, 'publie', 'import', 27, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('givenchy-linterdit-rouge-ultime', 'Givenchy', 'L’Interdit Rouge Ultime', NULL, 'Eau de parfum', 'femme', '["fleuri","boise"]', NULL, 'Un parfum fleuri et boisé qui s’ouvre sur des notes de néroli et de fleur d’oranger. Le cœur apporte des notes de tubéreuse et de cacao, et le fond mêle des notes de patchouli, de vétiver et d’ambroxan.', 'Audacieux : des fleurs blanches réchauffées par le cacao et le patchouli. Un parfum pour être remarquée, aux dîners de la saison fraîche.', '{"tete":["Néroli","Fleur d’oranger","Jasmin"],"coeur":["Tubéreuse","Cacao"],"fond":["Patchouli","Vétiver","Ambroxan"]}', '["Fleur d’oranger","Jasmin","Tubéreuse","Cacao","Patchouli","Vétiver"]', '["/parfums/givenchy-linterdit-rouge-ultime/1122.webp"]', '{"moment":"soir","momentDetail":"Dîners, soirées","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"diner","titre":"Audacieux","detail":"pour être remarquée"}}', 0, 0, NULL, 'publie', 'import', 28, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('gucci-bloom-intense', 'Gucci', 'Bloom Intense', NULL, 'Eau de parfum intense', 'femme', '["fleuri","frais"]', NULL, 'Un parfum fleuri et frais qui s’ouvre sur des notes de poire et de gingembre. Le cœur apporte des notes de jasmin sambac et de fleur d’oranger, et le fond mêle des notes de patchouli, de noix de coco et de mousse cristalline.', 'Le jasmin et la fleur d’oranger s’épanouissent sur un fond doux de noix de coco. Il accompagne les baptêmes et les mariages, de la fête au dîner.', '{"tete":["Poire","Gingembre","Mandarine"],"coeur":["Jasmin sambac","Fleur d’oranger","Belle-de-nuit"],"fond":["Patchouli","Noix de coco","Mousse cristalline"]}', '["Poire","Gingembre","Mandarine","Jasmin sambac","Fleur d’oranger","Patchouli"]', '["/parfums/gucci-bloom-intense/1122.webp"]', '{"moment":"jourSoir","momentDetail":"De la fête au dîner","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"ceremonie","titre":"Baptêmes, mariages","detail":"jasmin et fleur d’oranger"}}', 0, 0, NULL, 'publie', 'import', 29, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('hermes-terre-dhermes', 'Hermès', 'Terre d’Hermès', NULL, 'Parfum', 'homme', '["frais","boise"]', NULL, 'Un parfum frais et boisé qui s’ouvre sur des notes d’orange et de pamplemousse. Le cœur apporte des notes de silex, et le fond mêle des notes de mousse de chêne, de benjoin et des notes boisées.', 'Minéral et boisé, avec une fraîcheur d’orange qui reste sobre. Une pulvérisation suffit pour une journée au bureau, en toute saison.', '{"tete":["Orange","Pamplemousse"],"coeur":["Silex"],"fond":["Notes boisées","Mousse de chêne","Benjoin"]}', '["Orange","Pamplemousse","Mousse de chêne","Résine de benjoin"]', '["/parfums/hermes-terre-dhermes/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du matin au soir","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"bureau","titre":"Au bureau","detail":"minéral, une pulvérisation suffit"}}', 0, 0, NULL, 'publie', 'import', 30, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('jean-paul-gaultier-le-male-elixir-absolu', 'Jean Paul Gaultier', 'Le Male Elixir Absolu', NULL, 'Parfum intense', 'homme', '["frais","vanille"]', '["vanille","oriental"]', 'Un parfum frais et vanillé qui associe des notes de prune, de lavande et de fève tonka. Sa pyramide détaillée (tête, cœur, fond) n’est pas publiée.', 'Dense et gourmand : la prune et la lavande enveloppées de fève tonka. Une pulvérisation suffit, pour les grandes soirées de la saison fraîche.', '{"bouquet":["Prune","Lavande","Fève tonka"]}', '["Prune","Lavande","Fève tonka"]', '["/parfums/jean-paul-gaultier-le-male-elixir-absolu/1122.webp"]', '{"moment":"soir","momentDetail":"Grandes soirées","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"sortie","titre":"Sillage dense","detail":"une pulvérisation suffit"}}', 0, 0, NULL, 'publie', 'import', 31, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('jean-paul-gaultier-le-male-le-parfum', 'Jean Paul Gaultier', 'Le Male Le Parfum', NULL, 'Eau de parfum intense', 'homme', '["frais","fleuri"]', '["oriental","vanille"]', 'Un parfum frais et fleuri qui s’ouvre sur des notes de cardamome. Le cœur apporte des notes de lavande et d’iris, et le fond mêle des notes de vanille.', 'Une lavande douce et poudrée, posée sur une vanille élégante. Il se porte dès la tombée de la nuit, pour un dîner ou un rendez-vous.', '{"tete":["Cardamome"],"coeur":["Lavande","Iris"],"fond":["Vanille"]}', '["Cardamome","Lavande","Iris","Vanille"]', '["/parfums/jean-paul-gaultier-le-male-le-parfum/1122.webp"]', '{"moment":"soir","momentDetail":"Dès la tombée de la nuit","saison":"fraiche","saisonDetail":"soirées d’harmattan","occasion":{"icone":"diner","titre":"Dîner, rendez-vous","detail":"vanillé, élégant"}}', 0, 0, NULL, 'publie', 'import', 32, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('jean-paul-gaultier-scandal', 'Jean Paul Gaultier', 'Scandal', NULL, 'Eau de parfum', 'femme', '["fleuri","vanille"]', NULL, 'Un parfum fleuri et vanillé qui s’ouvre sur des notes d’orange sanguine et de mandarine. Le cœur apporte des notes de miel et de gardénia, et le fond mêle des notes de cire d’abeille, de caramel et de patchouli.', 'Le miel et le caramel donnent un sillage gourmand et lumineux à la fois. Un parfum de sorties, à porter le soir pendant la saison fraîche.', '{"tete":["Orange sanguine","Mandarine"],"coeur":["Miel","Gardénia","Fleur d’oranger","Jasmin","Pêche"],"fond":["Cire d’abeille","Caramel","Patchouli","Réglisse"]}', '["Orange sanguine","Mandarine","Rayon de miel","Gardénia","Fleur d’oranger","Patchouli"]', '["/parfums/jean-paul-gaultier-scandal/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"sortie","titre":"Sorties","detail":"miel et caramel"}}', 0, 0, NULL, 'publie', 'import', 33, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('jean-paul-gaultier-scandal-pour-homme', 'Jean Paul Gaultier', 'Scandal Pour Homme', NULL, 'Eau de toilette', 'homme', '["vanille","frais"]', '["vanille","boise"]', 'Un parfum vanillé et frais qui associe des notes de caramel, de fève tonka et de sauge sclarée. On y trouve aussi des notes de vétiver.', 'Le caramel est rafraîchi par la sauge, pour une gourmandise qui reste sobre. Il se porte de l’après-midi à la soirée, entre amis, en saison fraîche.', '{"bouquet":["Caramel","Fève tonka","Sauge sclarée","Vétiver"]}', '["Caramel","Fève tonka","Sauge sclarée","Vétiver"]', '["/parfums/jean-paul-gaultier-scandal-pour-homme/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Après-midi, soirée","saison":"fraiche","saisonDetail":"saison fraîche","occasion":{"icone":"sortie","titre":"Entre amis","detail":"caramel et sauge"}}', 0, 0, NULL, 'publie', 'import', 34, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('kayali-fleur-majesty-rose-royale-31', 'Kayali', 'Fleur Majesty Rose Royale 31', NULL, 'Eau de parfum', 'femme', '["fleuri","frais"]', NULL, 'Un parfum fleuri et frais qui s’ouvre sur des notes de poire et de pêche. Le cœur apporte des notes de rose et de pivoine, et le fond mêle des notes de musc, de vanille et d’ambrox Super.', 'Une rose fruitée et généreuse, adoucie par la vanille et le praliné. Elle trouve sa place aux baptêmes, de l’après-midi au soir.', '{"tete":["Poire","Pêche","Mandarine","Orange"],"coeur":["Rose","Pivoine","Violette","Magnolia"],"fond":["Musc","Vanille","Ambrox Super","Praline","Vétiver"]}', '["Poire","Pêche","Mandarine","Rose","Pivoine","Magnolia"]', '["/parfums/kayali-fleur-majesty-rose-royale-31/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Après-midi, soirée","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"ceremonie","titre":"Baptêmes","detail":"rose fruitée, généreuse"}}', 0, 0, NULL, 'publie', 'import', 35, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('kayali-vanilla-28', 'Kayali', 'Vanilla 28', NULL, 'Eau de parfum', 'unisexe', '["vanille","fleuri"]', '["vanille","oriental"]', 'Un parfum vanillé et fleuri qui s’ouvre sur des notes d’orchidée vanille et de jasmin. Le cœur apporte des notes de sucre brun et de fève tonka, et le fond mêle des notes d’ambre, de bois ambrés et de musc.', 'Une vanille ronde et sucrée, réchauffée d’ambre. Pour les soirées cocooning et les dîners de la saison fraîche.', '{"tete":["Orchidée vanille","Jasmin"],"coeur":["Sucre brun","Fève tonka"],"fond":["Ambre","Bois ambrés","Musc","Patchouli"]}', '["Orchidée vanille","Jasmin","Fève tonka","Patchouli"]', '["/parfums/kayali-vanilla-28/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées cocooning","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"diner","titre":"Dîner","detail":"vanille et sucre brun"}}', 0, 0, NULL, 'publie', 'import', 36, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lacoste-essential', 'Lacoste', 'Essential', NULL, 'Eau de toilette', 'homme', '["frais","boise"]', NULL, 'Un parfum frais et boisé qui s’ouvre sur des notes de bergamote et de cassia. Le cœur apporte des notes de rose et de poivre, et le fond mêle des notes de santal et de patchouli.', 'Vert et décontracté, avec une note de feuille de tomate qui surprend. Un parfum de journées actives, à l’aise dans la chaleur.', '{"tete":["Bergamote","Cassia","Feuille de tomate","Mandarine"],"coeur":["Rose","Poivre"],"fond":["Santal","Patchouli"]}', '["Bergamote","Feuille de tomate","Mandarine","Rose","Poivre","Santal"]', '["/parfums/lacoste-essential/1122.webp"]', '{"moment":"jour","momentDetail":"Journées actives","saison":"chaude","saisonDetail":"idéal mai → nov.","occasion":{"icone":"quotidien","titre":"Tous les jours","detail":"vert, décontracté"}}', 0, 0, NULL, 'publie', 'import', 37, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lancome-idole', 'Lancôme', 'Idôle', NULL, 'Eau de parfum', 'femme', '["fleuri","vanille"]', NULL, 'Un parfum fleuri et vanillé qui s’ouvre sur des notes de jasmin grandiflorum et de jasmin sambac. Le cœur apporte des notes de rose d’Isparta et de rose centifolia, et le fond mêle des notes de vanille et un accord chypré.', 'Une rose claire et propre, portée par le jasmin. Elle se porte du matin à l’après-midi, au bureau, en toute saison.', '{"tete":["Jasmin grandiflorum","Jasmin sambac"],"coeur":["Rose d’Isparta","Rose centifolia"],"fond":["Accord chypré","Vanille"]}', '["Jasmin grandiflorum","Jasmin sambac","Rose d’Isparta","Rose centifolia","Vanille"]', '["/parfums/lancome-idole/1122.webp"]', '{"moment":"jour","momentDetail":"Du matin à l’après-midi","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"bureau","titre":"Au bureau","detail":"rose claire, propre"}}', 0, 0, NULL, 'publie', 'import', 38, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lancome-la-nuit-tresor', 'Lancôme', 'La Nuit Trésor', NULL, 'Eau de parfum', 'femme', '["fleuri","vanille"]', NULL, 'Un parfum fleuri et vanillé qui associe des notes de rose noire, d’orchidée vanille tahitensis et d’encens. On y trouve aussi des notes de papyrus et de pralin de litchi.', 'Une rose sombre mêlée de vanille et d’encens, intime et enveloppante. Un parfum de rendez-vous à deux, pour la saison fraîche.', '{"bouquet":["Rose noire","Orchidée vanille tahitensis","Encens","Papyrus","Pralin de litchi"]}', '["Rose sombre","Orchidée vanille","Résine d’encens","Papyrus","Litchi"]', '["/parfums/lancome-la-nuit-tresor/1122.webp"]', '{"moment":"soir","momentDetail":"Rendez-vous à deux","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"diner","titre":"Rendez-vous","detail":"rose noire et vanille"}}', 0, 0, NULL, 'publie', 'import', 39, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lancome-la-vie-est-belle', 'Lancôme', 'La Vie Est Belle', NULL, 'Eau de parfum', 'femme', '["fleuri","vanille"]', NULL, 'Un parfum fleuri et vanillé qui s’ouvre sur des notes d’iris pallida et un accord gourmand. Le cœur apporte des notes de fleur d’oranger et de jasmin sambac, et le fond mêle des notes de vanille et de patchouli.', 'Gourmand et réconfortant, avec une douceur florale et vanillée. Il se porte au quotidien, du goûter au dîner, surtout en saison fraîche.', '{"tete":["Iris pallida","Accord gourmand"],"coeur":["Fleur d’oranger","Jasmin sambac"],"fond":["Vanille","Patchouli"]}', '["Iris","Fleur d’oranger","Jasmin","Vanille","Patchouli"]', '["/parfums/lancome-la-vie-est-belle/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du goûter au dîner","saison":"fraiche","saisonDetail":"saison fraîche","occasion":{"icone":"quotidien","titre":"Au quotidien","detail":"gourmand, réconfortant"}}', 0, 0, NULL, 'publie', 'import', 40, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lattafa-asad', 'Lattafa', 'Asad', NULL, 'Eau de parfum', 'homme', '["oriental","boise"]', NULL, 'Un parfum oriental et boisé qui s’ouvre sur des notes de poivre noir et d’ananas. Le cœur apporte des notes de café et d’iris, et le fond mêle des notes d’ambre, de vanille et de bois secs.', 'Poivré et chaud, avec un tabac doux et un fond vanillé. Un parfum de soirées entre amis, pour la saison fraîche.', '{"tete":["Poivre noir","Ananas","Tabac"],"coeur":["Café","Iris","Patchouli"],"fond":["Ambre","Vanille","Bois secs","Benjoin","Labdanum"]}', '["Poivre noir","Ananas","Feuille de tabac","Grains de café","Iris","Vanille"]', '["/parfums/lattafa-asad/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées entre amis","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"sortie","titre":"Sorties","detail":"poivré, tabac doux"}}', 0, 0, NULL, 'publie', 'import', 41, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lattafa-asad-bourbon', 'Lattafa', 'Asad Bourbon', NULL, 'Eau de parfum', 'unisexe', '["oriental","fleuri"]', '["oriental","vanille"]', 'Un parfum oriental et fleuri qui s’ouvre sur des notes de poivre rose et de lavande. Le cœur apporte des notes de cacao et de davana, et le fond mêle des notes de vétiver, de vanille bourbon et d’ambre.', 'Le cacao et la vanille bourbon donnent une chaleur posée, relevée de poivre rose. Pour un dîner, pendant les soirées de janvier.', '{"tete":["Poivre rose","Lavande","Mirabelle"],"coeur":["Cacao","Davana","Muscade"],"fond":["Vétiver","Vanille bourbon","Ambre"]}', '["Poivre rose","Lavande","Mirabelle","Cacao","Muscade","Vanille"]', '["/parfums/lattafa-asad-bourbon/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées posées","saison":"fraiche","saisonDetail":"soirées de janvier","occasion":{"icone":"diner","titre":"Dîner","detail":"cacao et vanille bourbon"}}', 0, 0, NULL, 'publie', 'import', 42, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lattafa-eclaire', 'Lattafa', 'Éclaire', NULL, 'Eau de parfum', 'femme', '["vanille","fleuri"]', '["vanille","doux"]', 'Un parfum vanillé et fleuri qui s’ouvre sur des notes de caramel et de lait. Le cœur apporte des notes de fleurs blanches et de miel, et le fond mêle des notes de vanille, de praline et de musc.', 'Comme un caramel au lait : sucré, crémeux et enveloppant. Un parfum de sorties du soir, pendant la saison fraîche.', '{"tete":["Caramel","Lait","Sucre"],"coeur":["Fleurs blanches","Miel"],"fond":["Vanille","Praline","Musc"]}', '["Caramel","Miel","Vanille","Praline"]', '["/parfums/lattafa-eclaire/1122.webp"]', '{"moment":"soir","momentDetail":"Sorties du soir","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"sortie","titre":"Sorties","detail":"caramel au lait"}}', 0, 0, NULL, 'publie', 'import', 43, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lattafa-fakhar-black', 'Lattafa', 'Fakhar Black', NULL, NULL, 'homme', '["frais","boise"]', NULL, 'Un parfum frais et boisé qui s’ouvre sur des notes de pomme et de bergamote. Le cœur apporte des notes de lavande et de sauge, et le fond mêle des notes de fève tonka, de cèdre et de bois ambré.', 'Aromatique et propre, avec une fraîcheur de pomme et de lavande sur un fond boisé. Il va du bureau au soir, toute l’année.', '{"tete":["Pomme","Bergamote","Gingembre"],"coeur":["Lavande","Sauge","Baies de genévrier","Géranium"],"fond":["Fève tonka","Cèdre","Bois ambré","Vétiver"]}', '["Pomme","Bergamote","Gingembre","Lavande","Fève tonka"]', '["/parfums/lattafa-fakhar-black/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du bureau au soir","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"bureau","titre":"Au bureau","detail":"aromatique et propre"}}', 0, 0, NULL, 'publie', 'import', 44, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lattafa-fakhar-gold-extrait', 'Lattafa', 'Fakhar Gold Extrait', NULL, NULL, 'homme', '["oriental","frais"]', '["oriental","boise"]', 'Un parfum oriental et frais qui s’ouvre sur des notes de pamplemousse et de cardamome. Le cœur apporte des notes de tubéreuse et des notes solaires, et le fond mêle des notes d’ambre, de cashmeran et de cuir.', 'L’ambre et le cuir donnent un sillage marqué : une pulvérisation suffit. Pour la Korité, la Tabaski et les fêtes de la saison fraîche.', '{"tete":["Pamplemousse","Cardamome","Poivre rose"],"coeur":["Tubéreuse","Notes solaires","Armoise"],"fond":["Ambre","Cashmeran","Cuir","Labdanum"]}', '["Pamplemousse","Cardamome","Poivre rose","Tubéreuse","Armoise"]', '["/parfums/lattafa-fakhar-gold-extrait/1122.webp"]', '{"moment":"soir","momentDetail":"Sillage marqué, une pulvérisation","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"ceremonie","titre":"Korité, Tabaski","detail":"ambre et cuir"}}', 0, 0, NULL, 'publie', 'import', 45, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lattafa-fakhar-rose', 'Lattafa', 'Fakhar Rose', NULL, NULL, 'femme', '["fleuri","doux"]', NULL, 'Un parfum fleuri et doux qui s’ouvre sur des notes de fruits et de lys. Le cœur apporte des notes de tubéreuse et de jasmin, et le fond mêle des notes de vanille, de musc blanc et de santal.', 'Un grand bouquet de fleurs blanches et de rose, doux et lumineux. Il accompagne les journées de fête et les mariages, en toute saison.', '{"tete":["Fruits","Lys","Grenade","Aldéhydes"],"coeur":["Tubéreuse","Jasmin","Gardénia","Ylang-ylang","Rose","Chèvrefeuille","Pivoine"],"fond":["Vanille","Musc blanc","Santal","Ambroxan"]}', '["Grenade","Tubéreuse","Jasmin","Rose","Vanille"]', '["/parfums/lattafa-fakhar-rose/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Journées de fête","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"ceremonie","titre":"Mariages","detail":"bouquet blanc et rose"}}', 0, 0, NULL, 'publie', 'import', 46, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lattafa-khamrah', 'Lattafa', 'Khamrah', NULL, 'Eau de parfum', 'unisexe', '["oriental","vanille"]', NULL, 'Un parfum oriental et vanillé qui s’ouvre sur des notes de bergamote et de cannelle. Le cœur apporte des notes de muguet et un accord dattes, et le fond mêle des notes de fève tonka, de benjoin et de myrrhe.', 'Dattes, épices et praliné : un parfum chaleureux, presque festif. Pour les soirées et les fêtes de la saison fraîche, Tabaski ou Korité.', '{"tete":["Bergamote","Cannelle","Muscade"],"coeur":["Accord dattes","Muguet","Praline","Tubéreuse"],"fond":["Fève tonka","Benjoin","Myrrhe","Akigalawood","Vanille","Bois ambrés"]}', '["Bergamote","Cannelle","Muscade","Dattes","Fève tonka","Vanille"]', '["/parfums/lattafa-khamrah/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées et fêtes","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"ceremonie","titre":"Tabaski, Korité","detail":"dattes, épices et praliné"}}', 0, 0, NULL, 'publie', 'import', 47, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lattafa-khamrah-qahwa', 'Lattafa', 'Khamrah Qahwa', NULL, 'Eau de parfum', 'unisexe', '["vanille","oriental"]', NULL, 'Un parfum vanillé et oriental qui s’ouvre sur des notes de gingembre et de cannelle. Le cœur apporte des notes de praline et de fruits confits, et le fond mêle des notes de café arabica, de fève tonka et de musc.', 'Le café et la cardamome mènent, sur une douceur pralinée. Un parfum d’après-dîner, pour les soirées de décembre.', '{"tete":["Gingembre","Cannelle","Cardamome"],"coeur":["Praline","Fruits confits","Fleurs blanches"],"fond":["Café arabica","Fève tonka","Musc","Benjoin","Vanille"]}', '["Gingembre","Cannelle","Cardamome","Grains de café arabica","Fève tonka","Vanille"]', '["/parfums/lattafa-khamrah-qahwa/1122.webp"]', '{"moment":"soir","momentDetail":"Après le dîner","saison":"fraiche","saisonDetail":"soirées de décembre","occasion":{"icone":"sortie","titre":"Sorties","detail":"café et cardamome"}}', 0, 0, NULL, 'publie', 'import', 48, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('lattafa-yara', 'Lattafa', 'Yara', NULL, 'Eau de parfum', 'femme', '["fleuri","vanille"]', NULL, 'Un parfum fleuri et vanillé qui s’ouvre sur des notes de mandarine et d’héliotrope. Le cœur apporte des notes de fruits tropicaux et un accord gourmand, et le fond mêle des notes de vanille, de santal et de musc.', 'Doux, fruité et poudré, avec une impression de crème légère. Un parfum de tous les jours, pour les après-midi lumineux.', '{"tete":["Mandarine","Héliotrope","Orchidée"],"coeur":["Fruits tropicaux","Accord gourmand"],"fond":["Vanille","Santal","Musc"]}', '["Mandarine","Héliotrope","Orchidée","Vanille","Santal"]', '["/parfums/lattafa-yara/1122.webp"]', '{"moment":"jour","momentDetail":"Après-midi lumineux","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"quotidien","titre":"Tous les jours","detail":"doux, fruité, poudré"}}', 0, 0, NULL, 'publie', 'import', 49, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('louis-vuitton-california-dream', 'Louis Vuitton', 'California Dream', NULL, 'Eau de parfum', 'unisexe', '["oriental","doux"]', '["frais","doux"]', 'Un parfum oriental et doux qui associe des notes de mandarine, de poire et de musc. On y trouve aussi des notes d’ambrette et de benjoin.', 'Des agrumes ensoleillés posés sur un musc léger. Pour les journées chaudes et les week-ends, de mai à novembre.', '{"bouquet":["Mandarine","Poire","Musc","Ambrette","Benjoin"]}', '["Mandarine","Poire","Graines d’ambrette","Résine de benjoin"]', '["/parfums/louis-vuitton-california-dream/1122.webp"]', '{"moment":"jour","momentDetail":"Journées ensoleillées","saison":"chaude","saisonDetail":"idéal mai → nov.","occasion":{"icone":"quotidien","titre":"Week-end","detail":"agrumes et musc"}}', 0, 0, NULL, 'publie', 'import', 50, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('louis-vuitton-les-sables-roses', 'Louis Vuitton', 'Les Sables Roses', NULL, 'Eau de parfum', 'unisexe', '["oriental","fleuri"]', NULL, 'Un parfum oriental et fleuri qui associe des notes de rose centifolia, de rose de Bulgarie et d’oud. On y trouve aussi des notes d’ambre gris, de poivre noir et de safran.', 'La rose rencontre l’oud et le safran, dans un registre riche et chaleureux. À réserver aux grandes occasions, mariages ou baptêmes, en saison fraîche.', '{"bouquet":["Rose centifolia","Rose de Bulgarie","Oud","Ambre gris","Poivre noir","Safran"]}', '["Rose centifolia","Rose de Bulgarie","Bois d’oud","Poivre noir","Safran"]', '["/parfums/louis-vuitton-les-sables-roses/1122.webp"]', '{"moment":"soir","momentDetail":"Grandes occasions","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"ceremonie","titre":"Mariages, baptêmes","detail":"rose et oud"}}', 0, 0, NULL, 'publie', 'import', 51, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('mugler-alien', 'Mugler', 'Alien', NULL, 'Eau de parfum', 'femme', '["fleuri","boise"]', NULL, 'Un parfum fleuri et boisé qui associe des notes de jasmin, de cashmeran et un accord ambré. Sa pyramide détaillée (tête, cœur, fond) n’est pas publiée.', 'Un jasmin ambré, intense et enveloppant. Pour les soirées habillées et les dîners, toute l’année.', '{"bouquet":["Jasmin","Cashmeran","Accord ambré"]}', '["Jasmin"]', '["/parfums/mugler-alien/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées habillées","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"diner","titre":"Dîner","detail":"jasmin ambré, intense"}}', 0, 0, NULL, 'publie', 'import', 52, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('paco-rabanne-1-million', 'Paco Rabanne', '1 Million', NULL, 'Eau de toilette', 'homme', '["oriental","frais"]', '["oriental","boise"]', 'Un parfum oriental et frais qui s’ouvre sur des notes de mandarine et de pamplemousse. Le cœur apporte des notes de cannelle et d’épices, et le fond mêle des notes d’ambre, de cuir et de bois.', 'Chaud et sucré, avec des épices et un fond de cuir. Un parfum de sorties entre amis, le soir, pendant la saison fraîche.', '{"tete":["Mandarine","Pamplemousse","Menthe"],"coeur":["Cannelle","Épices","Rose"],"fond":["Ambre","Cuir","Bois","Patchouli"]}', '["Mandarine","Pamplemousse","Menthe","Cannelle","Rose","Patchouli"]', '["/parfums/paco-rabanne-1-million/1122.webp"]', '{"moment":"soir","momentDetail":"sorties entre amis","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"sortie","titre":"Sillage marqué","detail":"chaud et sucré"}}', 0, 0, NULL, 'publie', 'import', 53, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('paco-rabanne-invictus', 'Paco Rabanne', 'Invictus', NULL, 'Eau de toilette', 'homme', '["frais","boise"]', NULL, 'Un parfum frais et boisé qui s’ouvre sur des notes de pamplemousse et des notes marines. Le cœur apporte des notes de laurier, et le fond mêle des notes de gaïac, d’ambre gris et de patchouli.', 'Marin et frais, avec une énergie sportive. Pour la journée et la chaleur de l’hivernage, au quotidien.', '{"tete":["Notes marines","Pamplemousse"],"coeur":["Laurier"],"fond":["Gaïac","Ambre gris","Patchouli"]}', '["Pamplemousse","Feuilles de laurier","Bois de gaïac","Patchouli"]', '["/parfums/paco-rabanne-invictus/1122.webp"]', '{"moment":"jour","momentDetail":"Sport, journée","saison":"chaude","saisonDetail":"chaleur de l’hivernage","occasion":{"icone":"quotidien","titre":"Au quotidien","detail":"marin et frais"}}', 0, 0, NULL, 'publie', 'import', 54, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('paris-corner-marshmallow-blush', 'Paris Corner', 'Marshmallow Blush', NULL, 'Eau de parfum', 'unisexe', '["vanille","frais"]', '["vanille","doux"]', 'Un parfum vanillé et frais qui s’ouvre sur des notes de fraise et de framboise. Le cœur apporte des notes d’ambroxan et de fleur d’oranger, et le fond mêle des notes de musc, de guimauve et de vanille.', 'Fraise et guimauve : une gourmandise légère et pétillante. Pour un après-midi entre copines ou une sortie, toute l’année.', '{"tete":["Fraise","Framboise","Citron"],"coeur":["Ambroxan","Fleur d’oranger","Crème fouettée"],"fond":["Musc","Guimauve","Vanille"]}', '["Fraise","Framboise","Citron","Fleur d’oranger","Guimauve","Vanille"]', '["/parfums/paris-corner-marshmallow-blush/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Après-midi gourmand","saison":"annee","saisonDetail":"frais comme chaud","occasion":{"icone":"sortie","titre":"Entre copines","detail":"fraise et guimauve"}}', 0, 0, NULL, 'publie', 'import', 55, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('paris-corner-rifaaqat', 'Paris Corner', 'Rifaaqat', NULL, NULL, 'unisexe', '["oriental","fleuri"]', '["oriental","boise"]', 'Un parfum oriental et fleuri qui s’ouvre sur des notes de poivre noir et de poivre rose. Le cœur apporte des notes d’encens et de safran, et le fond mêle des notes de vanille bourbon, de daim et de cèdre.', 'L’encens et le safran donnent une impression de cérémonie, adoucie par la vanille. Pour les fêtes du soir, pendant la saison fraîche.', '{"tete":["Poivre noir","Poivre rose","Élémi"],"coeur":["Encens","Safran"],"fond":["Vanille bourbon","Daim","Cèdre"]}', '["Poivre noir","Poivre rose","Résine d’élémi","Résine d’encens","Safran","Vanille"]', '["/parfums/paris-corner-rifaaqat/1122.webp"]', '{"moment":"soir","momentDetail":"Fêtes du soir","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"ceremonie","titre":"Cérémonies","detail":"encens et safran"}}', 0, 0, NULL, 'publie', 'import', 56, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('paris-corner-rifaaqat-adorn', 'Paris Corner', 'Rifaaqat Adorn', NULL, NULL, 'unisexe', '["boise","oriental"]', NULL, 'Un parfum boisé et oriental qui s’ouvre sur des notes de poivre rose et de coriandre. Le cœur apporte des notes de cèdre et de patchouli, et le fond mêle des notes d’ambre gris, de vanille et des accords boisés.', 'Boisé et ambré, relevé d’une touche poivrée et de violette. Il se porte en fin de journée, pour un rendez-vous, toute l’année.', '{"tete":["Poivre rose","Coriandre","Mandarine","Violette"],"coeur":["Cèdre","Patchouli","Mousse d’arbre"],"fond":["Ambre gris","Vanille","Accords boisés","Benjoin"]}', '["Poivre rose","Coriandre","Mandarine","Violette","Cèdre","Vanille"]', '["/parfums/paris-corner-rifaaqat-adorn/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Fin de journée","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"sortie","titre":"Rendez-vous","detail":"boisé et ambré"}}', 0, 0, NULL, 'publie', 'import', 57, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('paris-corner-taskeen-caramel-cascade', 'Paris Corner', 'Taskeen Caramel Cascade', NULL, NULL, 'unisexe', '["vanille","oriental"]', NULL, 'Un parfum vanillé et oriental qui s’ouvre sur des notes de caramel et de lait. Le cœur apporte des notes de fève tonka et de miel, et le fond mêle des notes de vanille, de musc blanc et d’ambre.', 'Caramel et miel, doux et apaisant comme un dessert du soir. Pour les soirées tranquilles et les dîners en famille, pendant l’harmattan.', '{"tete":["Caramel","Lait"],"coeur":["Fève tonka","Miel"],"fond":["Vanille","Musc blanc","Ambre"]}', '["Caramel","Fève tonka","Rayon de miel","Vanille"]', '["/parfums/paris-corner-taskeen-caramel-cascade/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées tranquilles","saison":"fraiche","saisonDetail":"soirées d’harmattan","occasion":{"icone":"diner","titre":"Dîner en famille","detail":"caramel et miel"}}', 0, 0, NULL, 'publie', 'import', 58, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('pendora-scents-intense-wayfarer-homme', 'Pendora Scents', 'Intense Wayfarer Homme', NULL, 'Eau de parfum', 'homme', '["frais","vanille"]', NULL, 'Un parfum frais et vanillé qui s’ouvre sur des notes de pomme et de mandarine. Le cœur apporte des notes de lavande et de genévrier, et le fond mêle des notes de patchouli, de vanille et de caramel.', 'Fruité et aromatique, avec un fond de caramel et de vanille. Il suit la journée de travail jusqu’aux sorties, en toute saison.', '{"tete":["Pomme","Mandarine","Cardamome"],"coeur":["Lavande","Genévrier"],"fond":["Patchouli","Vanille","Caramel"]}', '["Pomme","Mandarine","Cardamome","Lavande","Baies de genévrier","Vanille"]', '["/parfums/pendora-scents-intense-wayfarer-homme/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du travail aux sorties","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"sortie","titre":"Sorties","detail":"fruité et ambré"}}', 0, 0, NULL, 'publie', 'import', 59, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('prada-paradoxe', 'Prada', 'Paradoxe', NULL, 'Eau de parfum', 'femme', '["fleuri","frais"]', NULL, 'Un parfum fleuri et frais qui s’ouvre sur des notes de poire et de mandarine. Le cœur apporte des notes de néroli et de fleur d’oranger, et le fond mêle des notes d’ambre, de vanille bourbon et de musc blanc.', 'Floral et lumineux, avec une douceur ambrée qui reste élégante sans forcer. Pour le quotidien, du bureau au dîner.', '{"tete":["Poire","Mandarine","Bergamote"],"coeur":["Néroli","Fleur d’oranger","Jasmin"],"fond":["Ambre","Vanille bourbon","Musc blanc"]}', '["Poire","Mandarine","Bergamote","Fleur d’oranger","Jasmin","Vanille"]', '["/parfums/prada-paradoxe/1122.webp"]', '{"moment":"jourSoir","momentDetail":"du bureau au dîner","saison":"annee","saisonDetail":"frais comme chaud","occasion":{"icone":"quotidien","titre":"Au quotidien","detail":"élégant sans forcer"}}', 0, 0, NULL, 'publie', 'import', 60, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('rabanne-invictus-victory-elixir', 'Rabanne', 'Invictus Victory Elixir', NULL, 'Parfum intense', 'homme', '["oriental","vanille"]', NULL, 'Un parfum oriental et vanillé qui s’ouvre sur des notes de lavande et de cardamome. Le cœur apporte des notes d’encens et de patchouli, et le fond mêle des notes de vanille et de fève tonka.', 'L’encens et la vanille donnent un sillage dense : une pulvérisation suffit. À garder pour les grandes soirées de la saison fraîche.', '{"tete":["Lavande","Cardamome","Poivre noir"],"coeur":["Encens","Patchouli"],"fond":["Vanille","Fève tonka"]}', '["Lavande","Cardamome","Poivre noir","Encens","Vanille","Fève tonka"]', '["/parfums/rabanne-invictus-victory-elixir/1122.webp"]', '{"moment":"soir","momentDetail":"Sillage dense, une pulvérisation","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"sortie","titre":"Grandes soirées","detail":"encens et vanille"}}', 0, 0, NULL, 'publie', 'import', 61, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('tom-ford-ombre-leather', 'Tom Ford', 'Ombré Leather', NULL, 'Eau de parfum', 'unisexe', '["oriental","fleuri"]', '["oriental","boise"]', 'Un parfum oriental et fleuri qui s’ouvre sur des notes de cardamome. Le cœur apporte des notes de cuir et de jasmin sambac, et le fond mêle des notes d’ambre, de mousse et de patchouli.', 'Un cuir doux et épicé, adouci par le jasmin. Pour les soirées en ville et les dîners de la saison fraîche.', '{"tete":["Cardamome"],"coeur":["Cuir","Jasmin sambac"],"fond":["Ambre","Mousse","Patchouli"]}', '["Cardamome","Jasmin sambac","Mousse","Patchouli"]', '["/parfums/tom-ford-ombre-leather/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées en ville","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"diner","titre":"Dîner","detail":"cuir doux, épicé"}}', 0, 0, NULL, 'publie', 'import', 62, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('valentino-uomo-born-in-roma', 'Valentino', 'Uomo Born in Roma', NULL, 'Eau de toilette', 'homme', '["frais","fleuri"]', '["frais","boise"]', 'Un parfum frais et fleuri qui associe des notes de feuille de violette, de sauge et de vétiver. On y trouve aussi des notes de gingembre et de sel minéral.', 'Vert et minéral, avec la fraîcheur de la violette et de la sauge. Un parfum de journée en ville, pour le bureau, toute l’année.', '{"bouquet":["Feuille de violette","Sauge","Vétiver","Gingembre","Sel minéral"]}', '["Feuille de violette","Sauge","Vétiver","Gingembre"]', '["/parfums/valentino-uomo-born-in-roma/1122.webp"]', '{"moment":"jour","momentDetail":"Journée en ville","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"bureau","titre":"Au bureau","detail":"vert et minéral"}}', 0, 0, NULL, 'publie', 'import', 63, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('versace-eros', 'Versace', 'Eros', NULL, 'Eau de toilette', 'homme', '["boise","frais"]', NULL, 'Un parfum boisé et frais qui associe des notes de menthe, de citron et de pomme verte. On y trouve aussi des notes de fève tonka, d’ambroxan et de géranium.', 'Menthe fraîche et vanille : un contraste vif qui ne passe pas inaperçu. Il se porte en journée puis en sortie, toute l’année.', '{"bouquet":["Menthe","Citron","Pomme verte","Fève tonka","Ambroxan","Géranium","Vanille","Cèdre","Vétiver","Mousse de chêne"]}', '["Menthe","Citron","Pomme verte","Fève tonka","Géranium","Vanille"]', '["/parfums/versace-eros/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Journée, puis sorties","saison":"annee","saisonDetail":"frais comme chaud","occasion":{"icone":"sortie","titre":"Sorties","detail":"menthe et vanille"}}', 0, 0, NULL, 'publie', 'import', 64, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('versace-eros-energy', 'Versace', 'Eros Energy', NULL, 'Eau de parfum', 'homme', '["frais","boise"]', NULL, 'Un parfum frais et boisé qui s’ouvre sur des notes de citron et de citron vert. Le cœur apporte des notes de poivre rose et d’ambre blanc, et le fond mêle des notes de musc, de mousse de chêne et de patchouli.', 'Des agrumes pétillants, toniques et légers. Pour les journées chaudes, de mai à novembre.', '{"tete":["Citron","Citron vert","Pamplemousse","Orange sanguine","Bergamote","Mandarine"],"coeur":["Poivre rose","Ambre blanc","Cassis"],"fond":["Musc","Mousse de chêne","Patchouli"]}', '["Citron","Citron vert","Orange sanguine","Bergamote","Poivre rose","Cassis"]', '["/parfums/versace-eros-energy/1122.webp"]', '{"moment":"jour","momentDetail":"Journées chaudes","saison":"chaude","saisonDetail":"idéal mai → nov.","occasion":{"icone":"quotidien","titre":"Tous les jours","detail":"agrumes pétillants"}}', 0, 0, NULL, 'publie', 'import', 65, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('yves-saint-laurent-black-opium-over-red', 'Yves Saint Laurent', 'Black Opium Over Red', NULL, 'Eau de parfum', 'femme', '["frais","fleuri"]', '["vanille","fleuri"]', 'Un parfum frais et fleuri qui s’ouvre sur des notes de cerise et de mandarine verte. Le cœur apporte des notes de jasmin et de fleur d’oranger, et le fond mêle des notes de vanille de Madagascar, de café et de patchouli.', 'La cerise et le café se mêlent dans un sillage gourmand, un peu sombre. Un parfum de soirée, pour les sorties de la saison fraîche.', '{"tete":["Cerise","Mandarine verte"],"coeur":["Jasmin","Fleur d’oranger","Thé noir"],"fond":["Vanille de Madagascar","Café","Patchouli"]}', '["Cerises","Mandarine verte","Jasmin","Thé noir","Vanille","Grains de café"]', '["/parfums/yves-saint-laurent-black-opium-over-red/1122.webp"]', '{"moment":"soir","momentDetail":"Soirées","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"sortie","titre":"Sorties","detail":"cerise et café"}}', 0, 0, NULL, 'publie', 'import', 66, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('yves-saint-laurent-la-nuit-de-lhomme', 'Yves Saint Laurent', 'La Nuit de L’Homme', NULL, 'Eau de parfum', 'homme', '["frais","boise"]', '["boise","oriental"]', 'Un parfum frais et boisé qui s’ouvre sur des notes de cardamome et de pamplemousse. Le cœur apporte des notes de lavande et de sauge sclarée, et le fond mêle des notes de fève tonka, de santal et de patchouli.', 'La cardamome et un cuir doux donnent une élégance feutrée. Pour les rendez-vous du soir, toute l’année.', '{"tete":["Cardamome","Pamplemousse"],"coeur":["Lavande","Sauge sclarée","Cuir"],"fond":["Fève tonka","Santal","Patchouli","Vétiver"]}', '["Cardamome","Pamplemousse","Lavande","Sauge sclarée","Fève tonka","Santal"]', '["/parfums/yves-saint-laurent-la-nuit-de-lhomme/1122.webp"]', '{"moment":"soir","momentDetail":"Rendez-vous du soir","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"diner","titre":"Rendez-vous","detail":"cardamome, cuir doux"}}', 0, 0, NULL, 'publie', 'import', 67, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('yves-saint-laurent-libre', 'Yves Saint Laurent', 'Libre', NULL, 'Eau de parfum', 'femme', '["frais","fleuri"]', '["fleuri","vanille"]', 'Un parfum frais et fleuri qui associe des notes de lavande, de fleur d’oranger et de vanille. On y trouve aussi des notes de mandarine verte.', 'La lavande et la vanille s’équilibrent, avec la fleur d’oranger au centre. Il va du bureau au dîner, en toute saison.', '{"bouquet":["Lavande","Fleur d’oranger","Vanille","Mandarine verte"]}', '["Lavande","Fleur d’oranger","Vanille","Mandarine verte"]', '["/parfums/yves-saint-laurent-libre/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Du bureau au dîner","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"bureau","titre":"Au bureau","detail":"lavande et vanille"}}', 0, 0, NULL, 'publie', 'import', 68, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('yves-saint-laurent-y', 'Yves Saint Laurent', 'Y', NULL, 'Eau de parfum', 'homme', '["frais","boise"]', NULL, 'Un parfum frais et boisé qui s’ouvre sur des notes de bergamote et de gingembre. Le cœur apporte des notes de sauge et de géranium, et le fond mêle des notes de vétiver, de cèdre et de fève tonka.', 'Frais et net, avec une sauge aromatique sur un fond boisé. Un parfum de journée au travail, qui ne dérange pas autour de toi.', '{"tete":["Bergamote","Gingembre","Pomme"],"coeur":["Sauge","Géranium","Genévrier"],"fond":["Vétiver","Cèdre","Fève tonka","Bois ambrés","Encens"]}', '["Bergamote","Gingembre","Pomme","Sauge","Géranium","Fève tonka"]', '["/parfums/yves-saint-laurent-y/1122.webp"]', '{"moment":"jour","momentDetail":"Le matin, au travail","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"bureau","titre":"Au bureau, sans déranger","detail":"frais et net"}}', 0, 0, NULL, 'publie', 'import', 69, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-blue-spirit', 'Zara', 'Blue Spirit', NULL, 'Eau de toilette', 'homme', '["frais","fleuri"]', NULL, 'Un parfum frais et fleuri qui associe des notes de mandarine, d’ylang-ylang et d’ambre. Sa pyramide détaillée (tête, cœur, fond) n’est pas publiée.', 'Léger et ensoleillé : une mandarine adoucie par l’ylang-ylang. Pour les journées au soleil, de mai à novembre.', '{"bouquet":["Mandarine","Ylang-ylang","Ambre"]}', '["Mandarine","Ylang-ylang"]', '["/parfums/zara-blue-spirit/1122.webp"]', '{"moment":"jour","momentDetail":"Journées au soleil","saison":"chaude","saisonDetail":"idéal mai → nov.","occasion":{"icone":"quotidien","titre":"Tous les jours","detail":"léger, ensoleillé"}}', 0, 0, NULL, 'publie', 'import', 70, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-gardenia', 'Zara', 'Gardenia', NULL, 'Eau de parfum', 'femme', '["vanille","fleuri"]', NULL, 'Un parfum vanillé et fleuri qui s’ouvre sur des notes de fleur d’oranger. Le cœur apporte des notes de café, et le fond mêle des notes de vanille.', 'La fleur d’oranger rencontre une note de café, sur un fond de vanille. Il se porte de l’après-midi à la soirée, pour un dîner.', '{"tete":["Fleur d’oranger"],"coeur":["Café"],"fond":["Vanille"]}', '["Fleur d’oranger","Café","Vanille"]', '["/parfums/zara-gardenia/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Après-midi, soirée","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"diner","titre":"Dîner","detail":"fleur d’oranger et café"}}', 0, 0, NULL, 'publie', 'import', 71, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-nude-bouquet', 'Zara', 'Nude Bouquet', NULL, 'Eau de parfum', 'femme', '["fleuri","vanille"]', NULL, 'Un parfum fleuri et vanillé qui s’ouvre sur des notes de cerise. Le cœur apporte des notes de pivoine, et le fond mêle des notes de vanille.', 'Fruité et doux, avec une touche gourmande, simple à porter. Un parfum d’après-midi, pour le quotidien.', '{"tete":["Cerise"],"coeur":["Pivoine"],"fond":["Vanille"]}', '["Cerise","Pivoine","Vanille"]', '["/parfums/zara-nude-bouquet/1122.webp"]', '{"moment":"jour","momentDetail":"L’après-midi","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"quotidien","titre":"Au quotidien","detail":"fruité et doux"}}', 0, 0, NULL, 'publie', 'import', 72, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-orchid', 'Zara', 'Orchid', NULL, 'Eau de parfum', 'femme', '["frais","fleuri"]', '["fleuri","vanille"]', 'Un parfum frais et fleuri qui associe des notes de bergamote, d’orchidée et de vanille. Sa pyramide détaillée (tête, cœur, fond) n’est pas publiée.', 'Une vanille florale, ronde et facile à vivre. Il se porte matin comme soir, tous les jours.', '{"bouquet":["Bergamote","Orchidée","Vanille"]}', '["Bergamote","Orchidée","Vanille"]', '["/parfums/zara-orchid/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Matin comme soir","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"quotidien","titre":"Tous les jours","detail":"vanille florale"}}', 0, 0, NULL, 'publie', 'import', 73, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-oriental', 'Zara', 'Oriental', NULL, NULL, 'femme', '["fleuri","vanille"]', '["oriental","vanille"]', 'Un parfum fleuri et vanillé qui s’ouvre sur des notes de freesia et de bergamote. Le cœur apporte des notes de vanille et de jasmin, et le fond mêle des notes de caramel, de patchouli et de musc.', 'Le caramel et le patchouli donnent un sillage chaud, adouci par des fleurs. Pour les dîners à deux, pendant la saison fraîche.', '{"tete":["Freesia","Bergamote","Rose"],"coeur":["Vanille","Jasmin"],"fond":["Caramel","Patchouli","Musc"]}', '["Freesia","Bergamote","Rose","Vanille","Jasmin","Patchouli"]', '["/parfums/zara-oriental/1122.webp"]', '{"moment":"soir","momentDetail":"Dîners à deux","saison":"fraiche","saisonDetail":"déc. → avril","occasion":{"icone":"diner","titre":"Dîner","detail":"caramel et patchouli"}}', 0, 0, NULL, 'publie', 'import', 74, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-peony', 'Zara', 'Peony', NULL, 'Eau de parfum', 'femme', '["fleuri","vanille"]', NULL, 'Un parfum fleuri et vanillé qui associe des notes de cassis, de pivoine et de vanille. Sa pyramide détaillée (tête, cœur, fond) n’est pas publiée.', 'Une pivoine fraîche, légèrement fruitée. Pour le matin et le bureau, quelle que soit la saison.', '{"bouquet":["Cassis","Pivoine","Vanille"]}', '["Cassis","Pivoine","Vanille"]', '["/parfums/zara-peony/1122.webp"]', '{"moment":"jour","momentDetail":"Du matin au déjeuner","saison":"annee","saisonDetail":"frais comme chaud","occasion":{"icone":"bureau","titre":"Au bureau","detail":"pivoine fraîche"}}', 0, 0, NULL, 'publie', 'import', 75, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-pink-flambe', 'Zara', 'Pink Flambé', NULL, 'Eau de toilette', 'femme', '["frais","fleuri"]', '["fleuri","vanille"]', 'Un parfum frais et fleuri qui associe des notes de mandarine, d’orchidée et de praline. Sa pyramide détaillée (tête, cœur, fond) n’est pas publiée.', 'Un praliné léger, éclairé par la mandarine. Pour un après-midi détente ou un week-end, toute l’année.', '{"bouquet":["Mandarine","Orchidée","Praline"]}', '["Mandarine","Orchidée","Praline"]', '["/parfums/zara-pink-flambe/1122.webp"]', '{"moment":"jour","momentDetail":"Après-midi détente","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"quotidien","titre":"Week-end","detail":"praliné léger"}}', 0, 0, NULL, 'publie', 'import', 76, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-red-vanilla', 'Zara', 'Red Vanilla', NULL, 'Eau de toilette', 'femme', '["boise","vanille"]', NULL, 'Un parfum boisé et vanillé qui associe des notes de framboise, de praline et de patchouli. Sa pyramide détaillée (tête, cœur, fond) n’est pas publiée.', 'Framboise et praliné, sur un fond de patchouli qui donne du caractère. Il se porte de l’après-midi à la soirée, entre amis, en saison fraîche.', '{"bouquet":["Framboise","Praline","Patchouli"]}', '["Framboise","Praline","Patchouli"]', '["/parfums/zara-red-vanilla/1122.webp"]', '{"moment":"jourSoir","momentDetail":"Après-midi, soirée","saison":"fraiche","saisonDetail":"saison fraîche","occasion":{"icone":"sortie","titre":"Entre amis","detail":"framboise et praliné"}}', 0, 0, NULL, 'publie', 'import', 77, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-seoul-532-8-sinsa-dong-gangnam-gu', 'Zara', 'Seoul 532-8 Sinsa Dong Gangnam-Gu', NULL, NULL, 'homme', '["frais","oriental"]', '["frais"]', 'Un parfum frais et oriental qui s’ouvre sur des notes de mandarine et de muscade. Le cœur apporte des notes de lavande et des notes marines, et le fond mêle des notes d’ambre.', 'Marin et discret, avec une touche de muscade. Pour le matin et le bureau, pendant les mois chauds.', '{"tete":["Mandarine","Muscade"],"coeur":["Notes marines","Lavande"],"fond":["Ambre"]}', '["Mandarine","Muscade","Lavande"]', '["/parfums/zara-seoul-532-8-sinsa-dong-gangnam-gu/1122.webp"]', '{"moment":"jour","momentDetail":"Matin et midi","saison":"chaude","saisonDetail":"idéal mai → nov.","occasion":{"icone":"bureau","titre":"Au bureau","detail":"marin et discret"}}', 0, 0, NULL, 'publie', 'import', 78, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-violet-blossom', 'Zara', 'Violet Blossom', NULL, 'Eau de parfum', 'femme', '["fleuri","vanille"]', NULL, 'Un parfum fleuri et vanillé qui associe des notes de fleur de cerisier, de magnolia et de fève tonka. Sa pyramide détaillée (tête, cœur, fond) n’est pas publiée.', 'Des fleurs légères et printanières, adoucies par la fève tonka. Pour des matinées douces, en toute saison.', '{"bouquet":["Fleur de cerisier","Magnolia","Fève tonka"]}', '["Fleur de cerisier","Magnolia","Fève tonka"]', '["/parfums/zara-violet-blossom/1122.webp"]', '{"moment":"jour","momentDetail":"Matinées douces","saison":"annee","saisonDetail":"en toute saison","occasion":{"icone":"quotidien","titre":"Au quotidien","detail":"fleurs légères"}}', 0, 0, NULL, 'publie', 'import', 79, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';
INSERT INTO parfums (slug, marque, nom, nom_public, concentration, categorie, styles_import, styles, description_import, description,
       notes, ingredients, images, porter, nouveau, coup_de_coeur, dispo_force, statut, source, ordre, maj_par)
     VALUES ('zara-wonder-rose', 'Zara', 'Wonder Rose', NULL, NULL, 'femme', '["vanille"]', NULL, 'Un parfum vanillé qui associe des notes de fruits rouges et de vanille. Sa pyramide détaillée (tête, cœur, fond) n’est pas publiée.', 'Fruits rouges et vanille, dans un registre doux et simple. Pour les après-midi entre amies, tous les jours.', '{"bouquet":["Fruits rouges","Vanille"]}', '["Fruits rouges","Vanille"]', '["/parfums/zara-wonder-rose/1122.webp"]', '{"moment":"jour","momentDetail":"Après-midi entre amies","saison":"annee","saisonDetail":"toute l’année","occasion":{"icone":"quotidien","titre":"Tous les jours","detail":"fruité, vanillé doux"}}', 0, 0, NULL, 'publie', 'import', 80, 'import')
     ON CONFLICT (slug) DO UPDATE SET marque = excluded.marque, nom = excluded.nom, concentration = excluded.concentration,
       categorie = excluded.categorie, styles_import = excluded.styles_import, description_import = excluded.description_import,
       notes = excluded.notes, ingredients = excluded.ingredients, images = excluded.images, ordre = excluded.ordre,
       statut = 'publie';

CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL);
INSERT INTO d1_migrations (name) VALUES ('0001_init.sql'), ('0002_stock_atomique.sql');
