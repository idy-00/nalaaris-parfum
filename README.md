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

Tout se passe dans **`src/data/parfums.ts`** (tableau `vrais`) :

1. **Flacon** : déposer la photo produit (flacon + boîte, fond blanc) dans `scripts/photos-brutes/<slug>.png`, puis
   `python scripts/detourer.py <slug> --apercu` → `public/parfums/flacons/<slug>.webp` (détouré, 1000 px de haut).
   Si le flacon est à côté de sa boîte, ajouter son cadre dans `CADRES` (en haut du script). Contrôle visuel :
   `scripts/photos-brutes/_controle.png` (fond noir + fond blanc : pas de liseré, pas de reste de boîte).
   Dépendances : `pip install "rembg[cpu]" pillow numpy opencv-python-headless`.
2. **Données** : copier un bloc existant et changer `slug` (unique, sans accents ni espaces), `nom` (+ `sousNom`),
   `marque`, `type`, `famille`, `categorie`, `styles` (filtres), `description`, `notes` (tête / cœur / fond, ou `bouquet`),
   `flacon`, `halo` (lueur derrière le flacon), `ingredients` (6 gravures max, liste dans `src/lib/ingredients.ts`),
   `porter` (« Quand le porter ») et `contenances`.
3. **Prix** : ajouter `prix` (en FCFA) sur une contenance. Sans prix, le site affiche « Prix sur demande ».
4. **Disponibilité** par contenance : `disponible`, `limite` ou `epuise`.
5. **Visuels Instagram** : `npm run cartes` → `public/parfums/cartes/<slug>-clair.jpg` et `-sombre.jpg` (1080 × 1350).
   La version claire est aussi l’image de partage (WhatsApp, Instagram) de la fiche.

Les 12 parfums fictifs (`demo: true`) sont masqués par `AFFICHER_DEMO` dans `src/data/reglages.ts`.

> **Photos actuelles des 5 parfums** : ce sont des captures d’écran basse résolution (flacon ≈ 180 × 330 px,
> agrandi ×3). À remplacer par des photos HD fournies par la cliente : les déposer dans `scripts/photos-brutes/`
> sous le même nom, ajuster `CADRES` (et retirer les retouches `RETOUCHES`, propres aux captures), relancer
> `scripts/detourer.py` puis `npm run cartes`.

Contacts : **`src/data/infos.ts`** (les `TODO` sont visibles uniquement en mode développement).

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
| `/carte/<slug>?theme=clair\|sombre` | Carte parfum 1080 × 1350 pour Instagram (non indexée, sert à `npm run cartes`) |

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
