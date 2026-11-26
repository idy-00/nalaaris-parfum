import { useSyncExternalStore } from 'react';
import { appliquerCatalogue, type DonneesD1 } from '../data/parfums';
import { appliquerBoutique } from '../data/infos';
let version=0;
let derniere='';
const abonnes=new Set<()=>void>();
const abonner=(f:()=>void)=>{abonnes.add(f);return ()=>{abonnes.delete(f);};};
export const useVivant=()=>useSyncExternalStore(abonner,()=>version,()=>0);
export function recevoirCatalogue(d:DonneesD1) {
  if(!d || d.complet!==true || !d.parfums || typeof d.parfums!=='object')throw new Error('Catalogue incomplet');
  const empreinte=JSON.stringify({parfums:d.parfums,boutique:d.boutique,avis:d.avis});
  if(empreinte===derniere)return;
  appliquerCatalogue(d);appliquerBoutique(d.boutique??{});derniere=empreinte;
  version++;abonnes.forEach(f=>f());
}
let enCours:Promise<void>|null=null;
export function chargerCatalogueVivant():Promise<void> {
  if(enCours)return enCours;
  enCours=(async()=>{
    try{
      const r=await fetch('/api/public/catalogue?complet=1',{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(r.ok)recevoirCatalogue(await r.json());
    }catch{/* En cas de coupure, conserver le catalogue déjà affiché. */}
    finally{enCours=null;}
  })();
  return enCours;
}
