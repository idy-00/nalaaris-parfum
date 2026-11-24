import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { dateHeure, lienWa, telAffiche } from '../format';
import { EnTete, ErreurBloc, Page, Pastille, Squelette, Vide, useDonnees } from '../ui';

interface Alerte { id: number; slug: string; ml: number | null; prenom: string | null; telephone: string; cree_le: string; prevenue_le: string | null; libelle: string | null }
export function AlertesPage() {
  const { data, erreur, recharger, setData } = useDonnees<Alerte[]>('alertes');
  const [occupe, setOccupe] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const agir = async (a: Alerte, supprimer: boolean) => {
    if (occupe) return; setOccupe(a.id); setMessage('');
    try {
      if (supprimer) await api.del(`alertes/${a.id}`); else await api.post(`alertes/${a.id}/prevenue`);
      setData((d) => d && (supprimer ? d.filter((x) => x.id !== a.id) : d.map((x) => x.id === a.id ? { ...x, prevenue_le: new Date().toISOString() } : x)));
    } catch (e) { setMessage((e as Error).message); } finally { setOccupe(null); }
  };
  return <><EnTete titre="Retours en stock" retour="/admin/plus" /><Page>
    <p className="carte p-4 text-sm text-sourdine">Vérifie le stock, ouvre WhatsApp pour prévenir la personne, puis marque la demande comme traitée. Les demandes de plus de six mois sont retirées.</p>
    {message && <p role="alert" className="mt-4 text-danger">{message}</p>}
    {erreur ? <ErreurBloc message={erreur} reessayer={recharger} /> : !data ? <Squelette /> : !data.length ? <Vide titre="Aucune demande en attente" /> : <div className="admin-catalogue mt-4 space-y-3">{data.map((a) => <article key={a.id} className="carte space-y-3 p-4">
      <div className="flex items-start justify-between gap-3"><h2 className="text-xl">{a.prenom ?? telAffiche(a.telephone)}</h2><Pastille ton={a.prevenue_le ? 'ok' : 'alerte'}>{a.prevenue_le ? 'Prévenue' : 'À prévenir'}</Pastille></div>
      <Link className="block min-h-[44px] py-2 font-medium underline" to={`/admin/catalogue/${a.slug}`}>{a.libelle ?? a.slug}{a.ml ? ` · ${a.ml} ml` : ''}</Link>
      <p className="text-sm text-sourdine">{telAffiche(a.telephone)} · {dateHeure(a.cree_le)}</p>
      <div className="flex flex-wrap gap-2"><a className="btn btn-wa" href={lienWa(a.telephone, `Bonjour${a.prenom ? ` ${a.prenom}` : ''}, ${a.libelle ?? a.slug}${a.ml ? ` en ${a.ml} ml` : ''} est de retour chez Nal’Aaris. Souhaites-tu le réserver ?`)} target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp</a>
        {!a.prevenue_le && <button className="btn btn-trait" disabled={occupe !== null} onClick={() => void agir(a, false)}>Marquer prévenue</button>}
        <button className="btn btn-danger" disabled={occupe !== null} onClick={() => { if (confirm('Supprimer définitivement ce numéro et cette demande ?')) void agir(a, true); }}>Supprimer</button></div>
    </article>)}</div>}
  </Page></>;
}
