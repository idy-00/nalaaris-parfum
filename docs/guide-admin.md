# Utiliser l’espace de gestion Nal’Aaris

L’espace s’ouvre à l’adresse `/admin` du site. La connexion utilise un identifiant et un mot de passe. Aucun code par e-mail n’est nécessaire. La session dure huit heures ; ensuite, il faut se reconnecter.

## Mettre les prix et le stock

1. Ouvrir **Catalogue**, puis rechercher le parfum ou choisir **Sans prix**.
2. Ajouter une contenance si nécessaire.
3. Saisir le prix ou la quantité. Quitter le champ pour enregistrer.
4. Vérifier le message de confirmation. Une modification rapide peut être annulée pendant cinq secondes.

Le prix d’achat est facultatif et reste privé. Il sert à calculer la marge.

Une quantité vide signifie « stock non suivi ». Une quantité à zéro signifie « épuisé ». La fiche permet aussi de forcer « sur commande » ou « épuisé ».

Les prix et disponibilités déjà présents peuvent être actualisés à l’ouverture du site public. Pour ajouter ou retirer un format, afficher un premier prix, changer un texte ou masquer un parfum, utiliser **Plus → Publier sur le site**.

## Noter une vente WhatsApp

1. Appuyer sur **+ Vente**.
2. Choisir le ou les parfums, leur contenance, leur quantité et le prix réellement convenu.
3. Choisir le moyen de paiement, le retrait ou la livraison et les frais.
4. Ajouter, si utile, le prénom et le numéro de la cliente.
5. Enregistrer une fois et attendre la confirmation.

Le stock baisse automatiquement. Une vente refusée pour manque de stock n’enregistre rien. Le bouton de confirmation ouvre WhatsApp : il faut envoyer soi-même le message.

Dans **Ventes**, une vente peut être modifiée ou annulée. L’annulation remet les flacons en stock une seule fois. Une vente annulée ne se modifie plus. Un format utilisé dans une vente active ne peut pas être supprimé : le conserver et indiquer le parfum épuisé ou masqué si nécessaire.

## Ajouter un parfum

Dans **Catalogue → Ajouter**, renseigner la marque, le nom, la catégorie, les notes et, éventuellement, une photo de référence.

Le parfum reste masqué avec le statut **Visuel à créer**. Le visuel studio doit être intégré par Idy au catalogue du dépôt, puis importé dans D1. Ensuite, il peut être rendu visible depuis sa fiche et publié. La photo de téléphone reste une référence privée.

## Modifier les informations de la boutique

Ouvrir **Plus → Informations, livraison et paiement**. Renseigner le numéro WhatsApp, les horaires, le retrait, les moyens de paiement et les zones de livraison. Enregistrer, puis publier le site.

## Avis clients

Ouvrir **Plus → Avis clients**. Ajouter uniquement un avis réellement reçu et confirmer que la personne a donné son accord. Un avis peut être modifié, masqué ou supprimé. Le site affiche la section à partir de trois avis publiés, après publication du site.

## Retours en stock

Ouvrir **Plus → Retours en stock**. Vérifier le stock du format demandé, ouvrir WhatsApp et prévenir la personne. Appuyer ensuite sur **Marquer prévenue**. Une demande peut être supprimée à la demande de la personne.

Les alertes de plus de six mois ne sont plus affichées ; leur purge physique se fait lors de l’ouverture du tableau de bord.

## Publication et sauvegardes

Dans **Plus**, le bouton **Publier** lance la préparation du site. Un lancement accepté ne prouve pas que le déploiement s’est terminé : Idy peut vérifier son résultat dans Cloudflare Pages.

Télécharger régulièrement une sauvegarde JSON et, au besoin, les ventes en CSV. La sauvegarde contient les coordonnées des clientes : la conserver dans un espace privé. Le JSON est un export ; aucune restauration automatique n’est proposée par l’interface.

Le bouton **Anonymiser les anciennes ventes** efface les coordonnées et notes des ventes de plus de 12 mois, ainsi que leurs anciennes valeurs dans le journal. Les produits et montants sont conservés. Les sauvegardes déjà téléchargées doivent être gérées séparément.

## En cas d’erreur

- Session expirée : recharger la page pour se reconnecter.
- Pas de connexion : réessayer lorsque le réseau revient.
- Stock insuffisant : vérifier le format et le stock avant de réessayer.
- Stockage photo ou publication non configurés : contacter Idy.
- Après utilisation sur un appareil partagé : **Plus → Se déconnecter**.
