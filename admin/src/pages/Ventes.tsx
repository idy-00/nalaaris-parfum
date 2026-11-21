/** Ventes : période, statut, paiement ; total filtré ; export CSV (Excel). */
import { useSearchParams } from 'react-router-dom';
import { ChevronRight, Download } from 'lucide-react';
import { api } from '../api';
import { dateCourte, fcfa, heure, LIB_PAIEMENT, LIB_STATUT } from '../format';
import type { Vente } from '../types';
import { EnTete, ErreurBloc, LienLigne, Page, Pastille, Puces, Squelette, Vide, useAction, useApparition, useDonnees, Chiffre } from '../ui';

const PERIODES = [
  { v: 'jour', l: 'Aujourd’hui' },
  { v: 'semaine', l: 'Semaine' },
  { v: 'mois', l: 'Mois' },
  { v: 'mois_precedent', l: 'Mois dernier' },
  { v: 'tout', l: 'Tout' },
];

export const tonStatut = (s: Vente['statut']) => (s === 'a_livrer' ? 'alerte' : s === 'annulee' ? 'epuise' : s === 'payee' ? 'ok' : 'rose');

export function Ventes() {
  const [params, setParams] = useSearchParams();
  const periode = params.get('periode') ?? 'mois';
  const statut = params.get('statut') ?? '';
  const paiement = params.get('paiement') ?? '';
  const livraison = params.get('livraison') ?? '';
  const qs = new URLSearchParams(Object.entries({ periode, statut, paiement, livraison }).filter(([, v]) => v)).toString();
  const { data, erreur, chargement, recharger } = useDonnees<{ ventes: Vente[]; total: number; nb: number }>(`ventes?${qs}`);
  const agir = useAction();
  const zone = useApparition(data);
  const changer = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  return (
    <>
      <EnTete
        titre="Ventes"
        actions={
          <button
            type="button"
            onClick={() => void agir(() => api.telecharger(`ventes.csv?${qs}`, `ventes-${periode}.csv`), 'Fichier CSV téléchargé')}
            className="btn btn-doux min-h-[44px] px-4"
          >
            <Download size={18} aria-hidden="true" /> CSV
          </button>
        }
      />
      <Page>
        <Puces label="Période" valeur={periode} onChange={(v) => changer('periode', v)} options={PERIODES} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select value={statut} onChange={(e) => changer('statut', e.target.value)} aria-label="Statut" className="champ">
            <option value="">Tous les statuts</option>
            <option value="a_livrer">À livrer</option>
            <option value="livree">Livrées</option>
            <option value="payee">Payées</option>
            <option value="annulee">Annulées</option>
          </select>
          <select value={paiement} onChange={(e) => changer('paiement', e.target.value)} aria-label="Paiement" className="champ">
            <option value="">Tous les paiements</option>
            {Object.entries(LIB_PAIEMENT).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        {livraison === 'a_faire' && (
          <p className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-dispo-limite/10 px-3 py-2 text-sm font-medium text-dispo-limite">
            Livraisons à faire seulement
            <button type="button" onClick={() => changer('livraison', '')} className="min-h-[40px] px-2 font-semibold underline">
              Tout voir
            </button>
          </p>
        )}

        {erreur && <div className="mt-4"><ErreurBloc message={erreur} reessayer={recharger} /></div>}
        {!data && chargement && <div className="mt-4"><Squelette /></div>}
        {data && (
          <>
            <div className="carte mt-4 flex items-end justify-between gap-3 p-4">
              <div>
                <p className="label">Total</p>
                <Chiffre valeur={data.total} format={fcfa} className="chiffre mt-1 block text-[2rem]" />
              </div>
              <p className="pb-1 text-sourdine">
                {data.nb} vente{data.nb > 1 ? 's' : ''}
              </p>
            </div>
            <div ref={zone} className="carte mt-3 divide-y divide-encre/[0.06] overflow-hidden">
              {!data.ventes.length && <Vide titre="Aucune vente" texte="Aucune vente sur cette période avec ces filtres." />}
              {data.ventes.map((v) => (
                <LienLigne key={v.id} to={`/admin/ventes/${v.id}`} className="py-3">
                  <div data-apparition className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="w-12 shrink-0 text-sm leading-tight text-sourdine">
                      <span className="block font-semibold text-encre">{dateCourte(v.date_vente)}</span>
                      {heure(v.date_vente)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-medium ${v.statut === 'annulee' ? 'text-sourdine line-through' : ''}`}>
                        {v.lignes.map((l) => `${l.nom ?? l.slug} ${l.ml} ml${l.quantite > 1 ? ` ×${l.quantite}` : ''}`).join(' + ')}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-sourdine">
                        <Pastille ton={tonStatut(v.statut)}>{LIB_STATUT[v.statut]}</Pastille>
                        {LIB_PAIEMENT[v.paiement]}
                        {v.client_prenom ? ` · ${v.client_prenom}` : ''}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">{fcfa(v.total)}</p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-sourdine" aria-hidden="true" />
                </LienLigne>
              ))}
            </div>
          </>
        )}
      </Page>
    </>
  );
}
