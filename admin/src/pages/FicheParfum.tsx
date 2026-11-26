import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { EditeurParfum } from '../EditeurParfum';
import type { ParfumFiche } from '../types';
import { EnTete, ErreurBloc, Page, Squelette, useDonnees, useToast } from '../ui';
export function FicheParfum() {
 const [revision,setRevision]=useState(0);
 const {slug=''}=useParams();const {data,erreur,recharger,setData}=useDonnees<ParfumFiche>(`parfums/${slug}`);const toast=useToast();
 return <><EnTete titre={data?.nom_public??data?.nom??'Parfum'} retour="/admin/catalogue" actions={data&&!data.masque?<a className="btn btn-trait" href={`/parfum/${slug}`} target="_blank" rel="noopener noreferrer">Voir la fiche</a>:undefined}/><Page>
 {erreur?<ErreurBloc message={erreur} reessayer={recharger}/>:!data?<Squelette/>:<>
 <p className="mb-4 text-sm text-sourdine">Modifie librement la fiche. Les changements enregistrés apparaissent automatiquement sur le site.</p>
 <EditeurParfum key={`${slug}:${revision}`} initial={data} onSave={async body=>{setData(await api.patch<ParfumFiche>(`parfums/${slug}`,body));setRevision(r=>r+1);toast(body.masque?'Brouillon enregistré.':'Fiche enregistrée et publiée.');}}/>
 <Link className="btn btn-trait mt-6" to={`/admin/vente?slug=${slug}`}>Noter une vente</Link></>}
 </Page></>;
}

export function Champ({
  label,
  value,
  onChange,
  placeholder,
  aide,
  multi,
  requis,
  type = 'text',
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  aide?: string;
  multi?: boolean;
  requis?: boolean;
  type?: string;
  inputMode?: 'text' | 'tel' | 'numeric';
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">
        {label}
        {requis && <span className="text-rose-doux"> *</span>}
      </span>
      {multi ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} className="champ py-3 leading-relaxed" required={requis} />
      ) : (
        <input type={type} inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="champ" required={requis} />
      )}
      {aide && <span className="mt-1 block text-sm text-sourdine">{aide}</span>}
    </label>
  );
}
