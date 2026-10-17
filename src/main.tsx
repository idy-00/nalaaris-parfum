import { StrictMode, lazy } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/manrope/wght.css';
import './styles/index.css';
import { Coquille, rechargerUneFois, type Pages } from './App';
import { Accueil } from './pages/Accueil';
import { NotFound } from './pages/NotFound';

// Après un nouveau déploiement, les fichiers JS de l'ancienne version n'existent plus :
// une page déjà ouverte qui en demande un se recharge au lieu de rester bloquée.
window.addEventListener('vite:preloadError', (e) => {
  if (rechargerUneFois()) e.preventDefault();
});

// Pages intérieures chargées à la demande : l'accueil reste léger
const chargeurs = {
  CataloguePage: () => import('./pages/CataloguePage').then((m) => ({ default: m.CataloguePage })),
  Fiche: () => import('./pages/Fiche').then((m) => ({ default: m.Fiche })),
  MaisonPage: () => import('./pages/MaisonPage').then((m) => ({ default: m.MaisonPage })),
  CommanderPage: () => import('./pages/CommanderPage').then((m) => ({ default: m.CommanderPage })),
};

const pages: Pages = {
  Accueil,
  NotFound,
  CataloguePage: lazy(chargeurs.CataloguePage),
  Fiche: lazy(chargeurs.Fiche),
  MaisonPage: lazy(chargeurs.MaisonPage),
  CommanderPage: lazy(chargeurs.CommanderPage),
};

/** Précharge la page courante avant d'hydrater : React reprend le HTML pré-rendu sans le reconstruire. */
function prechargement(chemin: string) {
  if (chemin.startsWith('/catalogue')) return chargeurs.CataloguePage();
  if (chemin.startsWith('/parfum/')) return chargeurs.Fiche();
  if (chemin.startsWith('/la-maison')) return chargeurs.MaisonPage();
  if (chemin.startsWith('/commander')) return chargeurs.CommanderPage();
  return Promise.resolve();
}

prechargement(window.location.pathname)
  .catch(() => undefined)
  .then(() => {
    hydrateRoot(
      document.getElementById('root')!,
      <StrictMode>
        <BrowserRouter>
          <Coquille pages={pages} />
        </BrowserRouter>
      </StrictMode>,
    );
  });
