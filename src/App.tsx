import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BrumeProvider } from './components/Brume';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { MaSelection } from './components/MaSelection';
import { SelectionProvider } from './hooks/useSelection';
import { Accueil } from './pages/Accueil';
import { NotFound } from './pages/NotFound';
import { gsap, useGSAP, ScrollTrigger, prefersReducedMotion } from './lib/gsap';
import { ROUTES } from './lib/routes';

// Pages intérieures chargées à la demande : l'accueil reste léger
const CataloguePage = lazy(() => import('./pages/CataloguePage').then((m) => ({ default: m.CataloguePage })));
const Fiche = lazy(() => import('./pages/Fiche').then((m) => ({ default: m.Fiche })));
const MaisonPage = lazy(() => import('./pages/MaisonPage').then((m) => ({ default: m.MaisonPage })));
const CommanderPage = lazy(() => import('./pages/CommanderPage').then((m) => ({ default: m.CommanderPage })));

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
      // Laisse la page (éventuellement chargée à la demande) se rendre avant de viser l'ancre
      const t = window.setTimeout(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: prefersReducedMotion() || changePage ? 'auto' : 'smooth' });
      }, changePage ? 250 : 0);
      return () => window.clearTimeout(t);
    }
    if (changePage) window.scrollTo(0, 0);
    ScrollTrigger.refresh();
  }, [pathname, hash, search]);

  // Focus sur le contenu principal après navigation (lecteurs d'écran)
  useEffect(() => {
    document.getElementById('contenu')?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}

/**
 * Transition entre pages : fondu d'opacité uniquement.
 * Pas de transform sur ce conteneur : il casserait les éléments position: fixed des pages (barre d'action de la fiche).
 */
function TransitionPage({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: prefersReducedMotion() ? 0.15 : 0.5, ease: 'power2.out', clearProps: 'opacity' });
    },
    { dependencies: [pathname] },
  );
  return <div ref={ref}>{children}</div>;
}

function Coquille() {
  const { pathname, hash } = useLocation();
  if (pathname === '/' && ANCRES[hash]) return <Navigate to={ANCRES[hash]} replace />;

  return (
    <>
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
      <MaSelection remonter={pathname.startsWith('/parfum/')} masquerEnHaut={pathname === ROUTES.accueil} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <SelectionProvider>
        <BrumeProvider>
          <Coquille />
        </BrumeProvider>
      </SelectionProvider>
    </BrowserRouter>
  );
}
