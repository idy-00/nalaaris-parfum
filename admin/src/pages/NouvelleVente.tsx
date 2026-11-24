/**
 * + Vente — saisie en moins de 15 secondes, une seule page :
 * parfum (5 plus vendus en premier) → contenance (prix proposé) → quantité → paiement → livraison → cliente → statut.
 * Après l'enregistrement : stock baissé, bouton « Envoyer la confirmation sur WhatsApp » (rien n'est envoyé seul).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Minus, Plus, Search, Trash2, X } from 'lucide-react';
import { api } from '../api';
import { fcfa, LIB_PAIEMENT, lienWa, telAffiche } from '../format';
import type { Boutique, ListeCatalogue, ParfumListe, Vente } from '../types';
import { ChampMontant, EnTete, Page, Puces, Section, useAction, useDonnees } from '../ui';
import { ML_COURANTS, Vignette } from './Catalogue';

interface Ligne {
  parfum: ParfumListe;
  ml: number | null;
  prix: number | null;
  quantite: number;
}
type Resultat = Vente & { stocks: { slug: string; ml: number; avant: number | null; apres: number | null }[] };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '');

export function NouvelleVente() {
  const { data: cat, erreur: erreurCat, recharger: rechargerCat } = useDonnees<ListeCatalogue>('parfums');
  const { data: top } = useDonnees<{ slug: string }[]>('ventes/top');
  const { data: boutique } = useDonnees<Boutique>('reglages/boutique');
  const [params] = useSearchParams();
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [recherche, setRecherche] = useState(lignes.length === 0);
  const [paiement, setPaiement] = useState<Vente['paiement']>('wave');
  const [livraison, setLivraison] = useState<Vente['livraison']>('retrait');
  const [zone, setZone] = useState('');
  const [frais, setFrais] = useState<number | null>(null);
  const [prenom, setPrenom] = useState('');
  const [tel, setTel] = useState('');
  const [statut, setStatut] = useState<Vente['statut'] | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fini, setFini] = useState<Resultat | null>(null);
  const agir = useAction();

  // Lien direct depuis une fiche : /admin/vente?slug=…
  useEffect(() => {
    const s = params.get('slug');
    const p = s && cat?.parfums.find((x) => x.slug === s);
    if (p && !lignes.length) ajouter(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat]);

  const ajouter = (p: ParfumListe) => {
    const c = p.contenances.find((x) => x.dispo !== 'epuise' && x.prix_vente != null) ?? p.contenances[0];
    setLignes((l) => [...l, { parfum: p, ml: c?.ml ?? null, prix: c?.prix_vente ?? null, quantite: 1 }]);
    setRecherche(false);
  };
  const maj = (i: number, x: Partial<Ligne>) => setLignes((l) => l.map((y, j) => (j === i ? { ...y, ...x } : y)));

  const statutFinal = statut ?? (livraison === 'livraison' ? 'a_livrer' : 'payee');
  const fraisFinal = livraison === 'livraison' ? (frais ?? 0) : 0;
  const total = lignes.reduce((s, l) => s + (l.prix ?? 0) * l.quantite, 0) + fraisFinal;
  const pret = lignes.length > 0 && lignes.every((l) => l.ml && l.prix != null);

  const enregistrer = async () => {
    if (!pret) return setErreur('Choisis la contenance et le prix de chaque parfum.');
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await api.post<Resultat>('ventes', {
        lignes: lignes.map((l) => ({ slug: l.parfum.slug, ml: l.ml, quantite: l.quantite, prix_unitaire: l.prix })),
        paiement,
        livraison,
        zone: livraison === 'livraison' ? zone || null : null,
        frais_livraison: fraisFinal,
        client_prenom: prenom || null,
        client_tel: tel || null,
        statut: statutFinal,
      });
      setFini(r);
      window.scrollTo(0, 0);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const recommencer = () => {
    setLignes([]);
    setRecherche(true);
    setPrenom('');
    setTel('');
    setStatut(null);
    setFini(null);
    setZone('');
    setFrais(null);
    setLivraison('retrait');
  };

  if (fini) return <Confirmation vente={fini} recommencer={recommencer} />;

  return (
    <>
      <EnTete titre="Nouvelle vente" sousTitre="Commande reçue sur WhatsApp" />
      <Page className="admin-grille admin-vente pb-48">
        {erreurCat && <p role="alert" className="carte p-4 text-danger">{erreurCat} <button type="button" className="btn btn-trait" onClick={() => void rechargerCat()}>Réessayer</button></p>}
        {/* 1. Parfum(s) */}
        <Section titre="Parfum">
          <div className="space-y-3 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
            {lignes.map((l, i) => (
              <LigneSaisie key={i} l={l} onMaj={(x) => maj(i, x)} onRetirer={() => setLignes((ls) => ls.filter((_, j) => j !== i))} />
            ))}
          </div>
          {recherche || !lignes.length ? (
            <ChoixParfum parfums={cat?.parfums ?? null} top={top?.map((t) => t.slug) ?? []} onChoix={ajouter} onFermer={lignes.length ? () => setRecherche(false) : undefined} />
          ) : (
            <button type="button" onClick={() => setRecherche(true)} className="mt-2 inline-flex min-h-[44px] items-center gap-2 px-1 text-sm font-semibold text-rose-doux">
              <Plus size={16} aria-hidden="true" /> Ajouter un autre parfum
            </button>
          )}
        </Section>

        {lignes.length > 0 && (
          <>
            <Section titre="Paiement">
              <Puces label="Paiement" valeur={paiement} onChange={setPaiement} options={(['wave', 'orange_money', 'especes', 'autre'] as const).map((v) => ({ v, l: LIB_PAIEMENT[v] }))} />
            </Section>

            <Section titre="Livraison">
              <Puces label="Livraison" valeur={livraison} onChange={setLivraison} options={[{ v: 'retrait', l: 'Retrait' }, { v: 'livraison', l: 'Livraison' }]} />
              {livraison === 'livraison' && (
                <div className="mt-3 grid grid-cols-[1fr_120px] gap-2">
                  {boutique?.zones?.length ? (
                    <select
                      value={zone}
                      onChange={(e) => {
                        setZone(e.target.value);
                        const z = boutique.zones!.find((x) => x.nom === e.target.value);
                        if (z) setFrais(z.frais);
                      }}
                      aria-label="Zone de livraison"
                      className="champ"
                    >
                      <option value="">Zone…</option>
                      {boutique.zones.map((z) => (
                        <option key={z.nom} value={z.nom}>
                          {z.nom} · {fcfa(z.frais)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zone (ex. Almadies)" aria-label="Zone de livraison" className="champ" />
                  )}
                  <ChampMontant valeur={frais} onChange={setFrais} label="Frais de livraison" placeholder="Frais" />
                </div>
              )}
              {livraison === 'livraison' && !boutique?.zones?.length && (
                <p className="mt-2 text-sm text-sourdine">
                  Astuce : enregistre tes zones dans <Link to="/admin/plus/boutique" className="font-semibold text-rose-doux underline-offset-4 hover:underline">Plus → Boutique</Link> pour les avoir ici en un geste.
                </p>
              )}
            </Section>

            <Section titre="Cliente (facultatif)">
              <div className="grid grid-cols-2 gap-2">
                <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" aria-label="Prénom de la cliente" autoComplete="off" maxLength={40} className="champ" />
                <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="77 123 45 67" aria-label="Téléphone de la cliente" inputMode="tel" autoComplete="off" className="champ" />
              </div>
            </Section>

            <Section titre="Statut">
              <Puces label="Statut" valeur={statutFinal} onChange={setStatut} options={[{ v: 'a_livrer', l: 'À livrer' }, { v: 'livree', l: 'Livrée' }, { v: 'payee', l: 'Payée' }]} />
            </Section>
          </>
        )}
      </Page>

      {/* Total + Enregistrer : toujours à portée de pouce */}
      {lignes.length > 0 && (
        <div className="admin-barre-actions fixed inset-x-0 bottom-[calc(60px+max(8px,env(safe-area-inset-bottom)))] z-barre border-t border-encre/[0.08] bg-fond/95 px-4 py-3 backdrop-blur-sm md:bottom-0">
          <div className="admin-largeur">
            {erreur && (
              <p role="alert" className="mb-2 rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">
                {erreur}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[130px] flex-1">
                <p className="label">Total</p>
                <p className="chiffre text-[1.75rem]">{fcfa(total)}</p>
              </div>
              <button type="button" onClick={() => void agir(enregistrer)} disabled={envoi || !pret} className="btn btn-rose min-w-[150px]">
                {envoi ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ChoixParfum({ parfums, top, onChoix, onFermer }: { parfums: ParfumListe[] | null; top: string[]; onChoix: (p: ParfumListe) => void; onFermer?: () => void }) {
  const [q, setQ] = useState('');
  const resultats = useMemo(() => {
    if (!parfums) return [];
    const n = norm(q.trim());
    if (!n) return [];
    return parfums.filter((p) => norm(`${p.marque} ${p.nom}`).includes(n)).slice(0, 8);
  }, [parfums, q]);
  // Les 5 plus vendus ; à défaut (premières ventes), des parfums qui ont déjà un prix
  const proposes = useMemo(() => {
    if (!parfums) return [];
    const parTop = top.map((s) => parfums.find((p) => p.slug === s)).filter(Boolean) as ParfumListe[];
    return (parTop.length ? parTop : parfums.filter((p) => p.contenances.some((c) => c.prix_vente != null))).slice(0, 5);
  }, [parfums, top]);

  return (
    <div className="carte mt-2 p-3">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sourdine" aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher le parfum…" aria-label="Rechercher le parfum vendu" enterKeyHint="search" className="champ pl-10" />
        {onFermer && (
          <button type="button" onClick={onFermer} aria-label="Fermer la recherche" className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-sourdine">
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {!q.trim() && proposes.length > 0 && (
        <>
          <p className="label mb-2 mt-3 px-1">{top.length ? 'Les plus vendus' : 'Avec un prix'}</p>
          <div className="flex flex-wrap gap-2">
            {proposes.map((p) => (
              <button key={p.slug} type="button" onClick={() => onChoix(p)} className="puce max-w-full">
                <span className="truncate">{p.nom}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {q.trim() && (
        <ul className="mt-2" aria-label="Résultats">
          {resultats.map((p) => (
            <li key={p.slug}>
              <button type="button" onClick={() => onChoix(p)} className="flex min-h-[56px] w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-fond-3/60">
                <Vignette parfum={p} taille={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.nom}</span>
                  <span className="block truncate text-sm text-sourdine">
                    {p.marque} · {p.contenances.length ? p.contenances.map((c) => `${c.ml} ml`).join(', ') : 'sans prix'}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {!resultats.length && <li className="px-2 py-3 text-sm text-sourdine">Aucun parfum trouvé.</li>}
        </ul>
      )}
    </div>
  );
}

function LigneSaisie({ l, onMaj, onRetirer }: { l: Ligne; onMaj: (x: Partial<Ligne>) => void; onRetirer: () => void }) {
  const cs = l.parfum.contenances;
  const c = cs.find((x) => x.ml === l.ml);
  const options = cs.length ? cs.map((x) => x.ml) : ML_COURANTS;
  return (
    <div className="carte p-3">
      <div className="flex items-center gap-3">
        <Vignette parfum={l.parfum} taille={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-lg leading-tight">{l.parfum.nom}</p>
          <p className="truncate text-sm text-sourdine">{l.parfum.marque}</p>
        </div>
        <button type="button" onClick={onRetirer} aria-label={`Retirer ${l.parfum.nom}`} className="grid h-11 w-11 place-items-center rounded-full text-sourdine hover:text-danger">
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3">
        <Puces
          label="Contenance"
          valeur={l.ml}
          onChange={(ml) => onMaj({ ml, prix: cs.find((x) => x.ml === ml)?.prix_vente ?? l.prix })}
          options={options.map((ml) => {
            const x = cs.find((y) => y.ml === ml);
            return { v: ml, l: <>{ml} ml{x?.stock != null && <span className="opacity-70">· {x.stock}</span>}</> };
          })}
        />
        {c?.stock === 0 && <p className="mt-2 text-sm font-medium text-dispo-limite">Stock à 0 pour ce format : la vente sera refusée. Corrige le stock d’abord si un flacon est arrivé.</p>}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-3">
        <label className="block">
          <span className="label mb-1.5 block">Prix unitaire {c?.prix_vente != null && l.prix !== c.prix_vente ? '(remise)' : ''}</span>
          <ChampMontant valeur={l.prix} onChange={(prix) => onMaj({ prix })} label="Prix unitaire" placeholder="FCFA" />
        </label>
        <div>
          <span className="label mb-1.5 block text-center">Quantité</span>
          <div className="flex items-center rounded-xl border border-encre/15">
            <button type="button" aria-label="Moins" disabled={l.quantite <= 1} onClick={() => onMaj({ quantite: l.quantite - 1 })} className="grid h-12 w-11 place-items-center disabled:opacity-30">
              <Minus size={18} aria-hidden="true" />
            </button>
            <span className="w-7 text-center text-lg font-semibold tabular-nums" aria-live="polite">
              {l.quantite}
            </span>
            <button type="button" aria-label="Plus" disabled={l.quantite >= 50} onClick={() => onMaj({ quantite: l.quantite + 1 })} className="grid h-12 w-11 place-items-center disabled:opacity-30">
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Message de confirmation (sans emoji : la page de redirection de WhatsApp les abîme). */
export function messageConfirmation(v: Vente): string {
  const lignes = v.lignes.map((l) => `- ${l.marque ?? ''} ${l.nom ?? l.slug} ${l.ml} ml x${l.quantite} : ${fcfa(l.prix_unitaire * l.quantite)}`.replace(/\s+/g, ' '));
  return [
    `Bonjour${v.client_prenom ? ` ${v.client_prenom}` : ''}, merci pour ta commande chez Nal’Aaris Perfumes !`,
    '',
    ...lignes,
    v.livraison === 'livraison' ? `Livraison${v.zone ? ` ${v.zone}` : ''} : ${v.frais_livraison ? fcfa(v.frais_livraison) : 'offerte'}` : 'Retrait à la boutique',
    `Total : ${fcfa(v.total)}`,
    `Paiement : ${LIB_PAIEMENT[v.paiement]}${v.statut === 'payee' ? ' (reçu, merci)' : ''}`,
    '',
    'À très vite !',
  ].join('\n');
}

export const lienConfirmation = (v: Vente) =>
  v.client_tel ? lienWa(v.client_tel, messageConfirmation(v)) : `https://wa.me/?text=${encodeURIComponent(messageConfirmation(v))}`;

function Confirmation({ vente, recommencer }: { vente: Resultat; recommencer: () => void }) {
  return (
    <>
      <EnTete titre="Vente enregistrée" />
      <Page>
        <div className="carte flex flex-col items-center gap-2 p-6 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-dispo-ok/15 text-dispo-ok">
            <Check size={28} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <p className="chiffre mt-2 text-4xl">{fcfa(vente.total)}</p>
          <p className="text-sourdine">
            {LIB_PAIEMENT[vente.paiement]} · {vente.livraison === 'livraison' ? `livraison${vente.zone ? ` ${vente.zone}` : ''}` : 'retrait'}
            {vente.client_prenom ? ` · ${vente.client_prenom}` : ''}
          </p>
        </div>
        <Section titre="Stock">
          <ul className="carte divide-y divide-encre/[0.06]">
            {vente.stocks.map((s, i) => {
              const l = vente.lignes.find((x) => x.slug === s.slug && x.ml === s.ml) ?? vente.lignes[i];
              return (
                <li key={`${s.slug}-${s.ml}`} className="flex min-h-[52px] items-center justify-between gap-3 px-4">
                  <span className="min-w-0 truncate">
                    {l?.nom} {s.ml} ml
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{s.avant == null ? 'non suivi' : `${s.avant} → ${s.apres}`}</span>
                </li>
              );
            })}
          </ul>
        </Section>
        <div className="mt-6 grid gap-3">
          <a href={lienConfirmation(vente)} target="_blank" rel="noopener noreferrer" className="btn btn-wa w-full">
            Envoyer la confirmation sur WhatsApp
          </a>
          <p className="-mt-1 text-center text-sm text-sourdine">
            {vente.client_tel ? `Ouvre WhatsApp avec le récapitulatif pour ${telAffiche(vente.client_tel)}. Rien n’est envoyé sans toi.` : 'Sans numéro : WhatsApp te laisse choisir la conversation.'}
          </p>
          <button type="button" onClick={recommencer} className="btn btn-doux w-full">
            Nouvelle vente
          </button>
          <Link to="/admin/ventes" className="btn btn-trait w-full">
            Voir les ventes
          </Link>
        </div>
      </Page>
    </>
  );
}
