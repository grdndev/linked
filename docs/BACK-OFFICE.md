# Dashboard web Liked — recette

Le dashboard est une application React DOM autonome, séparée des écrans React Native. Il partage uniquement l’API et ses données avec l’application mobile.

- Application : https://liked-beta-reunion.jayan-codialis.chatgpt.site/bienvenue
- Administration : https://liked-beta-reunion.jayan-codialis.chatgpt.site/dashboard/
- Connexion par code e-mail. Le serveur exige un compte actif avec le rôle administrateur pour chaque lecture et chaque action de gestion. Les membres n’ont aucun accès à ces données.
- Le lien Profil → Dashboard web ouvre le navigateur ; aucun écran de gestion n’est embarqué dans l’application mobile.

## Gestion disponible

| Rubrique | Actions |
| --- | --- |
| Vue d’ensemble | Membres, annonces, commandes payées, volume net, revenus des ventes terminées, boosts, tâches en attente |
| Annonces | Rechercher, filtrer, masquer, rétablir, archiver les annonces éligibles avec un motif |
| Membres | Rechercher, avertir, suspendre, bannir, rétablir ; synchroniser le statut vendeur depuis Stripe |
| Commandes | Suivre les statuts et demander un remboursement intégral avant expédition ; les remboursements en attente restent bloqués jusqu’à confirmation du prestataire |
| Livraisons | Suivi des commandes et simulation des étapes préparation, expédition, livraison |
| Litiges & support | Lire les pièces et échanges du litige, répondre, décider un remboursement intégral ou un versement vendeur motivé |
| Signalements | Examiner les annonces et messages signalés, traiter le signalement ; les coordonnées sont masquées |
| Boosts | Consulter les achats et rembourser un boost payé ; activation uniquement après paiement confirmé |
| E-mails | Voir les 200 derniers envois ; remettre en file les envois échoués après huit tentatives |
| Exports | CSV des commandes, récapitulatifs vendeurs et journal ; ce sont des exports de gestion, pas une déclaration fiscale officielle |
| Réglages | Activer ou suspendre inscriptions, publications, achats, boosts ; régler les tarifs ; option Colissimo |
| Journal | Historique des modifications de réglages, modération, sanctions et opérations administratives sensibles |

Les montants et autorisations sont vérifiés côté serveur. Le statut vendeur est lu chez Stripe et ne peut pas être forcé manuellement. Les décisions financières nécessitent un motif et une confirmation. Les messages privés non signalés ne sont pas inclus dans le tableau de gestion.

## Colissimo facultatif

L’option est **désactivée par défaut**. Les nouvelles annonces et les achats proposent la remise en main propre. Kylian peut aller dans Réglages, activer « Proposer Colissimo », puis enregistrer. La désactivation ne supprime pas le suivi des commandes déjà payées.

Dans cette bêta, cette activation ouvre **uniquement un transport simulé** : aucune étiquette réelle ni aucun affranchissement. Le contrat, les identifiants du transporteur et la validation des étiquettes restent nécessaires avant les expéditions réelles. Stripe reste en mode test.

## Construction et vérification

`npm ci`, `npm --prefix server ci`, puis `npm run typecheck`, `npm --prefix server run typecheck` et `npm test`.

`EXPO_PUBLIC_API_URL=… EXPO_PUBLIC_API_DRIVER=http npm run build:web` produit le mobile web dans `dist` et le dashboard indépendant dans `dist/dashboard`. `npm run build:dashboard` reconstruit uniquement ce dernier. Les secrets restent exclusivement dans l’environnement serveur.

Pour une recette locale sans prestataires ni données réelles : construire avec l’API `http://localhost:3002`, puis lancer depuis `server` la commande `node --import tsx scripts/preview-admin.ts`. Cette commande refuse un environnement contenant des clés Stripe ou Brevo ; elle utilise une base en mémoire et affiche le code de connexion fictif dans son terminal.

La bêta actuelle utilise un serveur et un tunnel sur le Mac : ils doivent rester actifs. La mise en production nécessite un hébergement permanent, les prestataires réels et une recette sur appareils physiques.
