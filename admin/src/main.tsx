import { Component, StrictMode, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Plus, ReceiptText, Menu, ExternalLink } from 'lucide-react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/manrope/wght.css';
import './admin.css';
import { FournisseurToasts, Squelette, Page } from './ui';
import { appliquerTheme } from './theme';
import { Accueil } from './pages/Accueil';
import { Connexion } from './Connexion';

appliquerTheme();

// Une page ouverte avant un déploiement peut demander un ancien module supprimé.
// Relire une fois le HTML courant, sans boucle si la connexion reste coupée.
window.addEventListener('vite:preloadError', (e) => {
  try {
    const cle = 'nalaaris:admin-recharge';
    if (Date.now() - Number(sessionStorage.getItem(cle) || 0) < 15000) return;
    sessionStorage.setItem(cle, String(Date.now()));
    e.preventDefault();
    window.location.reload();
  } catch { /* Le filet d’erreur propose encore un rechargement manuel. */ }
});

class FiletErreur extends Component<{ children: ReactNode }, { erreur: boolean }> {
  state = { erreur: false };
  static getDerivedStateFromError() { return { erreur: true }; }
  render() {
    if (!this.state.erreur) return this.props.children;
    return <Page><div role="alert" className="carte grid gap-4 p-5"><h1 className="text-2xl">Un souci d’affichage</h1><p>Recharge l’espace de gestion pour réessayer.</p><button className="btn btn-rose" onClick={() => location.reload()}>Recharger</button><a className="btn btn-trait" href="/admin">Revenir à l’accueil</a></div></Page>;
  }
}

// Écrans chargés à la demande : l'accueil s'ouvre vite sur un téléphone
const Catalogue = lazy(() => import('./pages/Catalogue').then((m) => ({ default: m.Catalogue })));
const FicheParfum = lazy(() => import('./pages/FicheParfum').then((m) => ({ default: m.FicheParfum })));
const NouveauParfum = lazy(() => import('./pages/NouveauParfum').then((m) => ({ default: m.NouveauParfum })));
const NouvelleVente = lazy(() => import('./pages/NouvelleVente').then((m) => ({ default: m.NouvelleVente })));
const Ventes = lazy(() => import('./pages/Ventes').then((m) => ({ default: m.Ventes })));
const DetailVente = lazy(() => import('./pages/DetailVente').then((m) => ({ default: m.DetailVente })));
const Plus_ = lazy(() => import('./pages/Plus').then((m) => ({ default: m.Plus })));
const BoutiquePage = lazy(() => import('./pages/BoutiquePage').then((m) => ({ default: m.BoutiquePage })));
const AvisPage = lazy(() => import('./pages/AvisPage').then((m) => ({ default: m.AvisPage })));
const JournalPage = lazy(() => import('./pages/JournalPage').then((m) => ({ default: m.JournalPage })));
const AlertesPage = lazy(() => import('./pages/AlertesPage').then((m) => ({ default: m.AlertesPage })));

const ONGLETS = [
  { to: '/admin', l: 'Accueil', i: Home, fin: true },
  { to: '/admin/catalogue', l: 'Catalogue', i: LayoutGrid },
  { to: '/admin/vente', l: 'Vente', i: Plus, principal: true },
  { to: '/admin/ventes', l: 'Ventes', i: ReceiptText },
  { to: '/admin/plus', l: 'Plus', i: Menu },
];

/** Barre du bas (mobile) / rail latéral (ordinateur). */
function Navigation() {
  return (
    <nav aria-label="Navigation principale" className="admin-navigation safe-bas">
      <a href="/admin" className="admin-marque" aria-label="Nal’Aaris — accueil de gestion"><span className="font-serif text-3xl text-rose-doux">Np</span><span className="admin-marque-texte"><span className="block font-serif text-xl">Nal’Aaris</span><span className="text-xs text-sourdine">Espace de gestion</span></span></a>
      <ul className="admin-onglets">
        {ONGLETS.map(({ to, l, i: Icone, fin, principal }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={fin}
              className={({ isActive }) =>
                `admin-lien group ${
                  isActive ? 'text-rose-doux' : 'text-sourdine hover:text-encre'
                }`
              }
            >
              {({ isActive }) =>
                principal ? (
                  <>
                    <span className="admin-icone-vente grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose text-white shadow-[0_8px_18px_-8px_rgba(168,18,79,0.8)] transition-transform group-active:scale-95">
                      <Icone size={24} strokeWidth={2.25} aria-hidden="true" />
                    </span>
                    <span className="admin-libelle-vente">Nouvelle vente</span>
                  </>
                ) : (
                  <>
                    <span className={`admin-icone grid h-8 w-14 shrink-0 place-items-center rounded-full transition-colors ${isActive ? 'bg-rose/10' : ''}`}>
                      <Icone size={22} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden="true" />
                    </span>
                    {l}
                  </>
                )
              }
            </NavLink>
          </li>
        ))}
      </ul>
      <a href="/" target="_blank" rel="noopener noreferrer" className="admin-voir-site"><ExternalLink size={18} aria-hidden="true" /><span>Voir la boutique</span></a>
    </nav>
  );
}

/** Changement d'écran : on remonte en haut et le focus va au titre (lecteurs d'écran). */
function AuChangement() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('main h1, header h1')?.focus?.());
  }, [pathname]);
  return null;
}

function App() {
  return (
    <FournisseurToasts>
      <AuChangement />
      <div className="admin-contenu">
        <Suspense
          fallback={
            <Page>
              <Squelette />
            </Page>
          }
        >
          <Routes>
            <Route path="/admin" element={<Accueil />} />
            <Route path="/admin/catalogue" element={<Catalogue />} />
            <Route path="/admin/catalogue/nouveau" element={<NouveauParfum />} />
            <Route path="/admin/catalogue/:slug" element={<FicheParfum />} />
            <Route path="/admin/vente" element={<NouvelleVente />} />
            <Route path="/admin/ventes" element={<Ventes />} />
            <Route path="/admin/ventes/:id" element={<DetailVente />} />
            <Route path="/admin/plus" element={<Plus_ />} />
            <Route path="/admin/plus/boutique" element={<BoutiquePage />} />
            <Route path="/admin/plus/avis" element={<AvisPage />} />
            <Route path="/admin/plus/journal" element={<JournalPage />} />
            <Route path="/admin/plus/alertes" element={<AlertesPage />} />
            <Route path="*" element={<Accueil />} />
          </Routes>
        </Suspense>
      </div>
      <Navigation />
    </FournisseurToasts>
  );
}

createRoot(document.getElementById('admin')!).render(
  <StrictMode>
    <BrowserRouter>
      <FiletErreur><Connexion><App /></Connexion></FiletErreur>
    </BrowserRouter>
  </StrictMode>,
);
