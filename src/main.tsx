import { StrictMode, lazy, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/manrope/wght.css';
import './styles/index.css';
import { Coquille, rechargerUneFois, type Pages } from './App';
import { planifierGsap } from './lib/gsap';
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

/**
 * Laisse le navigateur peindre l'image principale (LCP) avant d'hydrater : sinon l'image, déjà téléchargée,
 * attend la fin de l'hydratation pour apparaître. Image décodée → deux frames → on continue. Plafond 1,5 s
 * (réseau lent : on n'attend pas l'image indéfiniment). Aucun changement visible : le HTML pré-rendu est déjà là.
 */
function imagePrincipalePeinte(): Promise<void> {
  // Première image prioritaire réellement affichée (l'en-tête du catalogue est masqué sur mobile)
  const img = [...document.querySelectorAll<HTMLImageElement>('#root img[fetchpriority="high"]')].find(
    (i) => i.getClientRects().length > 0,
  );
  if (!img) return Promise.resolve();
  const prete = img.complete ? Promise.resolve() : new Promise<void>((ok) => {
    img.addEventListener('load', () => ok(), { once: true });
    img.addEventListener('error', () => ok(), { once: true });
  });
  const peinte = prete
    .then(() => img.decode().catch(() => undefined))
    .then(() => new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok()))));
  return Promise.race([peinte, new Promise<void>((ok) => setTimeout(ok, 1500))]);
}

Promise.all([prechargement(window.location.pathname).catch(() => undefined), imagePrincipalePeinte()])
  .then(() => {
    // Hydratation en transition : React la découpe en tranches de quelques ms (pas de longue tâche au chargement).
    // Le HTML pré-rendu reste affiché et cliquable (liens) pendant ce temps.
    startTransition(() => {
      hydrateRoot(
        document.getElementById('root')!,
        <StrictMode>
          <BrowserRouter>
            <Coquille pages={pages} />
          </BrowserRouter>
        </StrictMode>,
      );
    });
    // Les animations arrivent après le premier affichage (voir lib/gsap.ts)
    planifierGsap();
  });
