/**
 * INFOS PRATIQUES & CONTACTS
 * Tout ce qui est marqué TODO est à confirmer par la cliente avant la mise en ligne.
 */

export const marque = {
  nom: 'NAL’AARIS PERFUMES',
  nomCourt: 'Nal’Aaris',
  signature: 'By Yannick & Laetitia',
  devise: 'Sentir bon c’est se respecter et respecter les autres',
  ville: 'Dakar',
};

/** URL publique du site (aperçus Open Graph). TODO : remplacer par le domaine définitif. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://nalaaris.pages.dev').replace(/\/$/, '');

export const contacts = {
  whatsappNumero: '221770331313',
  telephoneAffiche: '77 033 13 13',
  reseaux: [
    { id: 'instagram', label: 'Instagram', handle: '@nalaaris', url: 'https://instagram.com/nalaaris' },
    { id: 'tiktok', label: 'TikTok', handle: '@nalaaris.perfumes', url: 'https://www.tiktok.com/@nalaaris.perfumes' },
    { id: 'snapchat', label: 'Snapchat', handle: 'nalaarisperfume', url: 'https://www.snapchat.com/add/nalaarisperfume' },
  ] as const,
};

export interface BlocInfo {
  id: string;
  titre: string;
  lignes: string[];
  todo?: string;
}

export const infosPratiques: BlocInfo[] = [
  {
    id: 'livraison',
    titre: 'Livraison',
    lignes: [
      'Livraison dans Dakar et sa banlieue.',
      'Le délai et le tarif sont confirmés sur WhatsApp selon ton quartier.',
    ],
    todo: 'TODO cliente : préciser les zones (Plateau, Almadies, Pikine…), les tarifs et les délais.',
  },
  {
    id: 'retrait',
    titre: 'Retrait',
    lignes: ['Tu peux aussi passer récupérer ta commande.', 'On convient ensemble du lieu et de l’heure.'],
    todo: 'TODO cliente : indiquer le point de retrait et les horaires.',
  },
  {
    id: 'paiement',
    titre: 'Paiement',
    lignes: ['Wave, Orange Money ou espèces à la livraison.', 'Le paiement se confirme sur WhatsApp, jamais sur le site.'],
    todo: 'TODO cliente : confirmer les moyens de paiement acceptés.',
  },
  {
    id: 'authenticite',
    titre: 'Authenticité',
    lignes: [
      'Tous nos parfums sont authentiques.',
      'Une question sur un flacon ? Demande-nous, on te répond franchement.',
    ],
  },
];

/** Questions fréquentes (page Commander). `todo` : réponse à confirmer par la cliente. */
export const faq: { q: string; r: string; todo?: boolean }[] = [
  {
    q: 'Vos parfums sont-ils vraiment authentiques ?',
    r: 'Oui. On ne vend que des parfums authentiques. Si tu as un doute sur un flacon, pose-nous la question : on te répond franchement.',
  },
  {
    q: 'Je ne sais pas quoi choisir. Vous pouvez m’aider ?',
    r: 'C’est notre plaisir. Dis-nous ce que tu aimes (frais, doux, boisé…), pour quelle occasion et pour qui : on te propose deux ou trois parfums qui te correspondent.',
  },
  {
    q: 'Comment connaître le prix ?',
    r: 'Quand le prix est affiché sur la fiche, c’est celui-là. Sinon, il est indiqué « Prix sur demande » : on te le donne tout de suite sur WhatsApp, selon la contenance choisie.',
  },
  {
    q: 'Combien coûte la livraison et en combien de temps ?',
    r: 'Ça dépend de ton quartier. On te confirme le tarif et le délai sur WhatsApp avant que tu valides.',
    todo: true,
  },
  {
    q: 'Le parfum que je veux est épuisé. Comment faire ?',
    r: 'Sur sa fiche, appuie sur « Me prévenir quand il revient » : on te recontacte dès qu’il est de nouveau disponible. On peut aussi te proposer un parfum proche.',
  },
  {
    q: 'Je veux offrir un parfum. C’est possible ?',
    r: 'Oui. Dis-le-nous sur WhatsApp en commandant : on voit ensemble comment le faire livrer à la personne.',
    todo: true,
  },
];

export const etapesCommande = [
  { n: '01', titre: 'Choisis', texte: 'Choisis ton parfum et sa contenance.' },
  { n: '02', titre: 'Envoie sur WhatsApp', texte: 'Envoie ta sélection sur WhatsApp, le message est déjà prêt.' },
  { n: '03', titre: 'On confirme', texte: 'On confirme avec toi la livraison et le paiement.' },
];
