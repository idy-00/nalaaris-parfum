/** Détail d'une vente : statut en un geste, modification (stock rectifié), annulation (stock rétabli). */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { api } from '../api';
import { dateHeure, fcfa, LIB_PAIEMENT, LIB_STATUT, lienWa, telAffiche } from '../format';
import type { Vente } from '../types';
import { ChampMontant, EnTete, ErreurBloc, Page, Pastille, Puces, Section, Squelette, useAction, useDonnees } from '../ui';
import { lienConfirmation } from './NouvelleVente';
import { tonStatut } from './Ventes';

export function DetailVente() {
  const { id = '' } = useParams();
  const { data: v, setData, erreur, recharger } = useDonnees<Vente>(`ventes/${id}`);
  const [edition, setEdition] = useState(false);
  const agir = useAction();

  if (erreur) return <Page><ErreurBloc message={erreur} reessayer={recharger} /></Page>;
  if (!v)
    return (
      <>
        <EnTete titre="Vente" retour="/admin/ventes" />
        <Page>
          <Squelette />
        </Page>
      </>
    );
  const annulee = v.statut === 'annulee';
  const statut = (s: Vente['statut']) => void agir(async () => setData(await api.patch<Vente>(`ventes/${v.id}`, { statut: s })), `Vente : ${LIB_STATUT[s].toLowerCase()}`);

  return (
    <>
      <EnTete titre={`Vente n° ${v.id}`} sousTitre={`${dateHeure(v.date_vente)}${v.cree_par ? ` · notée par ${v.cree_par}` : ''}`} retour="/admin/ventes" />
      <Page>
        <div className="carte p-4">
          <div className="flex items-center justify-between gap-3">
            <p className={`chiffre text-[2rem] ${annulee ? 'text-sourdine line-through' : ''}`}>{fcfa(v.total)}</p>
            <Pastille ton={tonStatut(v.statut)}>{LIB_STATUT[v.statut]}</Pastille>
          </div>
          <ul className="mt-3 divide-y divide-encre/[0.06]">
            {v.lignes.map((l) => (
              <li key={`${l.slug}-${l.ml}`} className="flex min-h-[44px] items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {l.nom} {l.ml} ml
                  </span>
                  <span className="text-sm text-sourdine">
                    {l.marque} · {l.quantite} × {fcfa(l.prix_unitaire)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{fcfa(l.quantite * l.prix_unitaire)}</span>
              </li>
            ))}
            <li className="flex min-h-[44px] items-center justify-between gap-3 py-2 text-sourdine">
              <span>{v.livraison === 'livraison' ? `Livraison${v.zone ? ` · ${v.zone}` : ''}` : 'Retrait'}</span>
              <span className="tabular-nums">{fcfa(v.frais_livraison)}</span>
            </li>
          </ul>
          <p className="mt-2 text-sm text-sourdine">
            Paiement : <strong className="text-encre">{LIB_PAIEMENT[v.paiement]}</strong>
            {v.note ? ` · ${v.note}` : ''}
          </p>
        </div>

        {(v.client_prenom || v.client_tel) && (
          <Section titre="Cliente">
            <div className="carte flex items-center justify-between gap-3 p-4">
              <p>
                <span className="block font-medium">{v.client_prenom ?? '—'}</span>
                <span className="text-sm text-sourdine">{telAffiche(v.client_tel)}</span>
              </p>
              {v.client_tel && (
                <a href={lienWa(v.client_tel, `Bonjour${v.client_prenom ? ` ${v.client_prenom}` : ''}, `)} target="_blank" rel="noopener noreferrer" className="btn btn-wa min-h-[44px] px-4">
                  WhatsApp
                </a>
              )}
            </div>
          </Section>
        )}

        {!annulee && !edition && (
          <>
            <Section titre="Statut">
              <Puces label="Statut" valeur={v.statut} onChange={statut} options={[{ v: 'a_livrer', l: 'À livrer' }, { v: 'livree', l: 'Livrée' }, { v: 'payee', l: 'Payée' }]} />
            </Section>
            <div className="mt-6 grid gap-3">
              <a href={lienConfirmation(v)} target="_blank" rel="noopener noreferrer" className="btn btn-wa w-full">
                Envoyer la confirmation sur WhatsApp
              </a>
              <button type="button" onClick={() => setEdition(true)} className="btn btn-doux w-full">
                Modifier la vente
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!confirm(`Annuler la vente n° ${v.id} (${fcfa(v.total)}) ? Les flacons seront remis en stock.`)) return;
                  void agir(async () => setData(await api.post<Vente>(`ventes/${v.id}/annuler`)), 'Vente annulée · stock rétabli');
                }}
                className="btn btn-danger w-full"
              >
                Annuler la vente
              </button>
            </div>
          </>
        )}
        {edition && <Edition v={v} onFini={(n) => (setData(n), setEdition(false))} onAnnuler={() => setEdition(false)} />}
        {annulee && <p className="mt-6 text-center text-sm text-sourdine">Vente annulée : les flacons ont été remis en stock.</p>}
      </Page>
    </>
  );
}

function Edition({ v, onFini, onAnnuler }: { v: Vente; onFini: (v: Vente) => void; onAnnuler: () => void }) {
  const [lignes, setLignes] = useState(v.lignes.map((l) => ({ ...l })));
  const [f, setF] = useState({ paiement: v.paiement, livraison: v.livraison, zone: v.zone ?? '', frais: v.frais_livraison as number | null, prenom: v.client_prenom ?? '', tel: v.client_tel ?? '', note: v.note ?? '' });
  const agir = useAction();
  useEffect(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), []);
  const total = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0) + (f.livraison === 'livraison' ? (f.frais ?? 0) : 0);
  return (
    <form
      className="mt-6"
      onSubmit={(e) => {
        e.preventDefault();
        void agir(async () => {
          const n = await api.patch<Vente>(`ventes/${v.id}`, {
            lignes: lignes.map((l) => ({ slug: l.slug, ml: l.ml, quantite: l.quantite, prix_unitaire: l.prix_unitaire })),
            paiement: f.paiement,
            livraison: f.livraison,
            zone: f.zone || null,
            frais_livraison: f.frais ?? 0,
            client_prenom: f.prenom || null,
            client_tel: f.tel || null,
            note: f.note || null,
          });
          onFini(n);
        }, 'Vente modifiée · stock rectifié');
      }}
    >
      <Section titre="Parfums">
        <div className="carte divide-y divide-encre/[0.06]">
          {lignes.map((l, i) => (
            <div key={`${l.slug}-${l.ml}`} className="grid grid-cols-[1fr_auto] items-center gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {l.nom} {l.ml} ml
                </p>
                <ChampMontant valeur={l.prix_unitaire} onChange={(x) => setLignes((ls) => ls.map((y, j) => (j === i ? { ...y, prix_unitaire: x ?? 0 } : y)))} label="Prix unitaire" className="mt-2" />
              </div>
              <div className="flex items-center rounded-xl border border-encre/15">
                <button type="button" aria-label="Moins" disabled={l.quantite <= 1} onClick={() => setLignes((ls) => ls.map((y, j) => (j === i ? { ...y, quantite: y.quantite - 1 } : y)))} className="grid h-12 w-11 place-items-center disabled:opacity-30">
                  <Minus size={18} aria-hidden="true" />
                </button>
                <span className="w-7 text-center font-semibold tabular-nums">{l.quantite}</span>
                <button type="button" aria-label="Plus" onClick={() => setLignes((ls) => ls.map((y, j) => (j === i ? { ...y, quantite: y.quantite + 1 } : y)))} className="grid h-12 w-11 place-items-center">
                  <Plus size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section titre="Paiement et livraison">
        <Puces label="Paiement" valeur={f.paiement} onChange={(paiement) => setF({ ...f, paiement })} options={(['wave', 'orange_money', 'especes', 'autre'] as const).map((x) => ({ v: x, l: LIB_PAIEMENT[x] }))} />
        <Puces className="mt-3" label="Livraison" valeur={f.livraison} onChange={(livraison) => setF({ ...f, livraison })} options={[{ v: 'retrait', l: 'Retrait' }, { v: 'livraison', l: 'Livraison' }]} />
        {f.livraison === 'livraison' && (
          <div className="mt-3 grid grid-cols-[1fr_120px] gap-2">
            <input value={f.zone} onChange={(e) => setF({ ...f, zone: e.target.value })} placeholder="Zone" aria-label="Zone" className="champ" />
            <ChampMontant valeur={f.frais} onChange={(frais) => setF({ ...f, frais })} label="Frais de livraison" placeholder="Frais" />
          </div>
        )}
      </Section>
      <Section titre="Cliente et note">
        <div className="grid grid-cols-2 gap-2">
          <input value={f.prenom} onChange={(e) => setF({ ...f, prenom: e.target.value })} placeholder="Prénom" aria-label="Prénom" className="champ" />
          <input value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} placeholder="Téléphone" aria-label="Téléphone" inputMode="tel" className="champ" />
        </div>
        <input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Note (facultatif)" aria-label="Note" maxLength={300} className="champ mt-2" />
      </Section>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={onAnnuler} className="btn btn-trait">
          Ne pas modifier
        </button>
        <button type="submit" className="btn btn-rose">
          Enregistrer · {fcfa(total)}
        </button>
      </div>
    </form>
  );
}
