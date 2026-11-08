import { contacts, SITE_URL } from '../data/infos';
import type { Parfum } from '../data/parfums';

/** « Dior J’adore (Eau de parfum) » : marque, nom et concentration quand elle est connue. */
export const designation = (p: Parfum) => `${p.marque} ${p.nom}${p.concentration ? ` (${p.concentration})` : ''}`;
const enMl = (ml: number) => (ml > 0 ? ` en ${ml} ml` : '');

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
    `Je voudrais ${designation(p)}${enMl(ml)}.`,
    ml > 0 ? 'Est-il disponible ?' : 'Est-il disponible ? Quelles sont les contenances et les prix ?',
    `Lien : ${ficheUrl(p.slug)}`,
  ].join('\n');
}

/** Parfum épuisé : demande d'alerte de retour. */
export function messageAlerte(p: Parfum, ml: number): string {
  return [
    SALUT,
    `${designation(p)}${enMl(ml)} est indiqué épuisé.`,
    'Pouvez-vous me prévenir quand il revient ?',
    `Lien : ${ficheUrl(p.slug)}`,
  ].join('\n');
}

/** Depuis « Ma sélection ». */
export function messageSelection(lignes: { parfum: Parfum; ml: number }[]): string {
  return [
    SALUT,
    'Voici ma sélection :',
    ...lignes.map(({ parfum, ml }) => `• ${designation(parfum)}${ml > 0 ? ` — ${ml} ml` : ''}`),
    'Sont-ils disponibles ? Merci !',
  ].join('\n');
}

/** Contact général / conseil. */
export const messageConseil = (): string => [SALUT, 'J’aimerais un conseil pour choisir un parfum.'].join('\n');

/** Recherche sans résultat. */
export const messageRecherche = (q: string): string =>
  [SALUT, `Je cherche un parfum${q ? ` : « ${q} »` : ''}. Pouvez-vous m’aider ?`].join('\n');
