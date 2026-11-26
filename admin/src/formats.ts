import type { Contenance } from './types';
const CHAMPS=['prix_vente','prix_achat','stock','seuil_alerte','dispo_force'] as const;
/** Une vente peut modifier le stock pendant l'édition : ne renvoyer que les valeurs réellement saisies. */
export function formatsModifies(formats:Pick<Contenance,'ml'|typeof CHAMPS[number]>[],origine:Contenance[]=[]) {
  return formats.map(c=>{
    const avant=origine.find(x=>x.ml===c.ml);
    return {ml:c.ml,...Object.fromEntries(CHAMPS.filter(k=>!avant||avant[k]!==c[k]).map(k=>[k,c[k]]))};
  });
}
