import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { changerTheme, themeActuel } from '../theme';
import { EnTete, Interrupteur, LienLigne, Page, Section, useToast } from '../ui';

export function Plus() {
  const [sombre, setSombre] = useState(() => themeActuel() === 'sombre');
  const [action, setAction] = useState('');
  const toast = useToast();
  const agir = async (nom: string, f: () => Promise<void>) => {
    if (action) return;
    setAction(nom);
    try { await f(); } catch (e) { toast((e as Error).message, { type: 'erreur' }); }
    finally { setAction(''); }
  };
  return <>
    <EnTete titre="Plus" sousTitre="La boutique au quotidien" />
    <Page className="admin-grille">
      <Section titre="La boutique"><div className="carte divide-y divide-encre/10">
        <LienLigne to="/admin/plus/boutique">Informations, livraison et paiement <span className="ml-auto">›</span></LienLigne>
        <LienLigne to="/admin/plus/avis">Avis clients <span className="ml-auto">›</span></LienLigne>
        <LienLigne to="/admin/plus/alertes">Retours en stock — clientes à prévenir <span className="ml-auto">›</span></LienLigne>
        <LienLigne to="/admin/plus/journal">Journal des modifications <span className="ml-auto">›</span></LienLigne>
      </div></Section>
      <Section titre="Publication automatique"><div className="carte space-y-3 p-4"><p>Les fiches, prix, photos et informations enregistrés sont lus directement par le site. Aucun lancement manuel n’est nécessaire.</p><Link to="/catalogue" className="btn btn-trait" target="_blank">Voir le catalogue public</Link></div></Section>
      <Section titre="Sauvegardes et fichiers"><div className="carte flex flex-col gap-3 p-4">
        <button className="btn btn-trait" disabled={!!action} onClick={() => void agir('json', () => api.telecharger('export.json', 'nalaaris-sauvegarde.json'))}>Télécharger la sauvegarde complète</button>
        <p className="text-sm text-sourdine">Elle contient les coordonnées des clientes. Garde-la dans un endroit privé.</p>
        <button className="btn btn-trait" disabled={!!action} onClick={() => void agir('csv', () => api.telecharger('ventes.csv?periode=tout&annulees=1', 'nalaaris-ventes.csv'))}>Exporter toutes les ventes (CSV)</button>
      </div></Section>
      <Section titre="Données clientes"><div className="carte space-y-3 p-4">
        <p className="text-sm text-sourdine">Efface le prénom, le téléphone et les notes des ventes de plus de 12 mois, ainsi que leurs anciennes coordonnées dans le journal. Les montants et les produits sont conservés.</p>
        <button className="btn btn-danger w-full" disabled={!!action} onClick={() => {
          if (!confirm('Effacer définitivement les coordonnées des ventes de plus de 12 mois ?')) return;
          void agir('anonymiser', async () => { const r = await api.post<{ n: number }>('anonymiser'); toast(`${r.n} vente(s) anonymisée(s)`); });
        }}>Anonymiser les anciennes ventes</button>
      </div></Section>
      <Section titre="Affichage"><div className="carte px-4"><Interrupteur libelle="Thème sombre" actif={sombre} onChange={(v) => { setSombre(v); changerTheme(v ? 'sombre' : 'clair'); }} /></div></Section>
      <div className="mt-6 flex flex-wrap gap-3"><Link to="/" className="btn btn-trait">Voir le site</Link><button type="button" className="btn btn-trait" disabled={!!action} onClick={() => void agir('deconnexion', async () => {
        const r = await fetch('/api/auth/logout', { method: 'POST', headers: { 'X-Nalaaris': '1' }, credentials: 'same-origin' });
        if (!r.ok) throw new Error('Déconnexion impossible. Réessaie.');
        window.dispatchEvent(new Event('nalaaris:deconnexion'));
      })}>Se déconnecter</button></div>
    </Page>
  </>;
}
