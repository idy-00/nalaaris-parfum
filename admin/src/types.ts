export type Dispo = 'disponible' | 'limite' | 'epuise' | 'sur_commande';

export interface Contenance {
  slug: string;
  ml: number;
  prix_vente: number | null;
  prix_achat: number | null;
  stock: number | null;
  seuil_alerte: number;
  dispo_force: 'sur_commande' | 'epuise' | null;
  dispo: Dispo | null;
}

export interface ParfumListe {
  slug: string;
  marque: string;
  nom: string;
  categorie: 'femme' | 'homme' | 'unisexe';
  masque: number;
  statut: 'publie' | 'visuel_a_creer';
  nouveau: number;
  coup_de_coeur: number;
  photo_r2: string | null;
  vignette: string | null;
  contenances: Contenance[];
}

export interface ListeCatalogue {
  parfums: ParfumListe[];
  compteurs: { total: number; sans_prix: number; stock_bas: number; epuise: number; masque: number; visuel: number };
  marques: string[];
}

export interface Porter {
  moment: 'jour' | 'soir' | 'jourSoir';
  momentDetail: string;
  saison: 'fraiche' | 'chaude' | 'annee';
  saisonDetail: string;
  occasion: { icone: 'quotidien' | 'bureau' | 'sortie' | 'diner' | 'ceremonie'; titre: string; detail: string };
}

export interface ParfumFiche extends Omit<ParfumListe, 'contenances'> {
  images: string[];
  ingredients: string[];
  nom_public: string | null;
  concentration: string | null;
  description: string | null;
  description_import: string;
  styles: string[];
  styles_import: string[];
  notes: { bouquet: string[] } | { tete: string[]; coeur: string[]; fond: string[] };
  porter: Porter | null;
  dispo_force: Dispo | null;
  source: 'import' | 'admin';
  contenances: Contenance[];
}

export interface LigneVente {
  slug: string;
  ml: number;
  quantite: number;
  prix_unitaire: number;
  prix_achat_unitaire?: number | null;
  marque?: string;
  nom?: string;
}

export interface Vente {
  id: number;
  date_vente: string;
  statut: 'a_livrer' | 'livree' | 'payee' | 'annulee';
  paiement: 'wave' | 'orange_money' | 'especes' | 'autre';
  livraison: 'retrait' | 'livraison';
  zone: string | null;
  frais_livraison: number;
  client_prenom: string | null;
  client_tel: string | null;
  total: number;
  note: string | null;
  lignes: LigneVente[];
  cree_par: string | null;
}

export interface Boutique {
  whatsapp?: string;
  horaires?: string;
  retrait?: boolean;
  retraitAdresse?: string;
  paiements?: string[];
  zones?: { nom: string; frais: number; delai: string }[];
}
