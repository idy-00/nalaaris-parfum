import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { CATEGORIES, STYLES, marques, type Style } from '../data/parfums';
import { ecrireFiltres, filtrer, lireFiltres, nbFiltresActifs, type Filtres } from '../lib/catalogue';
import { CarteParfum } from '../components/CarteParfum';
import { Panneau } from '../components/Panneau';
import { IconeWhatsApp } from '../components/IconesReseaux';
import { buildWhatsAppLink, messageRecherche } from '../lib/whatsapp';
import { Flip, gsap, useGSAP, ScrollTrigger, MQ } from '../lib/gsap';

export function Catalogue() {
  const [params, setParams] = useSearchParams();
  const filtres = useMemo(() => lireFiltres(params), [params]);
  const resultats = useMemo(() => filtrer(filtres), [filtres]);
  const [panneau, setPanneau] = useState(false);
  const [saisie, setSaisie] = useState(filtres.q);
  const root = useRef<HTMLElement>(null);
  const grille = useRef<HTMLUListElement>(null);
  const etatFlip = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const derniereQ = useRef(filtres.q);

  /** Toute modification de filtre passe ici : on mémorise la grille avant le rendu pour l'animer avec Flip. */
  const appliquer = useCallback(
    (maj: Partial<Filtres>) => {
      if (grille.current) etatFlip.current = Flip.getState(grille.current.querySelectorAll('.carte'));
      setParams(ecrireFiltres({ ...lireFiltres(params), ...maj }), { replace: true, preventScrollReset: true });
    },
    [params, setParams],
  );

  // Recherche : synchronisée avec l'URL après une courte pause de frappe
  useEffect(() => {
    if (saisie === filtres.q) return;
    const t = window.setTimeout(() => {
      derniereQ.current = saisie;
      appliquer({ q: saisie });
    }, 220);
    return () => window.clearTimeout(t);
  }, [saisie, filtres.q, appliquer]);

  // Si la recherche change depuis l'extérieur (retour arrière, lien partagé), on resynchronise la saisie
  useEffect(() => {
    if (filtres.q !== derniereQ.current) {
      derniereQ.current = filtres.q;
      setSaisie(filtres.q);
    }
  }, [filtres.q]);

  // Entrée des cartes au défilement (une seule fois)
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.set('.carte', { opacity: 0, y: 24 });
        ScrollTrigger.batch('.carte', {
          start: 'top 92%',
          once: true,
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out', overwrite: true }),
        });
      });
    },
    { scope: root },
  );

  // Réorganisation douce de la grille au changement de filtre
  const cle = resultats.map((p) => p.slug).join('|');
  useGSAP(
    () => {
      const state = etatFlip.current;
      etatFlip.current = null;
      if (!state || !grille.current) return;
      const cartes = grille.current.querySelectorAll<HTMLElement>('.carte');
      if (window.matchMedia(MQ.reduce).matches) {
        gsap.fromTo(cartes, { opacity: 0 }, { opacity: 1, y: 0, duration: 0.25 });
        return;
      }
      Flip.from(state, {
        targets: cartes,
        duration: 0.55,
        ease: 'power3.out',
        absolute: true,
        nested: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.96, y: 0 }, { opacity: 1, scale: 1, duration: 0.45 }),
        onComplete: () => ScrollTrigger.refresh(),
      });
    },
    { scope: root, dependencies: [cle] },
  );

  const toggleStyle = (s: Style) =>
    appliquer({ styles: filtres.styles.includes(s) ? filtres.styles.filter((x) => x !== s) : [...filtres.styles, s] });
  const toutEffacer = () => {
    setSaisie('');
    derniereQ.current = '';
    appliquer({ q: '', cat: null, styles: [], marque: null, dispo: false });
  };
  const nbActifs = nbFiltresActifs(filtres);

  const controles = (idMarque: string) => (
    <div className="space-y-7 lg:flex lg:flex-wrap lg:items-end lg:gap-x-10 lg:gap-y-5 lg:space-y-0">
      <fieldset>
        <legend className="label mb-3 text-sourdine">Pour qui</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="puce" aria-pressed={!filtres.cat} onClick={() => appliquer({ cat: null })}>
            Tous
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="puce"
              aria-pressed={filtres.cat === c.id}
              onClick={() => appliquer({ cat: filtres.cat === c.id ? null : c.id })}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label mb-3 text-sourdine">Style d’odeur</legend>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              className="puce"
              aria-pressed={filtres.styles.includes(s.id)}
              onClick={() => toggleStyle(s.id)}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: s.teinte }} aria-hidden="true" />
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-6 sm:grid-cols-2 lg:flex lg:items-end lg:gap-8">
        <div>
          <label htmlFor={idMarque} className="label mb-3 block text-sourdine">
            Marque
          </label>
          <select
            id={idMarque}
            value={filtres.marque ?? ''}
            onChange={(e) => appliquer({ marque: e.target.value || null })}
            className="min-h-[44px] w-full rounded-full border border-encre/15 bg-fond-2 px-4 text-base text-encre lg:w-56"
          >
            <option value="">Toutes les marques</option>
            {marques().map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={filtres.dispo}
          onClick={() => appliquer({ dispo: !filtres.dispo })}
          className="puce justify-between gap-4 self-end"
        >
          Disponibles uniquement
          <span
            className={`relative h-5 w-9 rounded-full transition-colors ${filtres.dispo ? 'bg-rose' : 'bg-encre/20'}`}
            aria-hidden="true"
          >
            <span
              className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgba(43,22,32,0.35)] transition-transform ${
                filtres.dispo ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <section ref={root} id="catalogue" aria-label="Recherche et filtres du catalogue" className="shell relative pb-20 pt-2 md:pb-28">

      {/* Barre de recherche + accès filtres */}
      <div className="verre-fume sticky top-[calc(var(--nav-h)+20px)] z-contenu mb-6 flex items-center gap-2 rounded-full p-1.5">
        <label htmlFor="recherche" className="sr-only">
          Rechercher un parfum ou une marque
        </label>
        <Search size={18} strokeWidth={1.5} className="ml-3 shrink-0 text-sourdine" aria-hidden="true" />
        <input
          id="recherche"
          type="search"
          inputMode="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Nom ou marque…"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          className="min-h-[44px] w-full min-w-0 bg-transparent text-base text-encre placeholder:text-sourdine/80 focus:outline-none"
        />
        {saisie && (
          <button
            type="button"
            onClick={() => setSaisie('')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sourdine hover:text-encre"
            aria-label="Effacer la recherche"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setPanneau(true)}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full bg-encre/10 px-4 text-sm font-semibold text-encre lg:hidden"
          aria-haspopup="dialog"
        >
          <SlidersHorizontal size={16} strokeWidth={1.5} />
          Filtres
          {nbActifs > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose px-1 text-xs text-white">{nbActifs}</span>
          )}
        </button>
      </div>

      {/* Desktop : filtres en rangée */}
      <div className="verre-carte mb-8 hidden rounded-card px-6 py-5 lg:block">{controles('filtre-marque')}</div>

      {/* Mobile : catégories en accès direct */}
      <div className="no-scrollbar -mx-5 mb-6 flex gap-2 overflow-x-auto px-5 lg:hidden">
        <button type="button" className="puce shrink-0" aria-pressed={!filtres.cat} onClick={() => appliquer({ cat: null })}>
          Tous
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className="puce shrink-0"
            aria-pressed={filtres.cat === c.id}
            onClick={() => appliquer({ cat: filtres.cat === c.id ? null : c.id })}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex min-h-[44px] items-center justify-between gap-4">
        <p className="text-sm text-sourdine" aria-live="polite">
          <span className="font-semibold text-encre">{resultats.length}</span> parfum{resultats.length > 1 ? 's' : ''}
        </p>
        {nbActifs + (filtres.q ? 1 : 0) > 0 && (
          <button type="button" onClick={toutEffacer} className="min-h-[44px] text-sm text-rose-doux underline-offset-4 hover:underline">
            Tout effacer
          </button>
        )}
      </div>

      {resultats.length > 0 ? (
        <ul ref={grille} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
          {resultats.map((p) => (
            <li key={p.slug} className="flex">
              <CarteParfum parfum={p} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="verre-rose mx-auto max-w-lg rounded-card px-6 py-12 text-center">
          <p className="font-serif text-2xl">Aucun parfum ne correspond…</p>
          <p className="mt-3 text-sourdine">
            Demande-nous directement sur WhatsApp, on te trouve ça.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={buildWhatsAppLink(messageRecherche(filtres.q))}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-rose"
            >
              <IconeWhatsApp /> Demander sur WhatsApp
            </a>
            <button type="button" onClick={toutEffacer} className="btn btn-verre">
              Voir tous les parfums
            </button>
          </div>
        </div>
      )}

      <Panneau
        id="filtres"
        titre="Filtres"
        ouvert={panneau}
        onClose={() => setPanneau(false)}
        pied={
          <div className="flex gap-3">
            <button type="button" className="btn btn-verre flex-1" onClick={toutEffacer}>
              Effacer
            </button>
            <button type="button" className="btn btn-rose flex-[2]" onClick={() => setPanneau(false)} data-autofocus>
              Voir {resultats.length} parfum{resultats.length > 1 ? 's' : ''}
            </button>
          </div>
        }
      >
        {controles('filtre-marque-panneau')}
      </Panneau>
    </section>
  );
}
