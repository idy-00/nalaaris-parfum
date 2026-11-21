/** Table des routes /api/admin/* — « :x » = segment, « *x » = reste du chemin. */
import * as cat from './catalogue';
import * as div from './divers';
import * as tab from './tableau';
import * as ven from './ventes';
import type { Handler } from './commun';

const ROUTES: [string, string, Handler][] = [
  ['GET', 'moi', div.moi],
  ['GET', 'accueil', tab.accueil],
  ['GET', 'parfums', cat.lister],
  ['POST', 'parfums', cat.creer],
  ['POST', 'parfums/groupe', cat.groupe],
  ['GET', 'parfums/:slug', cat.lire],
  ['PATCH', 'parfums/:slug', cat.modifier],
  ['PUT', 'parfums/:slug/contenances/:ml', cat.ecrireContenance],
  ['DELETE', 'parfums/:slug/contenances/:ml', cat.supprimerContenance],
  ['POST', 'photos', cat.envoyerPhoto],
  ['GET', 'photos/*cle', cat.lirePhoto],
  ['GET', 'visuels-a-creer.csv', cat.visuelsCsv],
  ['GET', 'ventes', ven.lister],
  ['POST', 'ventes', ven.creer],
  ['GET', 'ventes.csv', ven.exporterCsv],
  ['GET', 'ventes/top', ven.top],
  ['GET', 'ventes/:id', ven.lire],
  ['PATCH', 'ventes/:id', ven.modifier],
  ['POST', 'ventes/:id/annuler', ven.annuler],
  ['POST', 'anonymiser', ven.anonymiser],
  ['GET', 'alertes', div.listerAlertes],
  ['POST', 'alertes/:id/prevenue', div.alertePrevenue],
  ['DELETE', 'alertes/:id', div.supprimerAlerte],
  ['GET', 'reglages/boutique', div.lireReglages],
  ['PUT', 'reglages/boutique', div.ecrireReglages],
  ['GET', 'avis', div.listerAvis],
  ['POST', 'avis', div.creerAvis],
  ['PATCH', 'avis/:id', div.modifierAvis],
  ['DELETE', 'avis/:id', div.supprimerAvis],
  ['GET', 'journal', div.lireJournal],
  ['GET', 'publier', div.lirePublication],
  ['POST', 'publier', div.publier],
  ['GET', 'export.json', div.exporter],
];

export function trouverRoute(methode: string, segments: string[]): { handler: Handler; params: Record<string, string> } | null {
  for (const [m, motif, handler] of ROUTES) {
    if (m !== methode) continue;
    const parts = motif.split('/');
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.startsWith('*')) {
        if (i >= segments.length) ok = false;
        else params[p.slice(1)] = segments.slice(i).map(decodeURIComponent).join('/');
        break;
      }
      if (i >= segments.length) {
        ok = false;
        break;
      }
      if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(segments[i]);
      else if (p !== segments[i]) ok = false;
      if (!ok) break;
      if (i === parts.length - 1 && segments.length !== parts.length) ok = false;
    }
    if (ok) return { handler, params };
  }
  return null;
}
