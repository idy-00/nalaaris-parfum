/** Briques d'interface de l'admin : données, toasts (avec annulation), en-tête, puces, feuille, états vides. */
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, RotateCcw, X } from 'lucide-react';
import { api, ErreurApi } from './api';
import { nombre } from './format';

/* ---------- Données ---------- */

export function useDonnees<T>(chemin: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(!!chemin);
  const tour = useRef(0);
  const charger = useCallback(async () => {
    if (!chemin) return;
    const n = ++tour.current;
    setChargement(true);
    try {
      const d = await api.get<T>(chemin);
      if (n === tour.current) {
        setData(d);
        setErreur(null);
      }
    } catch (e) {
      if (n === tour.current) setErreur((e as Error).message);
    } finally {
      if (n === tour.current) setChargement(false);
    }
  }, [chemin]);
  useEffect(() => {
    setData(null);
    setErreur(null);
    void charger();
    return () => { tour.current++; };
  }, [charger]);
  return { data, setData, erreur, chargement, recharger: charger };
}

/* ---------- Toasts ---------- */

interface Toast {
  id: number;
  texte: string;
  type: 'ok' | 'erreur';
  annuler?: () => void | Promise<void>;
}
const CtxToast = createContext<(texte: string, o?: { type?: 'ok' | 'erreur'; annuler?: Toast['annuler'] }) => void>(() => undefined);
export const useToast = () => useContext(CtxToast);

export function FournisseurToasts({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fermer = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const toast = useCallback((texte: string, o: { type?: 'ok' | 'erreur'; annuler?: Toast['annuler'] } = {}) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, texte, type: o.type ?? 'ok', annuler: o.annuler }]);
    // 5 s : le temps d'annuler (consigne), un peu plus pour une erreur
    setTimeout(() => fermer(id), o.type === 'erreur' ? 7000 : 5000);
  }, []);
  return (
    <CtxToast.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-toast flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'erreur' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-lg ${
              t.type === 'erreur' ? 'bg-danger text-white' : 'bg-encre text-fond'
            }`}
          >
            {t.type === 'erreur' ? <AlertCircle size={18} aria-hidden="true" className="shrink-0" /> : <Check size={18} aria-hidden="true" className="shrink-0" />}
            <span className="flex-1">{t.texte}</span>
            {t.annuler && (
              <button
                type="button"
                onClick={async () => {
                  fermer(t.id);
                  await t.annuler!();
                }}
                className="-my-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 font-semibold underline-offset-4 hover:underline"
              >
                <RotateCcw size={16} aria-hidden="true" /> Annuler
              </button>
            )}
            <button type="button" onClick={() => fermer(t.id)} aria-label="Fermer" className="-my-2 -mr-2 grid h-11 w-11 place-items-center rounded-full opacity-70 hover:opacity-100">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </CtxToast.Provider>
  );
}

/** Lance une action, affiche l'erreur en toast. Retourne true si tout s'est bien passé. */
export function useAction() {
  const toast = useToast();
  return useCallback(
    async (f: () => Promise<unknown>, ok?: string) => {
      try {
        await f();
        if (ok) toast(ok);
        return true;
      } catch (e) {
        toast(e instanceof ErreurApi || e instanceof Error ? e.message : 'Erreur inattendue.', { type: 'erreur' });
        return false;
      }
    },
    [toast],
  );
}

/* ---------- Mise en page ---------- */

export function EnTete({ titre, sousTitre, retour, actions }: { titre: ReactNode; sousTitre?: ReactNode; retour?: string | true; actions?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-nav border-b border-encre/[0.06] bg-fond-2/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
      <div className="admin-largeur admin-entete flex min-h-[60px] items-center gap-2">
        {retour && (
          <button
            type="button"
            onClick={() => (retour === true ? navigate(-1) : navigate(retour))}
            aria-label="Retour"
            className="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-fond-3"
          >
            <ArrowLeft size={22} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0 flex-1 py-2">
          <h1 tabIndex={-1} className="text-[1.625rem] leading-tight outline-none md:text-3xl">{titre}</h1>
          {sousTitre && <p className="mt-1 text-sm text-sourdine">{sousTitre}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}

export const Page = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <main className={`admin-largeur admin-page pb-32 pt-4 md:pb-16 ${className}`}>{children}</main>
);

export function Section({ titre, action, children, className = '' }: { titre: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`mt-6 ${className}`}>
      <div className="mb-2 flex min-h-[32px] flex-wrap items-end justify-between gap-x-3 gap-y-1 px-1">
        <h2 className="label">{titre}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ---------- Contrôles ---------- */

export function Puces<T extends string | number>({
  options,
  valeur,
  onChange,
  label,
  className = '',
}: {
  options: { v: T; l: ReactNode }[];
  valeur: T | null;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex flex-wrap gap-2 ${className}`} onKeyDown={(e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const current = Math.max(0, options.findIndex((o) => o.v === valeur));
      const index = (current + (['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1) + options.length) % options.length;
      onChange(options[index].v);
      e.currentTarget.querySelectorAll<HTMLButtonElement>('button')[index]?.focus();
    }}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" role="radio" tabIndex={valeur === o.v || (valeur == null && o === options[0]) ? 0 : -1} aria-checked={valeur === o.v} onClick={() => onChange(o.v)} className="puce">
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function Interrupteur({ actif, onChange, libelle, aide }: { actif: boolean; onChange: (v: boolean) => void; libelle: string; aide?: string }) {
  return (
    <button type="button" role="switch" aria-checked={actif} onClick={() => onChange(!actif)} className="flex min-h-[52px] w-full items-center gap-3 text-left">
      <span className="flex-1">
        <span className="block font-medium">{libelle}</span>
        {aide && <span className="block text-sm text-sourdine">{aide}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${actif ? 'bg-rose' : 'bg-encre/20'}`} aria-hidden="true">
        <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${actif ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

/** Champ montant : chiffres seulement, espaces de milliers à l'affichage, clavier numérique. */
export function ChampMontant({
  valeur,
  onChange,
  label,
  id,
  placeholder = '—',
  className = '',
  onBlur,
}: {
  valeur: number | null;
  onChange: (v: number | null) => void;
  label: string;
  id?: string;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
}) {
  return (
    <input
      id={id}
      aria-label={label}
      inputMode="numeric"
      autoComplete="off"
      enterKeyHint="done"
      placeholder={placeholder}
      value={valeur == null ? '' : nombre(valeur)}
      onChange={(e) => {
        const chiffres = e.target.value.replace(/\D/g, '').slice(0, 8);
        onChange(chiffres === '' ? null : Number(chiffres));
      }}
      onFocus={(e) => e.target.select()}
      onBlur={onBlur}
      className={`champ-nb ${className}`}
    />
  );
}

/* ---------- Feuille (panneau du bas, mobile) ---------- */

export function Feuille({ ouverte, onFermer, titre, children }: { ouverte: boolean; onFermer: () => void; titre: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const fermer = useRef(onFermer);
  fermer.current = onFermer;
  useEffect(() => {
    if (!ouverte) return;
    const avant = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    const overflow = document.body.style.overflow;
    const echap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); fermer.current(); }
      if (e.key !== 'Tab') return;
      const items = [...(ref.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? [])].filter((el) => el.getClientRects().length > 0);
      const premier = items[0]; const dernier = items[items.length - 1];
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier?.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier?.focus(); }
    };
    document.addEventListener('keydown', echap);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', echap);
      document.body.style.overflow = overflow;
      avant?.focus?.();
    };
  }, [ouverte]);
  if (!ouverte) return null;
  return (
    <div className="fixed inset-0 z-feuille flex items-end justify-center md:items-center" role="presentation">
      <div className="absolute inset-0 bg-black/50" onClick={onFermer} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className="admin-dialogue safe-bas relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-fond px-4 pt-3 md:rounded-[24px] md:pb-4"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-encre/15 md:hidden" aria-hidden="true" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl">{titre}</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="-mr-2 grid h-11 w-11 place-items-center rounded-full hover:bg-fond-3">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- États ---------- */

export const Squelette = ({ lignes = 4 }: { lignes?: number }) => (
  <div className="space-y-3" aria-busy="true" aria-label="Chargement">
    {Array.from({ length: lignes }, (_, i) => (
      <div key={i} className="h-20 animate-pulse rounded-2xl bg-encre/[0.06]" />
    ))}
  </div>
);

export const ErreurBloc = ({ message, reessayer }: { message: string; reessayer: () => void }) => (
  <div role="alert" className="carte flex flex-col items-start gap-3 p-5">
    <p className="flex items-center gap-2 font-medium text-danger">
      <AlertCircle size={18} aria-hidden="true" /> {message}
    </p>
    <button type="button" onClick={reessayer} className="btn btn-trait">
      Réessayer
    </button>
  </div>
);

export const Vide = ({ titre, texte, action }: { titre: string; texte?: string; action?: ReactNode }) => (
  <div className="carte flex flex-col items-center gap-2 px-5 py-8 text-center">
    <p className="font-serif text-xl">{titre}</p>
    {texte && <p className="max-w-sm text-sm text-sourdine">{texte}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const Pastille = ({ children, ton = 'neutre' }: { children: ReactNode; ton?: 'neutre' | 'ok' | 'alerte' | 'epuise' | 'rose' }) => {
  const c = {
    neutre: 'bg-encre/[0.06] text-encre/80',
    ok: 'bg-dispo-ok/15 text-dispo-ok',
    alerte: 'bg-dispo-limite/15 text-dispo-limite',
    epuise: 'bg-encre/[0.08] text-sourdine',
    rose: 'bg-rose/10 text-rose-doux',
  }[ton];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${c}`}>{children}</span>;
};

export const LienLigne = ({ to, children, className = '' }: { to: string; children: ReactNode; className?: string }) => (
  <Link to={to} className={`flex min-h-[52px] items-center gap-3 px-4 py-2 transition-colors hover:bg-fond-3/60 ${className}`}>
    {children}
  </Link>
);

/* ---------- Chiffre animé (GSAP, seulement la valeur ; rien si « réduire les animations ») ---------- */

export function Chiffre({ valeur, format = nombre, className = '' }: { valeur: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const precedent = useRef(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const depart = precedent.current;
    precedent.current = valeur;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || depart === valeur) {
      el.textContent = format(valeur);
      return;
    }
    let annule = false;
    let tween: { kill: () => void } | undefined;
    void import('gsap').then(({ gsap }) => {
      if (annule) return;
      const o = { v: depart };
      tween = gsap.to(o, { v: valeur, duration: 0.7, ease: 'power3.out', onUpdate: () => (el.textContent = format(Math.round(o.v))) });
    });
    return () => {
      annule = true;
      tween?.kill();
      el.textContent = format(valeur);
    };
  }, [valeur, format]);
  return (
    <span ref={ref} className={className} aria-label={format(valeur)}>
      {format(valeur)}
    </span>
  );
}

/** Apparition des cartes (GSAP, une fois, courte) — l'interface reste utilisable pendant l'animation. */
export function useApparition(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!dep || !ref.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cibles = ref.current.querySelectorAll('[data-apparition]');
    let ctx: { revert: () => void } | undefined;
    void import('gsap').then(({ gsap }) => {
      ctx = gsap.context(() => gsap.from(cibles, { opacity: 0, y: 10, duration: 0.35, stagger: 0.04, ease: 'power2.out', clearProps: 'all' }));
    });
    return () => ctx?.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!dep]);
  return ref;
}
