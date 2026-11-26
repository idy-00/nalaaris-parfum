import type { DonneesD1, Parfum } from '../data/parfums';
/** Un instantané complet est autoritaire : un produit masqué ne revient pas depuis le build. */
export function fusionnerCatalogue(base:Parfum[],donnees?:DonneesD1):Parfum[] {
  if(!donnees)return base;
  const anciens=new Map(base.map(p=>[p.slug,p]));
  const slugs=donnees.complet?Object.keys(donnees.parfums):[...new Set([...anciens.keys(),...Object.keys(donnees.parfums)])];
  return slugs.flatMap(slug=>{
    const d=donnees.parfums[slug],b=anciens.get(slug);
    if(d?.masque || (!b&&(!d?.nom||!d?.marque||!d?.categorie)))return [];
    return [{...b,...d,slug,nom:d?.nom??b?.nom??'',marque:d?.marque??b?.marque??'',categorie:d?.categorie??b?.categorie??'unisexe',description:d?.description??b?.description??'',
      concentration:d?.concentration===null?undefined:d?.concentration??b?.concentration,
      styles:d?.styles?.length?d.styles:b?.styles?.length?b.styles:['doux'],images:d?.images??b?.images??[],notes:d?.notes??b?.notes??{bouquet:[]},ingredients:d?.ingredients??b?.ingredients??[],
      contenances:(d?.contenances??b?.contenances??[]).map(c=>({...c,prix:c.prix??undefined,dispo:c.dispo??undefined})),
      porter:d?.porter===null?undefined:d?.porter??b?.porter,dispo:d?.dispo===null?undefined:d?.dispo??b?.dispo} as Parfum];
  });
}
