# Tester Liked sur iPhone

## Accès privé

Lien : https://liked-beta-reunion.jayan-codialis.chatgpt.site

Accès au site réservé au propriétaire et au testeur pouniandy.kylian@outlook.fr. Ouvrir l’invitation avec cette adresse, puis le lien dans Safari. Utiliser Partager → Sur l’écran d’accueil pour ajouter Liked. Cette version est une application web issue du même projet React Native ; aucun binaire TestFlight n’a été distribué.

Dans Liked, créer le compte avec l’adresse invitée, le pseudonyme et la commune. Le code de connexion arrive par Brevo, expire après dix minutes et n’est utilisable qu’une fois. Le serveur autorise uniquement l’adresse du testeur et celle du compte Liked.

## État de la recette — 30 septembre 2026

- Clé Stripe sandbox configurée ; paiement technique fictif de 1 € puis remboursement réussis.
- Expéditeur Brevo actif ; un e-mail technique a été confirmé livré par Brevo au testeur.
- Webhook Stripe de test configuré sur le serveur HTTPS.
- Catalogue de douze articles fictifs, aucune marchandise réelle.
- **Stripe Connect reste à activer.** Les parcours d’achat et de versement complets ne sont pas encore validés avec les prestataires. L’atelier affiche cette limite et ne propose ses scénarios qu’une fois un vendeur Connect de test configuré.
- Livraison entièrement simulée, aucun affranchissement ou colis réel.

## Parcours après activation de Connect

Depuis l’atelier, lancer un achat avec remise ou livraison. Carte acceptée : 4242 4242 4242 4242 ; date future ; CVC de trois chiffres. Carte refusée : 4000 0000 0000 0002. Ne pas utiliser de carte réelle.

Après confirmation Stripe, revenir dans Liked. La commande ne devient payée qu’après le webhook vérifié. Les e-mails de commande portent [TEST]. Pour le vendeur fictif, des boutons dans l’atelier permettent de préparer, expédier puis livrer le colis simulé, ou de confirmer la remise. Le remboursement se demande dans la commande avant envoi ou remise. L’acheteur confirme la réception pour terminer la transaction ; un litige bloque le versement.

« Accepté par Brevo » dans l’atelier signifie que le prestataire a accepté l’envoi ; cela ne garantit pas le placement en boîte principale. Vérifier également les indésirables.

## Disponibilité du serveur

Le frontend est hébergé. Le serveur et sa base SQLite tournent temporairement sur le Mac, accessibles par un tunnel Cloudflare autorisé. Le Mac, le serveur et le tunnel doivent rester actifs. Un redémarrage du tunnel change son URL : il faudra mettre à jour PUBLIC_API_URL, le webhook Stripe et recompiler le frontend HTTP. Ce montage ne convient pas à la production.

Les secrets sont conservés uniquement dans le .env privé du serveur actif, jamais dans Git ni le ZIP. Pour une installation durable, utiliser le Dockerfile avec un volume persistant et une URL HTTPS stable.

## TestFlight ultérieur

Le profil EAS testflight existant est une configuration de démonstration. Avant une distribution native connectée, renseigner le driver HTTP et l’URL stable dans son environnement EAS, se connecter au compte Expo et configurer les certificats Apple Developer / App Store Connect. Aucune signature iOS ou invitation TestFlight n’a été réalisée.
