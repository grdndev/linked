# Tester Liked sur iPhone

## Accès privé

Lien : https://liked-beta-reunion.jayan-codialis.chatgpt.site

Accès au site réservé au propriétaire et au testeur pouniandy.kylian@outlook.fr. Ouvrir l’invitation avec cette adresse, puis le lien dans Safari. Utiliser Partager → Sur l’écran d’accueil pour ajouter Liked. Cette version est une application web issue du même projet React Native ; aucun binaire TestFlight n’a été distribué.

Dans Liked, choisir « Connexion » : le compte Kylian Test est déjà prêt avec l’adresse invitée. Le code de connexion arrive par Brevo, expire après dix minutes et n’est utilisable qu’une fois. Le serveur autorise uniquement l’adresse du testeur et celle du compte Liked.

## Recette précédente — 30 septembre 2026 (historique technique)

- Clé Stripe sandbox configurée ; paiement technique fictif de 1 € puis remboursement réussis.
- Expéditeur Brevo actif ; un e-mail technique a été confirmé livré par Brevo au testeur.
- Webhook Stripe de test configuré sur le serveur HTTPS.
- Catalogue de douze articles fictifs, aucune marchandise réelle.
- Stripe Connect actif : vendeur fictif prêt et lien d’onboarding Express vérifié. Compatibilité Accounts v1 activée uniquement dans le bac à sable.
- Achat de 30,20 € fictifs puis remboursement intégral confirmés (LK-45E3E64B).
- Achat avec livraison de 35,70 € fictifs, webhook, préparation, expédition, livraison et transfert test de 28 € au vendeur confirmés (LK-656EA535).
- Brevo confirme la livraison au testeur des e-mails de connexion, achat, remboursement, expédition, livraison et fin de transaction.
- 34 tests automatisés passent ; contrôles TypeScript application/serveur et export web réussis.
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

## Retour de recette de Kylian — 30/09/2026

Le tunnel temporaire supprimé par Cloudflare a été remplacé ; le lien du site reste identique. Recharger la page pour recevoir la nouvelle configuration réseau. Les données avaient été conservées lors de cette intervention du 30 septembre. Voir la remise en route du 1er octobre ci-dessous pour l’état actuel. Le Mac et le tunnel restent nécessaires ; un hébergement serveur permanent reste à déployer pour supprimer cette dépendance.

Au dépôt d’une annonce : choisir Sans boost, 3 jours (2,99 €) ou 7 jours (5,99 €), puis publier. Le forfait choisi est repris sur l’écran de paiement du boost. Annuler le paiement conserve l’annonce publiée gratuitement.

La messagerie masque les téléphones, e-mails, liens et identifiants sociaux avant et après paiement. Les anciens messages sont filtrés dans les réponses API. Les coordonnées détectées sont remplacées par des puces, pas seulement floutées visuellement. Cette détection couvre les formats courants et plusieurs obfuscations ; elle ne garantit pas de reconnaître toute formulation possible.

## Remise en route et animations — 1er octobre 2026

L’ancien dossier temporaire du serveur a disparu : son historique local (commandes, boosts, conversations et photos d’essai) n’a pas pu être récupéré. Les preuves Stripe/Brevo du 30 septembre restent chez les prestataires ; elles ne sont pas des commandes actives de cette nouvelle base. Le catalogue de douze articles fictifs et le profil minimal Kylian Test ont été rétablis. Recharger le site et demander un nouveau code de connexion avec l’adresse invitée. Les anciennes sessions sont invalides.

La configuration privée, la base SQLite et les photos sont maintenant placées dans un dossier durable distinct du dossier de compilation. Une sauvegarde SQLite cohérente est conservée séparément après la remise en route. Le serveur et le tunnel doivent néanmoins rester actifs sur le Mac.

Animations : logo à l’ouverture, arrivée progressive des visuels et textes d’accueil (moins de 700 ms), boutons avec un léger effet de pression. Aucun délai supplémentaire ne bloque la navigation. Les animations sont annulées au démontage et désactivées lorsque « Réduire les animations » est activé dans le système ou le navigateur. Les transitions natives respectent également ce réglage.

Recette visuelle : ouvrir /bienvenue, vérifier que les boutons sont disponibles immédiatement et que la page reste défilable sur petit écran ; tester Découvrir les articles puis le retour. Sur iPhone, activer Réglages → Accessibilité → Animation → Réduire les animations et rouvrir l’accueil pour vérifier l’affichage sans mouvement. La distribution actuelle reste une application web, pas un binaire TestFlight.
