import { Suspense, useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BrumeProvider } from './components/Brume';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { MaSelection } from './components/MaSelection';
import { SelectionProvider } from './hooks/useSelection';
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
    <SelectionProvider>
      <BrumeProvider>
        <GestionDefilement />
        <Nav />
        <main id="contenu" tabIndex={-1} className="relative z-contenu outline-none">
          <TransitionPage>
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
          </TransitionPage>
        </main>
        <div className="relative z-contenu">
          <Footer />
        </div>
        <MaSelection page={pathname} />
      </BrumeProvider>
    </SelectionProvider>
  );
}
