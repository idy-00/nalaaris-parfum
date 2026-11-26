import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { EditeurParfum } from '../EditeurParfum';
import { EnTete, Page, useToast } from '../ui';
export function NouveauParfum(){
 const navigate=useNavigate(),toast=useToast();
 return <><EnTete titre="Ajouter un parfum" retour="/admin/catalogue"/><Page><EditeurParfum onSave={async body=>{
 const r=await api.post<{slug:string}>('parfums',body);toast(body.masque?'Brouillon enregistré.':'Parfum publié sur le site.');navigate(`/admin/catalogue/${r.slug}`,{replace:true});
 }}/></Page></>;
}
