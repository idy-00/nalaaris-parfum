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
