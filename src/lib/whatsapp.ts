import { contacts, SITE_URL } from '../data/infos';
import type { Parfum } from '../data/parfums';

const SALUT = 'Bonjour Nal’Aaris Perfumes 🌸';

/** Seul point de construction des liens WhatsApp du site. */
export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${contacts.whatsappNumero}?text=${encodeURIComponent(message)}`;
}

export const ficheUrl = (slug: string) => `${SITE_URL}/parfum/${slug}`;

/** Depuis une fiche (ou une carte). */
export function messageFiche(p: Parfum, ml: number): string {
  return [
    SALUT,
    `Je voudrais ${p.nom} (${p.marque}) en ${ml} ml.`,
    'Est-il disponible ?',
    `Lien : ${ficheUrl(p.slug)}`,
  ].join('\n');
}

/** Parfum épuisé : demande d'alerte de retour. */
export function messageAlerte(p: Parfum, ml: number): string {
  return [
    SALUT,
    `${p.nom} (${p.marque}) en ${ml} ml est indiqué épuisé.`,
    'Pouvez-vous me prévenir quand il revient ?',
    `Lien : ${ficheUrl(p.slug)}`,
  ].join('\n');
}

/** Depuis « Ma sélection ». */
export function messageSelection(lignes: { parfum: Parfum; ml: number }[]): string {
  return [
    SALUT,
    'Voici ma sélection :',
    ...lignes.map(({ parfum, ml }) => `• ${parfum.nom} (${parfum.marque}) — ${ml} ml`),
    'Sont-ils disponibles ? Merci !',
  ].join('\n');
}

/** Contact général / conseil. */
export const messageConseil = (): string => [SALUT, 'J’aimerais un conseil pour choisir un parfum.'].join('\n');

/** Recherche sans résultat. */
export const messageRecherche = (q: string): string =>
  [SALUT, `Je cherche un parfum${q ? ` : « ${q} »` : ''}. Pouvez-vous m’aider ?`].join('\n');
