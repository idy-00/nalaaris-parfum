import { useState } from 'react';
import { api } from '../api';
import { EnTete, ErreurBloc, Interrupteur, Page, Pastille, Section, Squelette, Vide, useDonnees } from '../ui';
import { Champ } from './FicheParfum';

interface Avis { id: number; prenom: string; ville: string | null; texte: string; note: number | null; date_avis: string; accord_cliente: number; publie: number }
const vide = () => ({ prenom: '', ville: '', texte: '', note: '', date_avis: new Date().toISOString().slice(0, 10), accord_cliente: false, publie: false });

export function AvisPage() {
  const { data, erreur, recharger, setData } = useDonnees<Avis[]>('avis');
  const [f, setF] = useState(vide);
  const [edition, setEdition] = useState<number | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState('');
  const agir = async (action: () => Promise<Avis[]>) => {
    if (occupe) return false; setOccupe(true); setMessage('');
    try { setData(await action()); return true; } catch (e) { setMessage((e as Error).message); return false; } finally { setOccupe(false); }
  };
  return <><EnTete titre="Avis clients" retour="/admin/plus" /><Page className="admin-grille">
    <p className="carte p-4 text-sm text-sourdine">Ajoute uniquement des avis réels, avec l’accord de la personne. Le site les affiche à partir de trois avis publiés, après publication du site.</p>
    {message && <p role="alert" className="mt-4 text-danger">{message}</p>}
    <Section titre={edition ? 'Modifier l’avis' : 'Ajouter un avis'}><form className="carte grid gap-4 p-4" onSubmit={async (e) => {
      e.preventDefault();
      const corps = { ...f, note: f.note ? Number(f.note) : null };
      if (await agir(() => edition ? api.patch<Avis[]>(`avis/${edition}`, corps) : api.post<Avis[]>('avis', corps))) { setF(vide()); setEdition(null); }
    }}>
      <Champ label="Prénom" value={f.prenom} onChange={(v) => setF({ ...f, prenom: v })} requis />
      <Champ label="Ville (facultatif)" value={f.ville} onChange={(v) => setF({ ...f, ville: v })} />
      <Champ label="Avis" value={f.texte} onChange={(v) => setF({ ...f, texte: v })} multi requis />
      <div className="grid grid-cols-2 gap-3"><label>Note (facultative)<select className="champ" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })}><option value="">Sans note</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}/5</option>)}</select></label><Champ label="Date" type="date" value={f.date_avis} onChange={(v) => setF({ ...f, date_avis: v })} requis /></div>
      <label className="flex min-h-[44px] items-center gap-3"><input type="checkbox" required checked={f.accord_cliente} onChange={(e) => setF({ ...f, accord_cliente: e.target.checked })} />La personne a donné son accord</label>
      <Interrupteur libelle="Publier cet avis" actif={f.publie} onChange={(v) => setF({ ...f, publie: v })} />
      <button type="submit" disabled={occupe} className="btn btn-rose">{occupe ? 'Enregistrement…' : 'Enregistrer l’avis'}</button>
      {edition && <button type="button" className="btn btn-trait" onClick={() => { setEdition(null); setF(vide()); }}>Annuler la modification</button>}
    </form></Section>
    <Section titre="Avis enregistrés">{erreur ? <ErreurBloc message={erreur} reessayer={recharger} /> : !data ? <Squelette /> : !data.length ? <Vide titre="Aucun avis enregistré" /> : <div className="space-y-3">{data.map((a) => <article key={a.id} className="carte space-y-3 p-4">
      <div className="flex items-center justify-between gap-3"><h3 className="text-xl">{a.prenom}{a.ville ? ` — ${a.ville}` : ''}</h3><Pastille ton={a.publie ? 'ok' : 'neutre'}>{a.publie ? 'Publié' : 'Masqué'}</Pastille></div>
      <p className="whitespace-pre-wrap text-sm">{a.texte}</p><p className="text-sm text-sourdine">{a.date_avis}{a.note ? ` · ${a.note}/5` : ''}</p>
      <div className="flex flex-wrap gap-2"><button className="btn btn-trait" disabled={occupe} onClick={() => { setEdition(a.id); setF({ prenom: a.prenom, ville: a.ville ?? '', texte: a.texte, note: a.note == null ? '' : String(a.note), date_avis: a.date_avis, accord_cliente: !!a.accord_cliente, publie: !!a.publie }); window.scrollTo({ top: 0 }); }}>Modifier</button>
        <button className="btn btn-trait" disabled={occupe} onClick={() => void agir(() => api.patch<Avis[]>(`avis/${a.id}`, { publie: !a.publie }))}>{a.publie ? 'Masquer' : 'Publier'}</button>
        <button className="btn btn-danger" disabled={occupe} onClick={() => { if (confirm(`Supprimer l’avis de ${a.prenom} ?`)) void agir(() => api.del<Avis[]>(`avis/${a.id}`)); }}>Supprimer</button></div>
    </article>)}</div>}</Section>
  </Page></>;
}
