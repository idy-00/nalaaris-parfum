/**
 * INFOS PRATIQUES & CONTACTS
 * Par défaut, livraison et paiement se règlent sur WhatsApp : le site ne promet ni zones, ni tarifs, ni délais.
 * Quand la boutique remplit « Boutique » dans l'admin (D1, lu au build), ces informations remplacent les textes
 * par défaut — seulement celles qui sont remplies.
 */
import type { DonneesD1 } from './parfums';

const boutique: DonneesD1['boutique'] =
  Object.values(import.meta.glob<DonneesD1>('./d1.generated.json', { eager: true, import: 'default' }))[0]?.boutique ?? {};
const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
const LIB_PAIEMENT: Record<string, string> = { wave: 'Wave', orange_money: 'Orange Money', especes: 'espèces', autre: 'un autre moyen à convenir' };
const enListe = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} ou ${l[l.length - 1]}` : (l[0] ?? ''));
const zones = boutique.zones ?? [];
const paiements = (boutique.paiements ?? []).map((p) => LIB_PAIEMENT[p]).filter(Boolean);
const zoneTexte = (z: { nom: string; frais: number; delai: string }) =>
  `${z.nom} : ${z.frais ? fcfa(z.frais) : 'offerte'}${z.delai ? ` (${z.delai})` : ''}`;

export const marque = {
  nom: 'NAL’AARIS PERFUMES',
  nomCourt: 'Nal’Aaris',
  signature: 'By Yannick & Laetitia',
  devise: 'Sentir bon c’est se respecter et respecter les autres',
  ville: 'Dakar',
  /** TODO cliente : photo de Yannick & Laetitia (ex. '/media/duo.webp', format 4:5). Vide = bouquet d'ambiance. */
  photoDuo: '' as string,
};

/** URL publique du site (aperçus Open Graph). TODO : remplacer par le domaine définitif. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL ?? 'https://nalaaris-parfum.pages.dev').replace(/\/$/, '');

export const contacts = {
  whatsappNumero: /^221\d{9}$/.test(boutique.whatsapp ?? '') ? boutique.whatsapp! : '221770331313',
  telephoneAffiche: (/^221\d{9}$/.test(boutique.whatsapp ?? '') ? boutique.whatsapp!.slice(3) : '770331313').replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4'),
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
}

// Le site s'arrête au message WhatsApp : livraison et paiement se règlent ensuite dans la conversation.
export const infosPratiques: BlocInfo[] = [
  {
    id: 'livraison',
    titre: 'Livraison',
    lignes:
      zones.length || boutique.retrait
        ? [
            ...zones.slice(0, 6).map(zoneTexte),
            ...(boutique.retrait ? [`Retrait possible${boutique.retraitAdresse ? ` : ${boutique.retraitAdresse}` : ''}.`] : []),
          ]
        : ['On s’organise avec toi sur WhatsApp, une fois ton message reçu.'],
  },
  {
    id: 'paiement',
    titre: 'Paiement',
    lignes: paiements.length
      ? ['Rien à payer sur le site.', `Tu paies par ${enListe(paiements)}, une fois la commande confirmée.`]
      : ['Rien à payer sur le site.', 'On voit le paiement ensemble sur WhatsApp.'],
  },
  {
    id: 'conseil',
    titre: 'Conseil',
    lignes: ['Tu hésites entre deux parfums ?',
      'Demande-nous avant de commander, on te guide.',
      ...(boutique.horaires ? [`On te répond ${boutique.horaires}.`] : []),
    ],
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

/** Questions fréquentes (page Commander). */
export const faq: { q: string; r: string }[] = [
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
    r: 'Quand le prix est affiché sur la fiche, c’est celui-là. Sinon, appuie sur « Demander le prix » : on te le donne sur WhatsApp, avec les formats disponibles.',
  },
  {
    q: 'Et la livraison ?',
    r: zones.length
      ? `On livre à Dakar. ${zones.map(zoneTexte).join(' ; ')}.${boutique.retrait ? ' Tu peux aussi venir récupérer ta commande.' : ''} On confirme tout avec toi sur WhatsApp.`
      : 'On en parle directement sur WhatsApp, une fois ton message envoyé : on s’organise avec toi.',
  },
  {
    q: 'Le parfum que je veux est épuisé. Comment faire ?',
    r: 'Sur sa fiche, appuie sur « Me prévenir quand il revient » : on te recontacte dès qu’il est de nouveau disponible. On peut aussi te proposer un parfum proche.',
  },
  {
    q: 'Je veux offrir un parfum. C’est possible ?',
    r: 'Oui. Dis-le-nous sur WhatsApp en commandant : on voit ensemble comment le faire parvenir à la personne.',
  },
  {
    q: 'Un problème avec ma commande ?',
    r: 'Écris-nous sur WhatsApp avec ton prénom et le parfum commandé : on regarde avec toi et on trouve une solution.',
  },
];

/** Étape 1 : la contenance n'est proposée que si des formats sont renseignés (reglages-parfums.ts). */
export const etapesCommande = (formats: boolean) => [
  {
    n: '01',
    titre: 'Choisis',
    texte: formats ? 'Choisis ton parfum et sa contenance.' : 'Choisis ton parfum, on te donne le prix et les formats sur WhatsApp.',
  },
  { n: '02', titre: 'Envoie sur WhatsApp', texte: 'Envoie ta sélection sur WhatsApp, le message est déjà prêt.' },
  { n: '03', titre: 'On confirme', texte: 'On confirme avec toi la livraison et le paiement.' },
];
