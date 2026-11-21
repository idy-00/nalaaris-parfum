# Raccordement Cloudflare et vérification avant production

## État du raccordement au 21 novembre 2026

Les bases `nalaaris-prod` et `nalaaris-test` sont créées et leurs véritables identifiants sont dans `wrangler.toml`. Les deux migrations et les 81 parfums sont installés sur les deux bases. La production contient 81 parfums, deux migrations et six déclencheurs de stock. Le déploiement initial a réussi et l'API publique retourne les 81 parfums.

Le fichier `.node-version` impose Node.js 24. Les variables texte de production sont déclarées dans `wrangler.toml`, car elles remplacent celles du tableau de bord. Le mode temporaire `DONNEES_URL=aucune` a servi uniquement à publier la première API ; il est ensuite retiré pour reprendre le catalogue D1 aux prochains builds.

Les deux secrets de connexion, `ADMIN_PASSWORD_HASH` et `ADMIN_SESSION_SECRET`, doivent être enregistrés comme **Secret** dans Cloudflare, puis un déploiement doit suivre. Ils ne sont jamais versionnés. Le formulaire reste fermé tant qu'ils manquent.

R2 n'est pas activé sur ce compte : son activation demande un abonnement avec facturation possible. Aucun abonnement n'a été souscrit. Le binding optionnel `PHOTOS` est donc absent ; les visuels du catalogue existant fonctionnent, mais l'envoi de nouvelles photos nécessite cette activation.

`docs/installation-initiale.sql` permet une installation via le Studio D1 sur une **base vide uniquement**. Il contient les deux migrations, le catalogue public et les entrées de suivi Wrangler. `node scripts/seed-d1.mjs --export=<fichier.sql>` exporte le catalogue seul pour préparer une installation ; cette option n'exécute aucune requête distante. Pour une base déjà utilisée, appliquer les migrations et le seed habituels afin de préserver les données.

Les instructions historiques ci-dessous décrivent également les étapes d'une installation à partir de zéro.

## Mise à jour : connexion par mot de passe

L’accès demandé est désormais **identifiant + mot de passe**, sans e-mail. Cloudflare Access n’est pas nécessaire pour ce mode. La configuration Access décrite plus bas appartient au plan initial.

Exécuter `node scripts/configurer-mot-de-passe.mjs` pour générer un accès local et enregistrer son empreinte dans `.dev.vars`, ignoré par Git. La commande affiche le mot de passe local une fois. Elle renouvelle aussi le secret de session et invalide les sessions précédentes.

Dans les variables de l’environnement Cloudflare concerné, reporter les valeurs locales suivantes : `ADMIN_USERNAME`, `ADMIN_NAME`, **`ADMIN_PASSWORD_HASH`** et **`ADMIN_SESSION_SECRET`** (les deux dernières en secrets). Ne jamais placer le mot de passe ni ces secrets dans le dépôt. Le même mot de passe fonctionne seulement après installation des mêmes valeurs sur le serveur distant.

Le cookie de session est signé, HttpOnly, SameSite=Strict et Secure en HTTPS. La connexion est limitée à cinq tentatives par minute et par instance/IP. Le mot de passe est vérifié avec PBKDF2-SHA256 ; aucune vérification n’est effectuée dans le JavaScript public. Dès qu’une empreinte de mot de passe est configurée, les accès de développement par en-tête sont désactivés.

Le code se construit localement. Les identifiants D1 du fichier `wrangler.toml` sont encore provisoires : les ressources distantes et la protection Access doivent être configurées avant utilisation réelle.

## Environnement de développement

Utiliser Node.js 24 (version utilisée pour la validation) et les dépendances du lockfile :

```powershell
npm ci
npm run build
npm run db:migrate
npm run seed-d1
npm run dev:api
```

Ouvrir `http://localhost:8788/admin` pour tester le build complet. Pour développer l’interface admin avec rechargement Vite, lancer `npm run dev:admin` dans un second terminal, puis ouvrir `http://localhost:5174/admin.html`. L’API doit toujours fonctionner sur le port 8788.

Le mode local nécessite `.dev.vars`, ignoré par Git :

```dotenv
DEV_AUTH=1
ADMIN_EMAILS=laetitia@test.local:Laetitia
```

Cette identité est une identité de test. Le contournement local est limité à `localhost` et `127.0.0.1`. Ne pas définir `DEV_AUTH` dans Cloudflare.

Les commandes de migration et de seed ci-dessus ciblent uniquement la base locale. Pour utiliser une base isolée, ajouter `--persist-to <dossier>` aux commandes Wrangler et utiliser le même dossier pour `pages dev`. Le script de seed utilise la persistance locale par défaut.

## Ressources distantes

Depuis une session Cloudflare autorisée :

```powershell
npx wrangler login
npx wrangler d1 create nalaaris-test
npx wrangler d1 create nalaaris-prod
npx wrangler r2 bucket create nalaaris-photos-test
npx wrangler r2 bucket create nalaaris-photos
```

Si les ressources existent déjà, récupérer leurs identifiants au lieu de les recréer. Reporter les deux `database_id` réels dans `wrangler.toml`. Les bindings utilisés dans le code sont **DB** et **PHOTOS**. Tester d’abord sur les ressources de test.

Appliquer toutes les migrations dans l’ordre, y compris `0002_stock_atomique.sql`. Elle ajoute les déclencheurs de stock sans recalculer les quantités déjà présentes.

```powershell
npx wrangler d1 migrations apply DB --remote
npm run seed-d1 -- --cible=test
```

Pour la production, une fois le test validé :

```powershell
npx wrangler d1 migrations apply DB --remote --env production
npm run seed-d1 -- --cible=prod
```

Déployer le code et les migrations ensemble avant de rouvrir l’admin : l’ancienne API et la nouvelle migration ne doivent pas être utilisées simultanément. L’ancienne API décrémente elle-même le stock ; la nouvelle laisse SQLite effectuer les mouvements.

## Access et secrets

Configurer une application Cloudflare Access pour `/admin`, `/admin/*`, `/api/admin` et `/api/admin/*`, sur le domaine public et les domaines de preview utilisés. Autoriser uniquement les e-mails des responsables. Protéger aussi l’accès direct à `/admin.html` si cette URL reste accessible.

Définir pour chaque environnement :

| Variable | Valeur |
|---|---|
| `ACCESS_TEAM_DOMAIN` | Domaine d’équipe, sans `https://` |
| `ACCESS_AUD` | Audience de l’application Access |
| `ADMIN_EMAILS` | `email:Prénom,email:Prénom` |
| `DEPLOY_HOOK_URL` | Secret : deploy hook de la bonne branche |

La vérification JWT est aussi effectuée par l’API. La protection du HTML seul ne suffit pas.

Les détails de configuration Access sont déjà décrits dans `docs/plan-admin.md`. Vérifier les paramètres dans le tableau de bord du compte réel avant déploiement.

## Build et données

Commande Pages : `npm run build`. Sortie : `dist`.

Définir `NODE_VERSION=24` dans les variables du build Pages.

Le build produit les pages publiques pré-rendues, puis `admin.html` et les fichiers `admin-assets`. Les chemins `/admin/*` sont réécrits vers l’interface admin, sans modifier les routes publiques.

Le script `donnees-d1.mjs` récupère les données publiques de la version déjà déployée : production depuis `main`, preview depuis l’alias de branche. Si cette source configurée échoue, le build s’arrête pour éviter de remplacer les données de la boutique par les fichiers historiques.

Pour la **première installation**, avant que l’API publique existe, définir temporairement `DONNEES_URL=aucune` dans les variables de build. Déployer l’API et l’admin, préparer D1, puis retirer cette variable et republier. Ne pas laisser `aucune` après l’installation : les textes et nouveaux formats de l’admin ne seraient pas récupérés au build.

Pour tester un build à partir d’une API choisie :

```powershell
$env:DONNEES_URL = 'http://localhost:8788'
npm run build
Remove-Item Env:DONNEES_URL
```

Les données téléchargées sont uniquement publiques. Les prix d’achat, stocks chiffrés et coordonnées clientes ne passent pas dans les fichiers du site.

## Contrôles

```powershell
npm test
npm run build
npm run check:dist
```

Avant la mise à disposition réelle : tester l’authentification Access, toutes les routes admin en accès direct, une vente et son annulation sur la base de test, une photo R2, une modification de prix suivie d’une publication, et l’interface à 390 px dans les deux thèmes. Contrôler le résultat du deploy hook dans Cloudflare ; son retour HTTP confirme le lancement, pas le succès final du build.
