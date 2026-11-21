# NAL’AARIS PERFUMES — catalogue avec commande WhatsApp

Site catalogue de parfums authentiques à Dakar, *by Yannick & Laetitia*.
React + Vite + TypeScript, Tailwind CSS, React Router, GSAP. Hébergement : Cloudflare Pages.

Node.js 24 requis. L’espace de gestion séparé se trouve sur `/admin` : D1, Pages Functions, Cloudflare Access et photos R2.

- [Guide d’utilisation](docs/guide-admin.md)
- [Installation et raccordement Cloudflare](docs/raccordement-cloudflare.md)
- [Rapport de reprise et contrôles](docs/rapport-reprise-admin.md)

## Lancer le projet

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de production dans dist/ (+ pages Open Graph des fiches)
npm run preview    # prévisualiser le build
npm run dev:admin  # interface admin Vite ; nécessite l’API sur le port 8788
npm run dev:api    # build complet avec les Functions, http://localhost:8788/admin
npm test           # tests API, sécurité et mouvements de stock sur SQLite isolé
npm run check:dist # contrôle des pages et fichiers après build
```

Variable optionnelle au build : `VITE_SITE_URL=https://www.mon-domaine.com` (URL utilisée dans les messages WhatsApp et les aperçus de partage).

## Modifier le catalogue

Les parfums viennent du catalogue de la cliente (`catalogue.json` + un visuel `<slug>.webp` par parfum) :

```bash
npm run import-catalogue -- "C:\Users\RYZEN  5\Downloads\img-nal\visuels"
```

L’import (relançable sans risque) génère `public/parfums/<slug>/480|800|1122.webp`, `src/data/catalogue.generated.ts`
et `docs/descriptions-a-valider.md`. Les styles (frais, fleuri…) sont déduits des notes par la table `STYLES_PAR_NOTE`
de `scripts/import-catalogue.mjs`, modifiable.

Ce que choisit la cliente se règle dans **`src/data/reglages-parfums.ts`** (jamais écrasé par l’import) :
`contenances` (avec `prix` en FCFA et `dispo` : `disponible`, `limite`, `epuise`), `nouveau`, `coupDeCoeur`,
`description` validée. Sans contenance, la fiche affiche « Prix et contenances sur demande » et la commande passe par WhatsApp.

Contacts, zones de livraison, retrait et paiement : **`src/data/infos.ts`** (les `TODO` sont visibles uniquement en mode développement).

## Déploiement Cloudflare Pages

- Commande de build : `npm run build` — dossier de sortie : `dist`.
- Une vraie `404.html` est pré-rendue. La seule réécriture concerne `/admin/*` vers `admin.html` ; une règle globale `/* /index.html 200` masquerait les pages pré-rendues et leurs aperçus WhatsApp / Instagram.

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
