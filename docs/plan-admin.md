# Plan — Espace admin Nal'Aaris (point de contrôle 1)

Branche `admin`. Rien n'est codé tant que ce plan n'est pas validé.

## 0. Décisions à valider (avant tout)

| # | Sujet | Proposition |
|---|---|---|
| D1 | **Livraison / paiement affichés sur le site.** Le 16/10 tu avais décidé « aucun détail livraison/paiement/horaires sur le site ». Le §3.5 demande l'inverse. | Les réglages « Boutique » alimentent la page Commander et la FAQ **seulement quand ils sont remplis**. Vides → textes actuels (« on s'organise sur WhatsApp »). |
| D2 | **Lecture de D1 au build.** Le build Cloudflare Pages n'a pas accès aux bindings D1. | `prerender.mjs` lit `GET {SITE_URL}/api/public/catalogue?complet=1` (site en prod, déjà branché sur D1). Pas de secret dans le build. Repli sur les fichiers si l'appel échoue (et un avertissement dans le log). Alternative : API REST D1 + jeton en lecture seule. |
| D3 | **Stock public.** | L'API publique expose le **statut** (disponible / stock limité / épuisé / sur commande), jamais la quantité ni le prix d'achat. |
| D4 | **Une vente = plusieurs parfums ?** | Table `lignes_vente` (plusieurs parfums possibles), mais le formulaire montre 1 parfum par défaut + lien « Ajouter un autre parfum ». La saisie reste sous 15 s. |
| D5 | **Limitation de débit de `/api/evt`.** Le pare-feu (WAF) Cloudflare ne s'applique pas à `*.pages.dev`. | Dans le code : compteur en mémoire par empreinte temporaire (hash IP + sel du jour, **jamais stockée**), 30 évts/min, + plafond global 20 000 évts/jour. Robots ignorés (User-Agent). Honnête : un attaquant déterminé peut gonfler les stats, pas plus. |
| D6 | **« Me prévenir »** passe aujourd'hui par WhatsApp. | On garde WhatsApp, et on ajoute un petit formulaire facultatif « Laisse ton numéro » avec mention claire (finalité, durée 6 mois, suppression sur demande). |
| D7 | **Disponibilité.** | Calculée seule depuis le stock (0 → épuisé, ≤ seuil → stock limité, sinon disponible), sauf si on force « Sur commande ». Nouveau statut `sur_commande` ajouté au site. |
| D8 | **Création des ressources.** | Tu lances `npx wrangler login` une fois : je crée moi-même D1 et R2 en ligne de commande. Il te reste à faire seulement Access, le deploy hook et les variables (§5). |

## 1. Schéma D1 (`migrations/0001_init.sql`)

Montants en FCFA entiers. Dates en ISO UTC, affichées en Africa/Dakar (= UTC toute l'année, pas d'heure d'été).

```
parfums
  slug TEXT PK
  marque, nom, nom_public, concentration, categorie ('femme'|'homme'|'unisexe')
  styles TEXT (JSON)            -- ambiances
  description TEXT              -- validée / modifiée dans l'admin
  description_import TEXT       -- celle de l'import (jamais affichée si description existe)
  notes, ingredients, images TEXT (JSON)   -- possédés par l'import
  porter TEXT (JSON)            -- « Quand le porter »
  nouveau, coup_de_coeur, masque INTEGER 0/1
  statut TEXT  'publie' | 'visuel_a_creer'
  photo_r2 TEXT                 -- photo envoyée depuis l'admin (clé R2)
  source TEXT 'import' | 'admin'
  ordre INTEGER, cree_le, maj_le, maj_par
  INDEX (marque), INDEX (statut, masque)

contenances
  id INTEGER PK
  slug → parfums ON DELETE CASCADE
  ml INTEGER                    -- 30,50,75,80,90,100,200 ou autre (1..1000) ; 0 = « à préciser »
  prix_vente INTEGER NULL       -- NULL = « Demander le prix »
  prix_achat INTEGER NULL       -- jamais public
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
  seuil_alerte INTEGER NOT NULL DEFAULT 2
  dispo_force TEXT NULL         -- 'sur_commande' | 'epuise' | NULL (= calcul auto)
  ordre INTEGER, maj_le, maj_par
  UNIQUE (slug, ml)

ventes
  id INTEGER PK
  date_vente TEXT, cree_le, cree_par
  statut TEXT 'a_livrer' | 'livree' | 'payee' | 'annulee'
  paiement TEXT 'wave' | 'orange_money' | 'especes' | 'autre'
  livraison TEXT 'retrait' | 'livraison'
  zone TEXT NULL, frais_livraison INTEGER DEFAULT 0
  client_prenom TEXT NULL, client_tel TEXT NULL   -- facultatifs, jamais exposés publiquement
  total INTEGER                 -- lignes + frais
  note TEXT NULL
  est_test INTEGER 0/1          -- données « TEST » de l'aperçu, purgées avant prod
  anonymise_le TEXT NULL
  INDEX (date_vente), INDEX (statut)

lignes_vente
  id PK, vente_id → ventes ON DELETE CASCADE
  slug, ml, quantite INTEGER CHECK (>0)
  prix_unitaire INTEGER, prix_achat_unitaire INTEGER NULL   -- figés au moment de la vente (marge juste)
  INDEX (vente_id), INDEX (slug)

evenements                       -- stats du site, sans cookie ni IP
  id PK
  type TEXT  vue_fiche | clic_commander | clic_whatsapp_general | recherche | ajout_selection | me_prevenir
  slug TEXT NULL, ml INTEGER NULL
  texte TEXT NULL               -- recherche normalisée (minuscules, sans accents, 60 car. max)
  nb_resultats INTEGER NULL
  appareil TEXT 'mobile'|'tablette'|'ordinateur'
  origine TEXT NULL             -- domaine du référent seulement (instagram.com…)
  cree_le TEXT
  INDEX (type, cree_le), INDEX (slug, type)
  Purge automatique > 13 mois.

alertes_stock                    -- « Me prévenir quand il revient » (numéro laissé volontairement)
  id PK, slug, ml NULL, prenom NULL, telephone TEXT, cree_le, prevenue_le NULL
  Purge > 6 mois.

reglages                         -- clé/valeur JSON
  cle TEXT PK ('boutique'), valeur TEXT (JSON), maj_le, maj_par
  boutique = { whatsapp, horaires, retrait: bool, paiements: [...], zones: [{nom, frais, delai}] }

avis
  id PK, prenom, ville, texte, note INTEGER NULL (1..5), date_avis
  accord_cliente INTEGER NOT NULL CHECK (accord_cliente = 1)  -- impossible d'enregistrer sans accord
  publie 0/1, cree_le, cree_par

journal
  id PK, quand, qui (prénom tiré de l'e-mail Access), action, entite, cle, champ, avant, apres
  INDEX (quand)
  ex. « Laetitia · 14/11 13:52 · Afnan 9pm 100 ml · prix : 25 000 → 27 000 »

publications
  id PK, quand, qui, statut ('envoyee'|'echec'), nb_changements
```

Règles écrites en SQL (pas seulement dans le code) :
- stock jamais négatif : `UPDATE contenances SET stock = stock - ?q WHERE id = ? AND stock >= ?q` + vérification `changes`, le tout dans un `db.batch()` (transaction) avec l'insertion de la vente ; sinon 409 « Stock insuffisant : il reste 1 flacon de 100 ml ».
- dernière écriture gagne + chaque écriture journalisée avec l'ancienne valeur lue dans la même transaction.

## 2. Routes API (`functions/`)

Public (sans auth, sans donnée perso) :
| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/public/catalogue` | slug → contenances (ml, prix, statut), nouveau, coup de cœur, masqué ; réglages boutique ; avis publiés. `Cache-Control: public, max-age=60` + cache edge 60 s. ~5 Ko gzip. |
| GET | `/api/public/catalogue?complet=1` | Même chose + descriptions, styles, porter, noms publics : utilisé par le build. |
| POST | `/api/evt` | `sendBeacon`, 204, validation stricte, robots ignorés, limitation de débit. |
| POST | `/api/public/prevenir` | Numéro laissé volontairement (validation format sénégalais, limitation de débit). |

Admin (`functions/api/admin/_middleware.ts` : vérifie le JWT `Cf-Access-Jwt-Assertion` — signature RS256 avec les clés de `https://<équipe>.cloudflareaccess.com/cdn-cgi/access/certs` mises en cache, `aud` = `ACCESS_AUD`, `exp`, e-mail ∈ `ADMIN_EMAILS` ; sinon 401) :
| Méthode | Route |
|---|---|
| GET | `/api/admin/moi` |
| GET | `/api/admin/accueil` (tous les chiffres du tableau de bord en 1 appel) |
| GET | `/api/admin/parfums?q=&filtre=sans_prix\|stock_bas\|epuise\|masque\|visuel&marque=&cat=` |
| GET / PATCH | `/api/admin/parfums/:slug` (fiche complète / champs modifiés seulement) |
| POST | `/api/admin/parfums` (nouveau → `visuel_a_creer`, masqué) |
| PUT / DELETE | `/api/admin/parfums/:slug/contenances/:ml` (prix, achat, stock, seuil, dispo forcée) |
| POST | `/api/admin/parfums/groupe` (sélection → même prix pour une contenance) |
| POST / GET | `/api/admin/photos` (envoi R2, image ≤ 5 Mo, jpeg/png/webp) · `/api/admin/photos/:cle` |
| GET | `/api/admin/visuels-a-creer.csv` |
| GET / POST | `/api/admin/ventes?periode=&statut=&paiement=` |
| PATCH | `/api/admin/ventes/:id` (stock rectifié selon la différence) |
| POST | `/api/admin/ventes/:id/annuler` (stock rétabli) |
| GET | `/api/admin/ventes.csv` (`;`, UTF-8 avec BOM) |
| GET / POST | `/api/admin/alertes` · `/api/admin/alertes/:id/prevenue` |
| GET / PUT | `/api/admin/reglages/boutique` |
| GET / POST / PATCH / DELETE | `/api/admin/avis[/:id]` |
| GET | `/api/admin/journal?page=` |
| GET / POST | `/api/admin/publier` (état + nb de changements depuis la dernière publication / appel du deploy hook) |
| GET | `/api/admin/export.json` (sauvegarde complète) |
| POST | `/api/admin/anonymiser` (ventes > 12 mois : prénom et téléphone effacés) |

Validation côté serveur pour tout : prix entier 0..10 000 000, ml 1..1000, quantité 1..50, téléphone `^(\+221)?7[05678]\d{7}$`, textes bornés, énumérations fermées. SQL toujours paramétré (`prepare().bind()`), aucun nom de colonne venu du client sans liste blanche.

## 3. Site public

- `npm run seed-d1` : lit `catalogue.generated.ts` + `reglages-parfums.ts` + `descriptions.ts` + `porter.ts` (Node 24 lit le TS), écrit un `.sql`, l'exécute via wrangler. Compte de contrôle à la fin (81 parfums, 81 conseils, styles corrigés, noms publics) : échec si un écart.
- `npm run import-catalogue` inchangé + upsert D1 qui ne touche **que** les colonnes de l'import (images, notes, ingrédients, description_import). Jamais prix, stock, description validée, réglages.
- `prerender.mjs` : source D1 (via l'API, D2) → pages, `og`, données structurées `offers` à jour.
- Côté client : après hydratation + `requestIdleCallback`, `fetch('/api/public/catalogue')` met à jour prix / statut sans saut de mise en page (emplacement du prix de hauteur fixe). Aucun appel avant le rendu critique.
- `src/lib/stats.ts` : `sendBeacon('/api/evt')`, sans cookie, rien si `navigator.webdriver`.
- CSP inchangée (`connect-src 'self'` suffit : tout est sur le même domaine, photos R2 servies par une Function). Le manifeste et l'admin restent `'self'`.
- Lighthouse mesuré avant/après sur l'aperçu en ligne (catalogue 90, fiche 94 à tenir).

## 4. Admin — maquettes texte (390 px)

App séparée : entrée Vite `admin.html` → `/admin`, **jamais chargée par le site public** (aucun octet en plus côté client). `_redirects` : `/admin/* /admin.html 200` (règle ciblée, pas de catch-all). `noindex`. PWA : `admin.webmanifest` (portée `/admin/`, icône monogramme), petit service worker pour l'installation. Barre du bas : Accueil · Catalogue · **＋ Vente** · Ventes · Plus. Zones tactiles ≥ 44 px. GSAP seulement : chiffres qui montent + apparition des cartes (désactivé si « réduire les animations »).

### 4.1 Accueil
```
┌────────────────────────────────────┐
│ Bonjour Laetitia   sam. 14 nov. ◐ │
├────────────────────────────────────┤
│ CETTE SEMAINE           vs préc.   │
│ ┌──────────┐ ┌──────────┐          │
│ │ 12       │ │ 310 000  │          │
│ │ ventes ▲3│ │ FCFA  ▲8%│          │
│ └──────────┘ └──────────┘          │
│ ┌──────────┐ ┌──────────┐          │
│ │ 47       │ │ 1 204    │          │
│ │ demandes │ │ vues     │          │
│ │ WhatsApp │ │ fiches   │          │
│ └──────────┘ └──────────┘          │
├────────────────────────────────────┤
│ À FAIRE MAINTENANT                 │
│ ● 67 parfums sans prix  Compléter ›│
│   ▓▓▓▓░░░░░░░░░░ 14/81             │
│ ● 3 livraisons aujourd'hui  Voir › │
│ ● 2 épuisés · 4 stock bas   Voir › │
│ ● Fatou attend 9pm (revenu) [WA ›] │
├────────────────────────────────────┤
│ LES PLUS DEMANDÉS · 30 j           │
│ 1 9pm Rebel      38 clics  ⚠ 0 en stock│
│ 2 Khamrah        21 clics  5 en stock  │
├────────────────────────────────────┤
│ ILS CHERCHENT, ON N'A PAS          │
│ baccarat rouge ........ 14  [+ Ajouter]│
│ sauvage ................ 9         │
├────────────────────────────────────┤
│ CE MOIS-CI                         │
│ 1 240 000 FCFA · 41 ventes         │
│ panier moyen 30 200 · marge 31 %   │
│ Wave 58 % · OM 30 % · Espèces 12 % │
│ ▁▃▂▅▇▂▁▄▆▃ … (barres, 30 jours)    │
└────────────────────────────────────┘
 Accueil  Catalogue  [＋]  Ventes  Plus
```

### 4.2 Catalogue
```
┌────────────────────────────────────┐
│ 🔍 Rechercher un parfum…           │
│ [Sans prix 67][Stock bas 4][Épuisés]│
│ [Masqués][Marque ▾][Catégorie ▾] ☐ │
├────────────────────────────────────┤
│ ▢ [img] Afnan · 9pm          ›     │
│        100 ml  [27 000 ] [ 3 ]     │
│        50 ml   [15 000 ] [ 0 ]Épuisé│
│ ▢ [img] Zara · Orchid  Sans prix › │
│        + Ajouter une contenance    │
└────────────────────────────────────┘
 Saisie directe → « Enregistré · Annuler (5 s) »
 Cases cochées → barre « 6 sélectionnés : même prix pour [100 ml ▾] [____] Appliquer »
 [＋ Ajouter un parfum] en haut
```
Fiche d'édition : contenances (prix, prix d'achat, stock, seuil, dispo), Nouveau / Coup de cœur / Masquer, description, ambiances, « Quand le porter ».

### 4.3 ＋ Vente
```
┌────────────────────────────────────┐
│ Nouvelle vente                     │
│ 🔍 Parfum…                         │
│ [9pm Rebel][Khamrah][Libre]… (top 5)│
│ Contenance  (50 ml) (●100 ml)      │
│ Prix  [ 27 000 ] FCFA  Qté [−] 1 [+]│
│ Paiement (●Wave)(OM)(Espèces)(Autre)│
│ (Retrait) (●Livraison) Zone [Almadies ▾] 2 000 │
│ Cliente (facultatif) [Prénom][Tél.]│
│ Statut (●À livrer)(Livrée)(Payée)  │
├────────────────────────────────────┤
│ Total 29 000 FCFA  [ Enregistrer ] │
└────────────────────────────────────┘
 Après : « Vente enregistrée · stock 100 ml : 3 → 2 »
         [Envoyer la confirmation sur WhatsApp]  [Nouvelle vente]
```

### 4.4 Ventes
```
[Aujourd'hui][Semaine][●Mois]  Statut ▾  Paiement ▾   [CSV]
14/11 13:52  9pm Rebel 100 ml ×1   29 000  Wave  À livrer ›
14/11 11:10  Libre 50 ml ×2        48 000  OM    Payée    ›
Total filtré : 77 000 FCFA · 2 ventes
Détail → Modifier · Marquer livrée/payée · Annuler (stock rétabli)
```

### 4.5 Plus
```
Boutique (WhatsApp, horaires, zones, paiements, retrait)  ›
Avis clients (2 publiés · 3 nécessaires pour l'affichage) ›
Publier sur le site · 12 changements en attente · dernière : 12/11 18:04 ›
Visuels à créer (2) · Exporter                           ›
Me prévenir (3 en attente)                               ›
Journal des modifications                                ›
Sauvegarde : JSON complet · CSV ventes                   ›
Données clientes : anonymiser les ventes > 12 mois       ›
Thème clair / sombre                                     ›
```

## 5. Ce que tu configures toi-même (pas à pas)

Prérequis : être connecté à https://dash.cloudflare.com avec le compte qui héberge `nalaaris-parfum`.

**Étape A — Connexion de wrangler (2 min)**
1. Dans Claude Code, tape : `! npx wrangler login`
2. Une page s'ouvre dans le navigateur → « Allow ». Je crée ensuite D1 (`nalaaris-prod`, `nalaaris-test`) et R2 (`nalaaris-photos`, `nalaaris-photos-test`) moi-même.
3. ⚠ R2 : Cloudflare demande d'**ajouter un moyen de paiement** pour activer R2, même dans l'offre gratuite (10 Go gratuits, on en utilisera quelques Mo). Menu **R2 Object Storage** → **Purchase R2 Plan** / activer. Rien n'est facturé sous le quota. Si tu refuses : les photos des nouveaux parfums passent par moi (Downloads), le reste fonctionne.

**Étape B — Cloudflare Access (10 min)**
1. Menu de gauche **Zero Trust**. Première fois : choisis un **nom d'équipe** (ex. `nalaaris`) → ton domaine d'équipe sera `nalaaris.cloudflareaccess.com`. Choisis l'offre **Free** (0 $, jusqu'à 50 utilisateurs ; une carte peut être demandée, rien n'est débité).
2. **Settings → Authentication → Login methods** : vérifie que **One-time PIN** est présent (c'est le code par e-mail).
3. **Access → Applications → Add an application → Self-hosted**.
   - Nom : `Nal'Aaris admin`. Session duration : **1 month** (pour ne pas retaper le code tous les jours sur le téléphone).
   - **Public hostname** (ajoute 4 lignes) :
     - `nalaaris-parfum.pages.dev` chemin `admin`
     - `nalaaris-parfum.pages.dev` chemin `api/admin`
     - `*.nalaaris-parfum.pages.dev` chemin `admin` (aperçus, dont la branche `admin`)
     - `*.nalaaris-parfum.pages.dev` chemin `api/admin`
   - **Policy** : nom `Équipe`, action **Allow**, règle **Include → Emails** : l'e-mail de Laetitia, celui de Yannick, le tien.
   - Enregistre. Dans la fiche de l'application, onglet **Overview** : copie l'**Application Audience (AUD) Tag** et envoie-le-moi.
4. Quand le vrai domaine arrivera, on ajoutera ses deux chemins à la même application.

**Étape C — Deploy hook (2 min)**
1. **Workers & Pages → nalaaris-parfum → Settings → Builds → Deploy hooks → Add deploy hook**.
2. Nom `admin-publier`, branche `main` → copie l'URL (secrète, ne la publie nulle part).
3. Refais-en un pour la branche `admin` (tests) : `admin-publier-test`.

**Étape D — Variables (5 min)**
**Workers & Pages → nalaaris-parfum → Settings → Variables and secrets**. Pour **Production** puis **Preview** :
| Nom | Type | Valeur |
|---|---|---|
| `ACCESS_TEAM_DOMAIN` | texte | `nalaaris.cloudflareaccess.com` |
| `ACCESS_AUD` | texte | le tag AUD de l'étape B |
| `ADMIN_EMAILS` | texte | `laetitia@…:Laetitia,yannick@…:Yannick,toi@…:Idy` (le prénom sert au journal) |
| `DEPLOY_HOOK_URL` | **secret** (Encrypt) | URL de l'étape C (prod → `admin-publier`, preview → `admin-publier-test`) |

Les liaisons D1 et R2 (nom `DB` et `PHOTOS`) seront déclarées dans un `wrangler.toml` du dépôt (prod → bases `prod`, aperçus → bases `test`) : rien à cliquer pour elles.

**Ce que je ne peux pas faire à ta place** : B, C, D (et le moyen de paiement R2). Tout le reste est dans le code.

## 6. Ordre de travail

1. ✅ Ce plan → 🛑 OK.
2. Migrations, `seed-d1`, API publique, branchement du site, `stats.ts`, Lighthouse avant/après → 🛑.
3. Admin : auth (middleware JWT + mode dev local avec clé de test), Catalogue, ＋ Vente, Ventes → 🛑 captures 390 px clair/sombre.
4. Accueil, événements, Plus (boutique, avis, publier, journal, export, anonymisation) → 🛑 captures.
5. Tests automatisés (`wrangler pages dev` + D1 local + `node --test`) : 401 sans jeton / jeton d'une autre audience / e-mail hors liste ; injection SQL dans la recherche ; vente sous zéro → 409 clair ; 2 modifications simultanées → la dernière gagne, les 2 dans le journal.
6. `docs/guide-admin.md` pour Laetitia, avec captures.

Données de test : uniquement dans `nalaaris-test`, ventes `est_test = 1` et préfixe « TEST » partout ; `npm run purge-test` avant la mise en production.
