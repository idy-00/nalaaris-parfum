import { useState } from 'react';
import { dateHeure } from '../format';
import { EnTete, ErreurBloc, Page, Squelette, Vide, useDonnees } from '../ui';

interface Ligne { id: number; quand: string; qui: string; action: string; libelle: string | null; champ: string | null; avant: string | null; apres: string | null }
export function JournalPage() {
  const [page, setPage] = useState(0);
  const { data, erreur, chargement, recharger } = useDonnees<{ lignes: Ligne[]; suivante: boolean }>(`journal?page=${page}`);
  return <><EnTete titre="Journal des modifications" retour="/admin/plus" /><Page>
    {erreur ? <ErreurBloc message={erreur} reessayer={recharger} /> : !data || chargement ? <Squelette /> : !data.lignes.length ? <Vide titre="Aucune modification" /> : <div className="space-y-3">{data.lignes.map((l) => <article key={l.id} className="carte space-y-2 p-4">
      <p className="text-sm text-sourdine">{dateHeure(l.quand)} · {l.qui}</p>
      <h2 className="font-sans text-base font-semibold">{l.libelle ?? l.action}</h2>
      <p className="text-sm">{l.action}{l.champ ? ` · ${l.champ}` : ''}</p>
      {(l.avant != null || l.apres != null) && <details><summary className="min-h-[44px] cursor-pointer py-2 text-sm font-medium text-rose-doux">Voir le changement</summary><dl className="grid gap-2 text-sm"><dt className="font-semibold">Avant</dt><dd className="whitespace-pre-wrap break-words">{l.avant ?? 'Vide'}</dd><dt className="font-semibold">Après</dt><dd className="whitespace-pre-wrap break-words">{l.apres ?? 'Vide'}</dd></dl></details>}
    </article>)}</div>}
    <div className="mt-5 flex items-center justify-between gap-3"><button className="btn btn-trait" disabled={!page || chargement} onClick={() => setPage(page - 1)}>Précédente</button><span className="text-sm">Page {page + 1}</span><button className="btn btn-trait" disabled={!data?.suivante || chargement} onClick={() => setPage(page + 1)}>Suivante</button></div>
  </Page></>;
}
