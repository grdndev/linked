# Architecture

## Deux modes distincts

`mock` charge les données fictives et la persistance locale existantes. Tous les écrans de recette sont disponibles. `http` remplace les actions du store par des requêtes serveur, avec une base initialement vide. Il ne recharge aucune donnée locale de démonstration. Une commande non implémentée retourne HTTP 501 ; aucun simulateur ne prend le relais.

Le cache mobile reste en mémoire en mode HTTP. Le jeton opaque de session est conservé via SecureStore sur iOS/Android, et dans sessionStorage (limité à l’onglet) sur web. Le cache est rafraîchi au retour au premier plan et toutes les quinze secondes lorsque l’application est active. Il n’y a pas encore de WebSocket ni de pagination serveur.

## Serveur de bêta

Node 22.13+, Express 5, TypeScript, Zod. Une base SQLite en WAL stocke l’agrégat de marketplace en JSON, les sessions, les codes OTP hachés, les références Stripe, les événements traités et les photos appartenant à chaque utilisateur.

Les mutations passent par une file unique et une transaction `BEGIN IMMEDIATE`, y compris les appels prestataires liés. Cela évite les achats simultanés et les doubles transferts dans **une seule instance**. Ce choix privilégie une bêta facile à lancer, au prix de la concurrence et de la latence. Passer à des tables relationnelles paginées, une file durable de jobs et un modèle de réconciliation avant montée en charge.

Les appels externes ont des délais maximum et les transferts Stripe utilisent des clés d’idempotence. Une panne entre la création d’une session Checkout et le commit peut laisser une session orpheline chez Stripe : il faut ajouter une saga durable / outbox et une réconciliation avant paiement réel. Les écritures de fichier photo et SQLite ne sont pas atomiques ; une tâche de nettoyage des fichiers orphelins reste nécessaire.

## Confidentialité et autorisation

- Identité de session déduite d’un jeton HMAC côté serveur, jamais d’un identifiant envoyé dans le corps d’une action.
- Profils publics construits par liste blanche ; pas d’e-mail, téléphone, NIF, IBAN, préférences ou solde des autres membres.
- Commandes, conversations, messages et litiges limités aux participants ; modération réservée aux administrateurs.
- Code de remise envoyé uniquement à l’acheteur ; validation réservée au vendeur ; cinq essais maximum.
- Aucun endpoint public pour s’accorder un rôle admin, un statut KYC ou des fonds.
- Images décodées et redimensionnées en WebP avec suppression EXIF/GPS. Upload authentifié, 10 Mo et 40 mégapixels maximum. Photos d’annonces publiques ; les preuves de litige nécessitent un stockage privé dédié avant production.

## Paiement

Le serveur calcule le panier à partir de l’annonce et d’une offre réellement acceptée. Il réserve l’article à la création de Checkout. Le webhook signé est la seule autorité pour confirmer le paiement. Après confirmation, un code à quatre chiffres est créé et la conversation est débloquée. Le transfert au vendeur s’effectue seulement après code valide et en absence de litige.

Les sessions Checkout expirent après trente minutes ; le webhook d’expiration remet l’annonce en ligne. Sans webhook fonctionnel, une réservation peut rester bloquée : surveiller et réconcilier avant ouverture publique.

Le champ historique `sequestre` signifie ici « paiement confirmé, transfert en attente ». Stripe Connect n’est pas présenté comme un prestataire de séquestre.
