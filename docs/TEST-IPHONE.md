# Tester Liked sur iPhone

## Accès privé

Lien : https://liked-beta-reunion.jayan-codialis.chatgpt.site

Accès au site réservé au propriétaire et au testeur pouniandy.kylian@outlook.fr. Ouvrir l’invitation avec cette adresse, puis le lien dans Safari. Utiliser Partager → Sur l’écran d’accueil pour ajouter Liked. Cette version est une application web issue du même projet React Native ; aucun binaire TestFlight n’a été distribué.

Dans Liked, choisir « Connexion » : le compte Kylian Test est déjà prêt avec l’adresse invitée. Le code de connexion arrive par Brevo, expire après dix minutes et n’est utilisable qu’une fois. Le serveur autorise uniquement l’adresse du testeur et celle du compte Liked.

## État de la recette — 30 septembre 2026

- Clé Stripe sandbox configurée ; paiement technique fictif de 1 € puis remboursement réussis.
- Expéditeur Brevo actif ; un e-mail technique a été confirmé livré par Brevo au testeur.
- Webhook Stripe de test configuré sur le serveur HTTPS.
- Catalogue de douze articles fictifs, aucune marchandise réelle.
- Stripe Connect actif : vendeur fictif prêt et lien d’onboarding Express vérifié. Compatibilité Accounts v1 activée uniquement dans le bac à sable.
- Achat de 30,20 € fictifs puis remboursement intégral confirmés (LK-45E3E64B).
- Achat avec livraison de 35,70 € fictifs, webhook, préparation, expédition, livraison et transfert test de 28 € au vendeur confirmés (LK-656EA535).
- Brevo confirme la livraison au testeur des e-mails de connexion, achat, remboursement, expédition, livraison et fin de transaction.
- 32 tests automatisés passent ; contrôles TypeScript application/serveur et export web réussis.
- Livraison entièrement simulée, aucun affranchissement ou colis réel.

## Parcours à essayer

Depuis l’atelier, lancer un achat avec remise ou livraison. Carte acceptée : 4242 4242 4242 4242 ; date future ; CVC de trois chiffres. Carte refusée : 4000 0000 0000 0002. Ne pas utiliser de carte réelle.

Après confirmation Stripe, revenir dans Liked. La commande ne devient payée qu’après le webhook vérifié. Les e-mails de commande portent [TEST]. Pour le vendeur fictif, des boutons dans l’atelier permettent de préparer, expédier puis livrer le colis simulé, ou de confirmer la remise. Le remboursement se demande dans la commande avant envoi ou remise. L’acheteur confirme la réception pour terminer la transaction ; un litige bloque le versement.

« Accepté par Brevo » dans l’atelier signifie que le prestataire a accepté l’envoi ; cela ne garantit pas le placement en boîte principale. Vérifier également les indésirables.

## Disponibilité du serveur

Le frontend est hébergé. Le serveur et sa base SQLite tournent temporairement sur le Mac, accessibles par un tunnel Cloudflare autorisé. Le Mac, le serveur et le tunnel doivent rester actifs. Un redémarrage du tunnel change son URL : il faudra mettre à jour PUBLIC_API_URL, le webhook Stripe et recompiler le frontend HTTP. Ce montage ne convient pas à la production.

Les secrets sont conservés uniquement dans le .env privé du serveur actif, jamais dans Git ni le ZIP. Pour une installation durable, utiliser le Dockerfile avec un volume persistant et une URL HTTPS stable.

## TestFlight ultérieur

Le profil EAS testflight existant est une configuration de démonstration. Avant une distribution native connectée, renseigner le driver HTTP et l’URL stable dans son environnement EAS, se connecter au compte Expo et configurer les certificats Apple Developer / App Store Connect. Aucune signature iOS ou invitation TestFlight n’a été réalisée.

## Booster un article

Profil → Mes annonces → Booster (ou ouvrir sa propre annonce → Booster cet article). Choisir 3 jours à 2,99 € ou 7 jours à 5,99 €, puis payer avec la carte Stripe test. La confirmation du webhook active la mise en avant dans « À la une » avec le badge Sponsorisé ; le retour du navigateur seul ne l’active jamais. Le vendeur reçoit un e-mail Brevo d’activation et, à l’échéance, de fin de boost.

Pour essayer sans publier : Espace de test → Tester un boost d’article. Un article fictif est créé dans Mes annonces du compte connecté, sans modifier son âge ni son rôle.

Le boost n’est pas un abonnement. Pas de renouvellement automatique ni de vente garantie. Un seul boost actif par article ; un paiement en cours se reprend sans créer un deuxième Checkout. Un article réservé, vendu, masqué ou supprimé sort des emplacements sponsorisés sans prolonger la période. S’il devient indisponible avant la confirmation du paiement, le serveur demande son remboursement. Les offres et montants sont fixés côté serveur dans src/lib/boost.ts. Ces tarifs sont uniquement ceux de la recette.

Recette du boost effectuée le 30/09/2026 : achat Stripe test à 2,99 €, activation réelle par webhook pour trois jours (jusqu’au 03/10/2026 à 16:28, heure Réunion), affichage dans À la une et badge Sponsorisé vérifiés. L’expiration et l’absence de doublon sont couvertes par les tests automatisés.
