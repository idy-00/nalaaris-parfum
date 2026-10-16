# NAL’AARIS PERFUMES — catalogue avec commande WhatsApp

Site catalogue de parfums authentiques à Dakar, *by Yannick & Laetitia*.
React + Vite + TypeScript, Tailwind CSS, React Router, GSAP (+ @gsap/react). Hébergement : Cloudflare Pages.

## Lancer le projet

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de production dans dist/ (+ pages Open Graph des fiches)
npm run preview    # prévisualiser le build
```

Variable optionnelle au build : `VITE_SITE_URL=https://www.mon-domaine.com` (URL utilisée dans les messages WhatsApp et les aperçus de partage).

## Modifier le catalogue

Tout se passe dans **`src/data/parfums.ts`** :

1. Copier un bloc parfum existant et changer `slug` (unique, sans accents ni espaces), `nom`, `marque`, `categorie`, `styles`, `description`, `notes`, `contenances`.
2. Photos : les déposer dans `public/parfums/<slug>/` (WebP, carré ou 4:5) et les lister dans `images`. Sans photo, un flacon dessiné s’affiche automatiquement.
3. Prix : ajouter `prix` (en FCFA) sur une contenance. Sans prix, le site affiche « Prix sur demande ».
4. Disponibilité par contenance : `disponible`, `limite` ou `epuise`.

Contacts, zones de livraison, retrait et paiement : **`src/data/infos.ts`** (les `TODO` sont visibles uniquement en mode développement).

## Déploiement Cloudflare Pages

- Commande de build : `npm run build` — dossier de sortie : `dist`.
- Pas de règle catch-all dans `public/_redirects` : Cloudflare Pages sert déjà `index.html` pour toute route inconnue (pas de `404.html` = mode SPA), et une règle `/* /index.html 200` masquerait les pages `dist/parfum/<slug>.html` qui portent les aperçus WhatsApp / Instagram.

## Pages

| URL | Contenu |
|---|---|
| `/` | Accueil : hero vidéo, humeurs, coups de cœur, aperçu de la maison, devise, étapes de commande |
| `/catalogue` | Tout le catalogue : recherche, filtres (dans l’URL : `?style=boise&cat=homme…`) |
| `/parfum/<slug>` | Fiche parfum : contenance, disponibilité, notes, commande WhatsApp, univers, suggestions |
| `/la-maison` | Yannick & Laetitia, engagements, devise, humeurs |
| `/commander` | Étapes, livraison / retrait / paiement, questions fréquentes, contact |

Chaque page a son aperçu de partage (WhatsApp, Instagram) généré au build, plus `sitemap.xml` et `robots.txt`.

## Médias

Photos d’ambiance et vidéo du hero dans `public/media/` : images libres (CC0 / domaine public, Wikimedia Commons) traitées en framboise pour la direction artistique, vidéo de fumée générée à partir de ces photos. Sources : `docs/credits-medias.txt`. À remplacer progressivement par des photos de la boutique et des flacons.

## Organisation

```
src/
  components/   Nav, Brume (fond animé), Panneau (tiroir accessible), CarteParfum, MaSelection, Monogramme…
  sections/     Hero, Humeurs, Catalogue, Manifeste, Commander, Infos
  pages/        Accueil, Fiche (/parfum/:slug), NotFound
  data/         parfums.ts, infos.ts
  hooks/        useSelection, useSeo, useReveal, useReflet, useFocusTrap
  lib/          whatsapp.ts (messages + buildWhatsAppLink), gsap.ts (plugins), catalogue.ts (filtres), storage.ts
scripts/        prerender-og.mjs (balises Open Graph par fiche)
```

Le modèle de données (`Parfum`, `LigneSelection`, filtres sérialisés dans l’URL) est prêt pour brancher plus tard un questionnaire « conseiller », une boutique en ligne ou un espace d’administration.
