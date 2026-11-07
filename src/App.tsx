import { Component, Suspense, useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BrumeProvider } from './components/Brume';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { MaSelection } from './components/MaSelection';
import { SelectionProvider } from './hooks/useSelection';
import { ThemeProvider } from './hooks/useTheme';
import { gsap, useGSAP, ScrollTrigger, prefersReducedMotion } from './lib/gsap';
import { ROUTES } from './lib/routes';

/** Les pages, fournies par le client (chargées à la demande) ou par le pré-rendu (imports directs). */
export interface Pages {
  Accueil: ComponentType;
  CataloguePage: ComponentType;
  Fiche: ComponentType;
  MaisonPage: ComponentType;
  CommanderPage: ComponentType;
  NotFound: ComponentType;
}

/** Anciennes ancres de la version une page → nouvelles pages (liens déjà partagés). */
const ANCRES: Record<string, string> = {
  '#catalogue': ROUTES.catalogue,
  '#infos': ROUTES.commander,
  '#commander': ROUTES.commander,
  '#maison': ROUTES.maison,
};

/** Défilement natif : ancre ou haut de page au changement de route. Pas de scroll-jacking. */
function GestionDefilement() {
  const { pathname, hash, search } = useLocation();
  const precedent = useRef(pathname);

  useEffect(() => {
    const changePage = precedent.current !== pathname;
    precedent.current = pathname;
    if (hash) {
      const t = window.setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: prefersReducedMotion() || changePage ? 'auto' : 'smooth' });
      }, changePage ? 250 : 0);
      return () => window.clearTimeout(t);
    }
    if (changePage) window.scrollTo(0, 0);
    ScrollTrigger.refresh();
  }, [pathname, hash, search]);

  // Focus sur le contenu principal après une navigation (lecteurs d'écran) — pas au premier affichage
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) {
      premier.current = false;
      return;
    }
    document.getElementById('contenu')?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}

/** Recharge la page une seule fois (garde en sessionStorage) : le HTML pré-rendu repart sur une base saine. */
export function rechargerUneFois() {
  try {
    const cle = 'nalaaris:recharge';
    const derniere = Number(sessionStorage.getItem(cle) || 0);
    if (Date.now() - derniere < 15000) return false;
    sessionStorage.setItem(cle, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/**
 * Filet de sécurité : une erreur dans une page (animation, chargement) ne doit jamais laisser
 * un écran vide. On recharge une fois ; si l'erreur revient, on propose des liens.
 */
class FiletErreur extends Component<{ cle: string; children: ReactNode }, { erreur: boolean }> {
  state = { erreur: false };
  static getDerivedStateFromError() {
    return { erreur: true };
  }
  componentDidCatch(e: unknown) {
    console.error(e);
    rechargerUneFois();
  }
  componentDidUpdate(prev: { cle: string }) {
    if (prev.cle !== this.props.cle && this.state.erreur) this.setState({ erreur: false });
  }
  render() {
    if (!this.state.erreur) return this.props.children;
    return (
      <div className="shell flex min-h-[70svh] flex-col items-start justify-center gap-6 pt-28">
        <h1 className="text-3xl">Un petit souci d’affichage.</h1>
        <p className="max-w-md text-lg text-encre/80">Recharge la page, ou repars de l’accueil.</p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-rose" onClick={() => window.location.reload()}>
            Recharger
          </button>
          <Link to={ROUTES.accueil} className="btn btn-trait">
            Accueil
          </Link>
        </div>
      </div>
    );
  }
}

/**
 * Transition entre pages : fondu d'opacité, seulement lors d'une navigation (pas au chargement :
 * le HTML pré-rendu est déjà affiché). Pas de transform : il casserait les éléments position: fixed.
 */
function TransitionPage({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const premier = useRef(true);
  useGSAP(
    () => {
      if (premier.current) {
        premier.current = false;
        return;
      }
      gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: prefersReducedMotion() ? 0.15 : 0.45, ease: 'power2.out', clearProps: 'opacity' });
    },
    { dependencies: [pathname] },
  );
  return <div ref={ref}>{children}</div>;
}

export function Coquille({ pages }: { pages: Pages }) {
  const { pathname, hash } = useLocation();
  if (pathname === ROUTES.accueil && ANCRES[hash]) return <Navigate to={ANCRES[hash]} replace />;
  const { Accueil, CataloguePage, Fiche, MaisonPage, CommanderPage, NotFound } = pages;

  return (
    <ThemeProvider>
    <SelectionProvider>
      <BrumeProvider>
        <GestionDefilement />
        <Nav />
        <main id="contenu" tabIndex={-1} className="relative z-contenu outline-none">
          <TransitionPage>
            <FiletErreur cle={pathname}>
            <Suspense fallback={<div className="min-h-[100svh]" aria-busy="true" />}>
              <Routes>
                <Route path={ROUTES.accueil} element={<Accueil />} />
                <Route path={ROUTES.catalogue} element={<CataloguePage />} />
                <Route path="/parfum/:slug" element={<Fiche />} />
                <Route path={ROUTES.maison} element={<MaisonPage />} />
                <Route path={ROUTES.commander} element={<CommanderPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </FiletErreur>
          </TransitionPage>
        </main>
        <div className="relative z-contenu">
          <Footer />
        </div>
        <MaSelection page={pathname} />
      </BrumeProvider>
    </SelectionProvider>
    </ThemeProvider>
  );
}
