/** Formats d'affichage : « 25 000 FCFA », dates en français, fuseau Africa/Dakar. */
const nf = new Intl.NumberFormat('fr-FR');
export const nombre = (n: number) => nf.format(n);
export const fcfa = (n: number | null | undefined) => (n == null ? '—' : `${nf.format(n)} FCFA`);
export const pourcent = (x: number) => `${Math.round(x * 100)} %`;

const TZ = 'Africa/Dakar';
export const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: TZ });
export const heure = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
export const dateHeure = (iso: string) => `${dateCourte(iso)} ${heure(iso)}`;
export const dateLongue = (d = new Date()) => d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
export const jourCourt = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', timeZone: TZ });

/** « 77 123 45 67 » */
export const telAffiche = (t?: string | null) => (t ? t.replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4') : '');
/** Lien WhatsApp vers un numéro sénégalais à 9 chiffres, message pré-rempli. Rien n'est envoyé sans action. */
export const lienWa = (tel: string, message: string) => `https://wa.me/221${tel}?text=${encodeURIComponent(message)}`;

export const LIB_PAIEMENT: Record<string, string> = { wave: 'Wave', orange_money: 'Orange Money', especes: 'Espèces', autre: 'Autre' };
export const LIB_STATUT: Record<string, string> = { a_livrer: 'À livrer', livree: 'Livrée', payee: 'Payée', annulee: 'Annulée' };
export const LIB_DISPO: Record<string, string> = {
  disponible: 'Disponible',
  limite: 'Stock bas',
  epuise: 'Épuisé',
  sur_commande: 'Sur commande',
};

/** « 3 → 2 » comparaison semaine : variation affichée avec signe. */
export function variation(n: number, prec: number): { texte: string; sens: 'haut' | 'bas' | 'egal' } {
  if (n === prec) return { texte: '=', sens: 'egal' };
  if (!prec) return { texte: `+${nombre(n)}`, sens: 'haut' };
  const p = Math.round(((n - prec) / prec) * 100);
  return { texte: `${p > 0 ? '+' : ''}${p} %`, sens: p > 0 ? 'haut' : p < 0 ? 'bas' : 'egal' };
}
