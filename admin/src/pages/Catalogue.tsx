/**
 * Catalogue : cartes compactes (mobile) / lignes (ordinateur). Prix et stock modifiables directement :
 * enregistrement automatique en quittant le champ, toast « Enregistré » avec annulation pendant 5 s.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckSquare, ChevronRight, Plus, Search, Square, X } from 'lucide-react';
import { api } from '../api';
import { fcfa, LIB_DISPO, nombre } from '../format';
import type { Contenance, ListeCatalogue, ParfumListe } from '../types';
import { ChampMontant, EnTete, ErreurBloc, Feuille, Page, Pastille, Puces, Squelette, Vide, useAction, useApparition, useDonnees, useToast } from '../ui';

export const ML_COURANTS = [30, 50, 75, 80, 90, 100, 200];
const FILTRES = [
  { v: '', l: 'Tous', c: 'total' },
  { v: 'sans_prix', l: 'Sans prix', c: 'sans_prix' },
  { v: 'stock_bas', l: 'Stock bas', c: 'stock_bas' },
  { v: 'epuise', l: 'Épuisés', c: 'epuise' },
  { v: 'masque', l: 'Masqués', c: 'masque' },
  { v: 'visuel', l: 'Visuels à créer', c: 'visuel' },
] as const;

export function tonDispo(d: Contenance['dispo']) {
  return d === 'disponible' ? 'ok' : d === 'limite' || d === 'sur_commande' ? 'alerte' : d === 'epuise' ? 'epuise' : 'neutre';
}

export function Catalogue() {
  const [params, setParams] = useSearchParams();
  const filtre = params.get('filtre') ?? '';
  const marque = params.get('marque') ?? '';
  const cat = params.get('cat') ?? '';
  const [saisie, setSaisie] = useState(params.get('q') ?? '');
  const [q, setQ] = useState(saisie);
  useEffect(() => {
    const t = setTimeout(() => setQ(saisie.trim()), 250);
    return () => clearTimeout(t);
  }, [saisie]);

  const chemin = `parfums?${new URLSearchParams(Object.entries({ q, filtre, marque, cat }).filter(([, v]) => v)).toString()}`;
  const { data, setData, erreur, chargement, recharger } = useDonnees<ListeCatalogue>(chemin);
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [groupe, setGroupe] = useState(false);
  const zone = useApparition(data);

  const changer = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  /** Met à jour une contenance dans la liste affichée (après enregistrement). */
  const majContenance = (c: Contenance) =>
    setData((d) =>
      d && {
        ...d,
        parfums: d.parfums.map((p) =>
          p.slug !== c.slug
            ? p
            : { ...p, contenances: p.contenances.some((x) => x.ml === c.ml) ? p.contenances.map((x) => (x.ml === c.ml ? c : x)) : [...p.contenances, c].sort((a, b) => a.ml - b.ml) },
        ),
      },
    );

  const total = data?.compteurs.total ?? 0;
  const avecPrix = total - (data?.compteurs.sans_prix ?? 0);

  return (
    <>
      <EnTete
        titre="Catalogue"
        sousTitre={data ? `${total} parfums · ${avecPrix} avec prix` : ' '}
        actions={
          <Link to="/admin/catalogue/nouveau" className="btn btn-doux min-h-[44px] px-4" aria-label="Ajouter un parfum">
            <Plus size={18} aria-hidden="true" /> <span className="hidden sm:inline">Ajouter</span>
          </Link>
        }
      />
      <Page>
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sourdine" aria-hidden="true" />
          <input
            type="search"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            placeholder="Rechercher un parfum, une marque…"
            aria-label="Rechercher un parfum"
            enterKeyHint="search"
            className="champ pl-10"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtres">
          {FILTRES.map((f) => {
            const n = data?.compteurs[f.c] ?? 0;
            if (f.v && f.v !== filtre && !n) return null;
            return (
              <button key={f.v} type="button" aria-pressed={filtre === f.v} onClick={() => changer('filtre', f.v)} className="puce min-h-[40px] px-3.5">
                {f.l}
                {f.v && <span className="tabular-nums opacity-80">{nombre(n)}</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select value={marque} onChange={(e) => changer('marque', e.target.value)} aria-label="Marque" className="champ">
            <option value="">Toutes les marques</option>
            {data?.marques.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select value={cat} onChange={(e) => changer('cat', e.target.value)} aria-label="Catégorie" className="champ">
            <option value="">Femme, homme…</option>
            <option value="femme">Femme</option>
            <option value="homme">Homme</option>
            <option value="unisexe">Unisexe</option>
          </select>
        </div>

        {data && (
          <div className="mt-4 flex items-center justify-between gap-2 px-1">
            <p className="text-sm text-sourdine" aria-live="polite">
              {data.parfums.length} résultat{data.parfums.length > 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={() => setSelection(selection ? null : new Set())}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-3 text-sm font-semibold text-rose-doux hover:bg-fond-3"
            >
              {selection ? <X size={18} aria-hidden="true" /> : <CheckSquare size={18} aria-hidden="true" />}
              {selection ? 'Terminer' : 'Modifier plusieurs'}
            </button>
          </div>
        )}

        <div ref={zone} className="mt-2 space-y-3">
          {erreur && <ErreurBloc message={erreur} reessayer={recharger} />}
          {!data && chargement && <Squelette lignes={5} />}
          {data && !data.parfums.length && (
            <Vide titre="Aucun parfum" texte="Rien ne correspond à cette recherche ou à ces filtres." />
          )}
          {data?.parfums.map((p) => (
            <CarteCatalogue
              key={p.slug}
              parfum={p}
              onMaj={majContenance}
              selection={selection}
              basculer={() =>
                setSelection((s) => {
                  const n = new Set(s);
                  if (n.has(p.slug)) n.delete(p.slug);
                  else n.add(p.slug);
                  return n;
                })
              }
            />
          ))}
        </div>
      </Page>

      {selection && (
        <div className="fixed inset-x-0 bottom-[calc(60px+max(8px,env(safe-area-inset-bottom)))] z-barre px-3 md:bottom-4 md:left-24">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl bg-encre p-2 pl-4 text-fond shadow-xl">
            <p className="flex-1 text-sm font-semibold">
              {selection.size} sélectionné{selection.size > 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={() => setSelection(new Set(data?.parfums.map((p) => p.slug)))}
              className="min-h-[44px] rounded-full px-3 text-sm font-semibold underline-offset-4 hover:underline"
            >
              Tout
            </button>
            <button type="button" disabled={!selection.size} onClick={() => setGroupe(true)} className="btn btn-rose min-h-[44px]">
              Même prix…
            </button>
          </div>
        </div>
      )}
      <ModifGroupe
        ouverte={groupe}
        slugs={[...(selection ?? [])]}
        onFermer={() => setGroupe(false)}
        onFini={() => {
          setGroupe(false);
          setSelection(null);
          void recharger();
        }}
      />
    </>
  );
}

function CarteCatalogue({
  parfum: p,
  onMaj,
  selection,
  basculer,
}: {
  parfum: ParfumListe;
  onMaj: (c: Contenance) => void;
  selection: Set<string> | null;
  basculer: () => void;
}) {
  const [ajout, setAjout] = useState(false);
  const coche = selection?.has(p.slug);
  return (
    <article data-apparition className={`carte overflow-hidden ${coche ? 'ring-2 ring-rose' : ''}`}>
      <div className="flex items-center gap-3 p-3">
        {selection && (
          <button type="button" role="checkbox" aria-checked={!!coche} aria-label={`Sélectionner ${p.marque} ${p.nom}`} onClick={basculer} className="-ml-1 grid h-11 w-11 shrink-0 place-items-center text-rose-doux">
            {coche ? <CheckSquare size={24} aria-hidden="true" /> : <Square size={24} aria-hidden="true" />}
          </button>
        )}
        <Vignette parfum={p} />
        <Link to={`/admin/catalogue/${p.slug}`} className="flex min-h-[48px] min-w-0 flex-1 items-center gap-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold uppercase tracking-wider text-sourdine">{p.marque}</span>
            <span className="block truncate font-serif text-lg leading-snug">{p.nom}</span>
            <span className="mt-1 flex flex-wrap gap-1">
              {p.statut === 'visuel_a_creer' && <Pastille ton="rose">Visuel à créer</Pastille>}
              {!!p.masque && p.statut !== 'visuel_a_creer' && <Pastille>Masqué</Pastille>}
              {!!p.nouveau && <Pastille ton="rose">Nouveau</Pastille>}
              {!!p.coup_de_coeur && <Pastille ton="rose">Coup de cœur</Pastille>}
              {!p.contenances.some((c) => c.prix_vente != null) && <Pastille ton="alerte">Sans prix</Pastille>}
            </span>
          </span>
          <ChevronRight size={20} className="shrink-0 text-sourdine" aria-hidden="true" />
        </Link>
      </div>
      {p.contenances.length > 0 && (
        <div className="border-t border-encre/[0.06] bg-fond-2/50 px-3 py-1">
          <div className="grid grid-cols-[64px_1fr_76px] items-center gap-2 px-1 pt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-sourdine">
            <span>Format</span>
            <span>Prix (FCFA)</span>
            <span className="text-right">Stock</span>
          </div>
          {p.contenances.map((c) => (
            <LigneRapide key={c.ml} libelle={`${p.marque} ${p.nom}`} c={c} onMaj={onMaj} />
          ))}
        </div>
      )}
      <button type="button" onClick={() => setAjout(true)} className="flex min-h-[44px] w-full items-center gap-2 border-t border-encre/[0.06] px-4 text-sm font-semibold text-rose-doux hover:bg-fond-3/50">
        <Plus size={16} aria-hidden="true" /> {p.contenances.length ? 'Ajouter une contenance' : 'Mettre un prix'}
      </button>
      <AjoutContenance
        ouverte={ajout}
        onFermer={() => setAjout(false)}
        slug={p.slug}
        libelle={`${p.marque} ${p.nom}`}
        existantes={p.contenances.map((c) => c.ml)}
        onAjout={(c) => {
          onMaj(c);
          setAjout(false);
        }}
      />
    </article>
  );
}

export function Vignette({ parfum, taille = 56 }: { parfum: Pick<ParfumListe, 'vignette' | 'photo_r2' | 'nom'>; taille?: number }) {
  const src = parfum.vignette ?? (parfum.photo_r2 ? `/api/admin/photos/${parfum.photo_r2}` : null);
  return src ? (
    <img src={src} alt="" width={taille} height={taille * 1.25} loading="lazy" decoding="async" className="shrink-0 rounded-xl bg-fond-3 object-cover" style={{ width: taille, height: taille * 1.25 }} />
  ) : (
    <span className="grid shrink-0 place-items-center rounded-xl bg-fond-3 font-serif text-xl text-rose-doux" style={{ width: taille, height: taille * 1.25 }} aria-hidden="true">
      {parfum.nom.slice(0, 1)}
    </span>
  );
}

/** Une contenance : prix et stock modifiables, enregistrés en quittant le champ (annulation 5 s). */
export function LigneRapide({ c, libelle, onMaj }: { c: Contenance; libelle: string; onMaj: (c: Contenance) => void }) {
  const [prix, setPrix] = useState<number | null>(c.prix_vente);
  const [stock, setStock] = useState<number | null>(c.stock);
  const toast = useToast();
  const agir = useAction();
  useEffect(() => {
    setPrix(c.prix_vente);
    setStock(c.stock);
  }, [c.prix_vente, c.stock]);

  const enregistrer = async (champs: Partial<Contenance>) => {
    const avant = { prix_vente: c.prix_vente, stock: c.stock };
    const cles = Object.keys(champs) as (keyof Contenance)[];
    if (cles.every((k) => champs[k] === c[k])) return;
    await agir(async () => {
      const maj = await api.put<Contenance>(`parfums/${c.slug}/contenances/${c.ml}`, champs);
      onMaj(maj);
      toast(`Enregistré · ${libelle} ${c.ml} ml`, {
        annuler: async () => {
          const retour = await api.put<Contenance>(`parfums/${c.slug}/contenances/${c.ml}`, Object.fromEntries(cles.map((k) => [k, avant[k as 'stock']])));
          onMaj(retour);
          toast('Modification annulée');
        },
      });
    });
  };

  return (
    <div className="ligne grid grid-cols-[64px_1fr_76px] items-center gap-2 py-2">
      <div className="px-1">
        <p className="font-semibold tabular-nums">{c.ml} ml</p>
        {c.dispo && <p className={`text-[0.6875rem] font-semibold ${c.dispo === 'epuise' ? 'text-sourdine' : c.dispo === 'disponible' ? 'text-dispo-ok' : 'text-dispo-limite'}`}>{LIB_DISPO[c.dispo]}</p>}
      </div>
      <ChampMontant valeur={prix} onChange={setPrix} onBlur={() => void enregistrer({ prix_vente: prix })} label={`Prix ${libelle} ${c.ml} ml`} placeholder="Prix" className="min-h-[44px]" />
      <input
        aria-label={`Stock ${libelle} ${c.ml} ml`}
        inputMode="numeric"
        enterKeyHint="done"
        placeholder="—"
        value={stock ?? ''}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 5);
          setStock(v === '' ? null : Number(v));
        }}
        onBlur={() => void enregistrer({ stock })}
        className="champ-nb min-h-[44px]"
      />
    </div>
  );
}

/** Nouvelle contenance : format courant en un geste, ou « Autre ». */
export function AjoutContenance({
  ouverte,
  onFermer,
  slug,
  libelle,
  existantes,
  onAjout,
}: {
  ouverte: boolean;
  onFermer: () => void;
  slug: string;
  libelle: string;
  existantes: number[];
  onAjout: (c: Contenance) => void;
}) {
  const [ml, setMl] = useState<number | 'autre' | null>(null);
  const [autre, setAutre] = useState('');
  const [prix, setPrix] = useState<number | null>(null);
  const [stock, setStock] = useState('');
  const agir = useAction();
  const mlFinal = ml === 'autre' ? Number(autre) : ml;
  const valide = !!mlFinal && mlFinal > 0 && mlFinal <= 1000 && !existantes.includes(mlFinal);
  useEffect(() => {
    if (ouverte) {
      setMl(null);
      setAutre('');
      setPrix(null);
      setStock('');
    }
  }, [ouverte]);
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre={`Contenance · ${libelle}`}>
      <form
        className="space-y-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valide) return;
          void agir(async () => {
            const c = await api.put<Contenance>(`parfums/${slug}/contenances/${mlFinal}`, { prix_vente: prix, stock: stock === '' ? null : Number(stock) });
            onAjout(c);
          }, `${mlFinal} ml ajouté`);
        }}
      >
        <fieldset>
          <legend className="label mb-2">Format</legend>
          <Puces
            label="Format"
            valeur={ml}
            onChange={setMl}
            options={[...ML_COURANTS.filter((m) => !existantes.includes(m)).map((m) => ({ v: m as number | 'autre', l: `${m} ml` })), { v: 'autre' as const, l: 'Autre' }]}
          />
          {ml === 'autre' && (
            <input autoFocus inputMode="numeric" value={autre} onChange={(e) => setAutre(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Contenance en ml" aria-label="Contenance en ml" className="champ mt-3" />
          )}
          {mlFinal && existantes.includes(mlFinal) ? <p className="mt-2 text-sm text-danger">Ce format existe déjà.</p> : null}
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label mb-1.5 block">Prix de vente</span>
            <ChampMontant valeur={prix} onChange={setPrix} label="Prix de vente" placeholder="FCFA" />
          </label>
          <label className="block">
            <span className="label mb-1.5 block">Stock</span>
            <input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Non suivi" className="champ-nb" />
          </label>
        </div>
        <p className="text-sm text-sourdine">Prix vide = « Demander le prix » sur le site. Stock vide = pas de badge de disponibilité.</p>
        <button type="submit" disabled={!valide} className="btn btn-rose w-full">
          Ajouter {mlFinal ? `${mlFinal} ml` : ''}
        </button>
      </form>
    </Feuille>
  );
}

/** Même prix pour une contenance sur tous les parfums sélectionnés. */
function ModifGroupe({ ouverte, slugs, onFermer, onFini }: { ouverte: boolean; slugs: string[]; onFermer: () => void; onFini: () => void }) {
  const [ml, setMl] = useState<number | null>(100);
  const [prix, setPrix] = useState<number | null>(null);
  const agir = useAction();
  const resume = useMemo(() => `${slugs.length} parfum${slugs.length > 1 ? 's' : ''}`, [slugs.length]);
  return (
    <Feuille ouverte={ouverte} onFermer={onFermer} titre={`Même prix · ${resume}`}>
      <div className="space-y-4 pb-2">
        <fieldset>
          <legend className="label mb-2">Contenance</legend>
          <Puces label="Contenance" valeur={ml} onChange={setMl} options={ML_COURANTS.map((m) => ({ v: m, l: `${m} ml` }))} />
        </fieldset>
        <label className="block">
          <span className="label mb-1.5 block">Prix de vente</span>
          <ChampMontant valeur={prix} onChange={setPrix} label="Prix de vente" placeholder="FCFA" />
        </label>
        <p className="text-sm text-sourdine">
          La contenance est créée si elle n’existe pas. Le stock n’est pas modifié. {prix != null && ml ? `${resume} à ${fcfa(prix)} en ${ml} ml.` : ''}
        </p>
        <button
          type="button"
          disabled={!ml || prix == null || !slugs.length}
          onClick={() => void agir(() => api.post('parfums/groupe', { slugs, ml, prix_vente: prix }), `Prix appliqué à ${resume}`).then((ok) => ok && onFini())}
          className="btn btn-rose w-full"
        >
          Appliquer à {resume}
        </button>
      </div>
    </Feuille>
  );
}
