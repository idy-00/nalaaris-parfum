import { formatsModifies } from './formats';
import { useState } from 'react';
import { api } from './api';
import type { ParfumFiche, Porter } from './types';
import { ChampMontant, Interrupteur, Puces, Section } from './ui';
const styles=['frais','fleuri','boise','doux','vanille','oriental'];
const libStyles=['Frais','Fleuri','Boisé','Doux','Vanillé','Oriental'];
const conseil:Porter={moment:'jourSoir',momentDetail:'',saison:'annee',saisonDetail:'',occasion:{icone:'quotidien',titre:'Au quotidien',detail:''}};
type Format={ml:number;prix_vente:number|null;prix_achat:number|null;stock:number|null;seuil_alerte:number;dispo_force:'epuise'|'sur_commande'|null};
const formatVide=():Format=>({ml:100,prix_vente:null,prix_achat:null,stock:null,seuil_alerte:2,dispo_force:null});
async function reduirePhoto(file:File):Promise<Blob>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15_000_000)throw new Error('Choisis une photo JPEG, PNG ou WebP de moins de 15 Mo.');
  const image=await createImageBitmap(file);
  try{
    const ratio=Math.min(1,1400/image.width,1600/image.height),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Impossible de préparer cette photo.');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
    for(const qualite of [.85,.7,.55,.4]){
      const blob=await new Promise<Blob|null>(ok=>canvas.toBlob(ok,'image/jpeg',qualite));
      if(blob&&blob.size<=600_000)return blob;
    }
    throw new Error('Cette photo reste trop lourde. Choisis une image plus petite.');
  }finally{image.close();}
}
export function EditeurParfum({initial,onSave}:{initial?:ParfumFiche;onSave:(body:Record<string,unknown>)=>Promise<void>}){
  const n=initial?.notes;
  const [f,setF]=useState(()=>({nom:initial?.nom_public??initial?.nom??'',marque:initial?.marque??'',concentration:initial?.concentration??'',categorie:initial?.categorie??'unisexe',description:initial?.description??'',
    styles:initial?.styles?.length?initial.styles:['doux'],images:initial?.images??[],ingredients:(initial?.ingredients??[]).join(', '),
    pyramide:!!n&&'tete'in n,bouquet:n&&'bouquet'in n?n.bouquet.join(', '):'',tete:n&&'tete'in n?n.tete.join(', '):'',coeur:n&&'coeur'in n?n.coeur.join(', '):'',fond:n&&'fond'in n?n.fond.join(', '):'',
    nouveau:!!initial?.nouveau,coup_de_coeur:!!initial?.coup_de_coeur,masque:!!initial?.masque,dispo_force:initial?.dispo_force??'',
    avecConseil:!!initial?.porter,porter:initial?.porter??conseil,contenances:initial?.contenances.map(c=>({...c}))??[formatVide()]}));
  const [envoi,setEnvoi]=useState(false),[photos,setPhotos]=useState(false),[erreur,setErreur]=useState('');
  const champ=(cle:'nom'|'marque'|'concentration'|'description'|'ingredients'|'bouquet'|'tete'|'coeur'|'fond',label:string,multi=false,requis=false)=>
    <label className="grid gap-2"><span className="label">{label}{requis?' *':''}</span>{multi?<textarea className="champ py-3" rows={4} maxLength={cle==='description'?1200:600} value={f[cle]} onChange={e=>setF({...f,[cle]:e.target.value})}/>:<input className="champ" value={f[cle]} required={requis} maxLength={cle==='marque'?60:cle==='nom'?80:cle==='concentration'?40:600} onChange={e=>setF({...f,[cle]:e.target.value})}/>}</label>;
  const setPorter=(p:Partial<Porter>)=>setF({...f,porter:{...f.porter,...p}});
  const modifierFormat=(i:number,p:Partial<Format>)=>setF({...f,contenances:f.contenances.map((x,j)=>i===j?{...x,...p}:x)});
  const notes=(s:string)=>s.split(/[,;\n]/).map(x=>x.trim()).filter(Boolean);
  return <form className="admin-grille" onSubmit={async e=>{
    e.preventDefault();if(envoi||photos)return;setErreur('');setEnvoi(true);
    try{await onSave({...f,contenances:formatsModifies(f.contenances,initial?.contenances),contenances_initiales:initial?.contenances.map(c=>c.ml)??[],nom_public:null,dispo_force:f.dispo_force||null,porter:f.avecConseil?f.porter:null,notes:f.pyramide?{tete:notes(f.tete),coeur:notes(f.coeur),fond:notes(f.fond)}:{bouquet:notes(f.bouquet)},ingredients:notes(f.ingredients)});}
    catch(e){setErreur((e as Error).message);}finally{setEnvoi(false);}
  }}>
    <Section titre="Le parfum"><div className="carte grid gap-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2">{champ('marque','Marque',false,true)}{champ('nom','Nom',false,true)}</div>
      {champ('concentration','Concentration (facultative)')}
      <label className="grid gap-2"><span className="label">Catégorie</span><select className="champ" value={f.categorie} onChange={e=>setF({...f,categorie:e.target.value as typeof f.categorie})}><option value="femme">Femme</option><option value="homme">Homme</option><option value="unisexe">Unisexe</option></select></label>
      {champ('description','Description',true)}
      <fieldset><legend className="label mb-2">Ambiances — une à trois</legend><div className="flex flex-wrap gap-2">{styles.map((s,i)=><button type="button" key={s} className="puce" aria-pressed={f.styles.includes(s)} disabled={!f.styles.includes(s)&&f.styles.length>=3} onClick={()=>setF({...f,styles:f.styles.includes(s)?f.styles.filter(x=>x!==s):[...f.styles,s]})}>{libStyles[i]}</button>)}</div></fieldset>
    </div></Section>
    <Section titre="Photos"><div className="carte grid gap-4 p-4">
      <p className="text-sm text-sourdine">Jusqu’à six photos. La première apparaît dans le catalogue. Elles sont réduites automatiquement avant l’envoi.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{f.images.map((src,i)=><div className="min-w-0" key={src}>
        <img className="aspect-[4/5] w-full rounded-xl bg-fond-3 object-contain" src={src.startsWith('/api/public/photos/')?src.replace('/api/public/photos/','/api/admin/photos/'):src} alt={`Photo ${i+1}`}/>
        <div className="mt-2 flex flex-wrap gap-2">{i>0?<button type="button" className="min-h-[44px] text-sm text-rose-doux" onClick={()=>setF({...f,images:[src,...f.images.filter(x=>x!==src)]})}>Photo principale</button>:<span className="py-2 text-sm font-semibold">Principale</span>}<button type="button" className="min-h-[44px] text-sm text-danger" onClick={()=>setF({...f,images:f.images.filter(x=>x!==src)})}>Retirer</button></div>
      </div>)}</div>
      <label className="btn btn-trait cursor-pointer"><span>{photos?'Envoi des photos…':'Ajouter des photos'}</span><input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" multiple disabled={photos||envoi||f.images.length>=6} onChange={async e=>{
        const fichiers=Array.from(e.target.files??[]);e.target.value='';if(!fichiers.length)return;
        if(fichiers.length+f.images.length>6){setErreur('Six photos maximum.');return;}setPhotos(true);setErreur('');
        try{for(const file of fichiers){const blob=await reduirePhoto(file);const r=await api.envoyer<{url:string}>(`photos?slug=${encodeURIComponent(f.marque+' '+f.nom)}`,blob);setF(avant=>({...avant,images:[...avant.images,r.url]}));}}
        catch(e){setErreur((e as Error).message);}finally{setPhotos(false);}
      }}/></label>
    </div></Section>
    <Section titre="Notes et ingrédients"><div className="carte grid gap-4 p-4">
      <Interrupteur actif={f.pyramide} onChange={v=>setF({...f,pyramide:v})} libelle="Notes de tête, de cœur et de fond"/>
      {f.pyramide?<>{champ('tete','Notes de tête')}{champ('coeur','Notes de cœur')}{champ('fond','Notes de fond')}</>:champ('bouquet','Notes principales')}
      {champ('ingredients','Ingrédients ou accords (séparés par des virgules)')}
    </div></Section>
    <Section titre="Formats, prix et stock"><div className="grid gap-3">{f.contenances.map((c,i)=><div key={i} className="carte grid gap-3 p-4">
      <div className="grid grid-cols-2 gap-3"><label className="grid gap-1"><span className="label">Contenance (ml)</span><input className="champ" type="number" min={1} max={1000} required value={c.ml||''} onChange={e=>modifierFormat(i,{ml:Number(e.target.value)})}/></label><label className="grid gap-1"><span className="label">Prix (FCFA)</span><ChampMontant valeur={c.prix_vente} onChange={v=>modifierFormat(i,{prix_vente:v})} label={`Prix du format ${i+1}`}/></label></div>
      <div className="grid grid-cols-2 gap-3"><label className="grid gap-1"><span className="label">Stock (vide = non suivi)</span><input className="champ" type="number" min={0} max={100000} value={c.stock??''} onChange={e=>modifierFormat(i,{stock:e.target.value===''?null:Number(e.target.value)})}/></label><label className="grid gap-1"><span className="label">Prix d’achat (privé)</span><ChampMontant valeur={c.prix_achat} onChange={v=>modifierFormat(i,{prix_achat:v})} label={`Prix d’achat du format ${i+1}`}/></label></div>
      <label className="grid gap-1"><span className="label">Seuil d’alerte du stock</span><input className="champ" type="number" min={0} max={1000} required value={c.seuil_alerte} onChange={e=>modifierFormat(i,{seuil_alerte:Number(e.target.value)})}/></label>
      <label className="grid gap-1"><span className="label">Disponibilité du format</span><select className="champ" value={c.dispo_force??''} onChange={e=>modifierFormat(i,{dispo_force:(e.target.value||null) as Format['dispo_force']})}><option value="">Automatique selon le stock</option><option value="sur_commande">Sur commande</option><option value="epuise">Épuisé</option></select></label>
      <button type="button" className="btn btn-danger" onClick={()=>setF({...f,contenances:f.contenances.filter((_,j)=>i!==j)})}>Retirer ce format</button>
    </div>)}<button type="button" className="btn btn-trait" disabled={f.contenances.length>=20} onClick={()=>setF({...f,contenances:[...f.contenances,formatVide()]})}>Ajouter une contenance</button></div></Section>
    <Section titre="Quand le porter"><div className="carte grid gap-4 p-4">
      <Interrupteur actif={f.avecConseil} onChange={v=>setF({...f,avecConseil:v})} libelle="Afficher un conseil"/>
      {f.avecConseil&&<>
        <Puces label="Moment" valeur={f.porter.moment} onChange={v=>setPorter({moment:v})} options={[{v:'jour',l:'Jour'},{v:'soir',l:'Soir'},{v:'jourSoir',l:'Jour et soir'}]}/>
        <label className="grid gap-1"><span className="label">Conseil pour le moment</span><input className="champ" maxLength={80} value={f.porter.momentDetail} onChange={e=>setPorter({momentDetail:e.target.value})}/></label>
        <Puces label="Saison" valeur={f.porter.saison} onChange={v=>setPorter({saison:v})} options={[{v:'fraiche',l:'Saison fraîche'},{v:'chaude',l:'Saison chaude'},{v:'annee',l:'Toute l’année'}]}/>
        <label className="grid gap-1"><span className="label">Conseil pour la saison</span><input className="champ" maxLength={80} value={f.porter.saisonDetail} onChange={e=>setPorter({saisonDetail:e.target.value})}/></label>
        <Puces label="Occasion" valeur={f.porter.occasion.icone} onChange={v=>setPorter({occasion:{...f.porter.occasion,icone:v}})} options={[{v:'quotidien',l:'Quotidien'},{v:'bureau',l:'Bureau'},{v:'sortie',l:'Sortie'},{v:'diner',l:'Dîner'},{v:'ceremonie',l:'Cérémonie'}]}/>
        <label className="grid gap-1"><span className="label">Titre de l’occasion</span><input className="champ" required maxLength={60} value={f.porter.occasion.titre} onChange={e=>setPorter({occasion:{...f.porter.occasion,titre:e.target.value}})}/></label>
        <label className="grid gap-1"><span className="label">Détail de l’occasion</span><input className="champ" maxLength={120} value={f.porter.occasion.detail} onChange={e=>setPorter({occasion:{...f.porter.occasion,detail:e.target.value}})}/></label>
      </>}
    </div></Section>
    <Section titre="Publication"><div className="carte grid gap-3 p-4">
      <Interrupteur actif={!f.masque} onChange={v=>setF({...f,masque:!v})} libelle="Visible sur le site" aide="Désactive pour garder un brouillon ou masquer le parfum."/>
      <Interrupteur actif={f.nouveau} onChange={v=>setF({...f,nouveau:v})} libelle="Nouveau"/>
      <Interrupteur actif={f.coup_de_coeur} onChange={v=>setF({...f,coup_de_coeur:v})} libelle="Coup de cœur"/>
      <label className="grid gap-1"><span className="label">Disponibilité générale</span><select className="champ" value={f.dispo_force} onChange={e=>setF({...f,dispo_force:e.target.value as typeof f.dispo_force})}><option value="">Selon les formats</option><option value="disponible">Disponible</option><option value="limite">Stock limité</option><option value="sur_commande">Sur commande</option><option value="epuise">Épuisé</option></select></label>
      <p className="text-sm text-sourdine">{f.masque?'Ce parfum restera invisible dans le catalogue public.':'La fiche sera publiée automatiquement après l’enregistrement.'}</p>
    </div></Section>
    {erreur&&<p role="alert" className="mt-5 rounded-xl bg-danger/10 p-4 text-danger">{erreur}</p>}
    <button type="submit" disabled={envoi||photos||!f.styles.length} className="admin-actions-formulaire btn btn-rose sticky bottom-[calc(76px+env(safe-area-inset-bottom))] mt-6 w-full shadow-lg md:bottom-4">{envoi?'Enregistrement…':f.masque?'Enregistrer le brouillon':initial?'Enregistrer et publier':'Publier le parfum'}</button>
  </form>;
}
