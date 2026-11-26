import { useState } from 'react';
import { api } from '../api';
import type { Boutique } from '../types';
import { ChampMontant, EnTete, ErreurBloc, Interrupteur, Page, Section, Squelette, useDonnees, useToast } from '../ui';
import { Champ } from './FicheParfum';

export function BoutiquePage() {
  const { data, erreur, recharger } = useDonnees<Boutique>('reglages/boutique');
  return <><EnTete titre="La boutique" retour="/admin/plus" /><Page>{erreur ? <ErreurBloc message={erreur} reessayer={recharger} /> : data ? <Formulaire initial={data} /> : <Squelette />}</Page></>;
}

function Formulaire({ initial }: { initial: Boutique }) {
  const [f, setF] = useState<Boutique>({ ...initial, zones: initial.zones ?? [], paiements: initial.paiements ?? [] });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const toast = useToast();
  const zone = (i: number, v: Partial<NonNullable<Boutique['zones']>[number]>) => setF({ ...f, zones: f.zones!.map((z, j) => j === i ? { ...z, ...v } : z) });
  return <form className="admin-grille" onSubmit={async (e) => {
    e.preventDefault(); if (envoi) return; setEnvoi(true); setErreur('');
    try { setF(await api.put<Boutique>('reglages/boutique', f)); toast('Informations enregistrées. Le site se met à jour automatiquement.'); }
    catch (err) { setErreur((err as Error).message); } finally { setEnvoi(false); }
  }}>
    <p className="carte p-4 text-sm text-sourdine">Les informations remplies ici apparaissent automatiquement sur le site. Les champs vides gardent les textes généraux.</p>
    <Section titre="Contact"><div className="carte grid gap-4 p-4">
      <Champ label="Numéro WhatsApp" value={f.whatsapp ?? ''} onChange={(v) => setF({ ...f, whatsapp: v })} inputMode="tel" placeholder="77 123 45 67" />
      <Champ label="Horaires de réponse" value={f.horaires ?? ''} onChange={(v) => setF({ ...f, horaires: v })} placeholder="du lundi au samedi, de 9 h à 19 h" />
    </div></Section>
    <Section titre="Retrait"><div className="carte grid gap-3 p-4">
      <Interrupteur libelle="Retrait possible" actif={!!f.retrait} onChange={(v) => setF({ ...f, retrait: v })} />
      {f.retrait && <Champ label="Adresse de retrait" value={f.retraitAdresse ?? ''} onChange={(v) => setF({ ...f, retraitAdresse: v })} />}
    </div></Section>
    <Section titre="Moyens de paiement"><div className="carte grid gap-2 p-4">
      {[['wave', 'Wave'], ['orange_money', 'Orange Money'], ['especes', 'Espèces'], ['autre', 'Autre']].map(([v, l]) => <label key={v} className="flex min-h-[44px] items-center gap-3"><input type="checkbox" checked={f.paiements!.includes(v)} onChange={(e) => setF({ ...f, paiements: e.target.checked ? [...f.paiements!, v] : f.paiements!.filter((x) => x !== v) })} />{l}</label>)}
    </div></Section>
    <Section titre="Zones de livraison"><div className="space-y-3">
      {f.zones!.map((z, i) => <div className="carte grid gap-3 p-4" key={i}>
        <Champ label={`Zone ${i + 1}`} value={z.nom} onChange={(v) => zone(i, { nom: v })} requis />
        <label>Frais (FCFA)<ChampMontant label={`Frais de la zone ${i + 1}`} valeur={z.frais} onChange={(v) => zone(i, { frais: v ?? 0 })} /></label>
        <Champ label="Délai" value={z.delai} onChange={(v) => zone(i, { delai: v })} placeholder="Sous 24 à 48 h" />
        <button type="button" className="btn btn-danger" onClick={() => setF({ ...f, zones: f.zones!.filter((_, j) => i !== j) })}>Retirer cette zone</button>
      </div>)}
      <button type="button" className="btn btn-trait w-full" disabled={f.zones!.length >= 30} onClick={() => setF({ ...f, zones: [...f.zones!, { nom: '', frais: 0, delai: '' }] })}>Ajouter une zone</button>
    </div></Section>
    {erreur && <p role="alert" className="mt-4 text-danger">{erreur}</p>}
    <button type="submit" disabled={envoi} className="admin-actions-formulaire btn btn-rose mt-6 w-full">{envoi ? 'Enregistrement…' : 'Enregistrer les informations'}</button>
  </form>;
}
