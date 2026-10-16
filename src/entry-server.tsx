/**
 * Pré-rendu statique (build) : chaque page est rendue en HTML pour que le texte s'affiche
 * avant le JavaScript (lisibilité immédiate, SEO, aperçus). Le client reprend ensuite la main.
 */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { Coquille, type Pages } from './App';
import { Accueil } from './pages/Accueil';
import { CataloguePage } from './pages/CataloguePage';
import { Fiche } from './pages/Fiche';
import { MaisonPage } from './pages/MaisonPage';
import { CommanderPage } from './pages/CommanderPage';
import { NotFound } from './pages/NotFound';

const pages: Pages = { Accueil, CataloguePage, Fiche, MaisonPage, CommanderPage, NotFound };

export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <Coquille pages={pages} />
    </StaticRouter>,
  );
}

export { parfums } from './data/parfums';
export { contacts, marque, SITE_URL } from './data/infos';
