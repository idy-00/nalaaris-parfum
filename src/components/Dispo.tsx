import { DISPO_LABEL, type Dispo } from '../data/parfums';

const POINT: Record<Dispo, string> = {
  disponible: 'bg-dispo-ok',
  limite: 'bg-dispo-limite',
  epuise: 'bg-dispo-epuise',
};

/** Disponibilité : point de couleur + libellé (jamais la couleur seule). */
export function BadgeDispo({ dispo, long = false, className = '' }: { dispo: Dispo; long?: boolean; className?: string }) {
  const texte = dispo === 'epuise' && long ? 'Épuisé — demande quand il revient' : DISPO_LABEL[dispo];
  return (
    <span className={`inline-flex items-center gap-2 text-sm text-encre/90 ${className}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${POINT[dispo]}`} aria-hidden="true" />
      {texte}
    </span>
  );
}
