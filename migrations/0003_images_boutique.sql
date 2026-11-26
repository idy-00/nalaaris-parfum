-- Compatible avec l'initialisation à la demande des installations existantes.
CREATE TABLE IF NOT EXISTS images_boutique (
 cle TEXT PRIMARY KEY,
 type TEXT NOT NULL,
 contenu BLOB NOT NULL,
 cree_le TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
