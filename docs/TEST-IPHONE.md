# Tester Liked sur iPhone

## Version navigateur

Ouvrir le lien de la bêta dans Safari. Choisir « Essayer les parcours de test ». Ajouter Liked via Partager → Sur l’écran d’accueil si souhaité. Une connexion Internet reste nécessaire ; aucun mode hors ligne n’est promis.

La version navigateur publiée fonctionne en simulation. Les essais sont enregistrés uniquement sur cet appareil. Deux personnes ne partagent pas leurs commandes. Aucun e-mail n’est envoyé et aucun appel Stripe n’est effectué dans cette version.

1. **Remise** : lancer un achat, simuler le paiement, relever le code acheteur ; revenir à l’atelier puis ouvrir la commande côté vendeur et saisir le code. Le portefeuille fictif est crédité.
2. **Livraison** : lancer un achat avec livraison ; une adresse fictive est préremplie. Après paiement, ouvrir côté vendeur, générer l’étiquette de test, simuler le dépôt puis la livraison. Revenir côté acheteur et confirmer la réception.
3. **Remboursement** : acheter un nouvel article puis annuler avant le dépôt. Vérifier l’état « Remboursée » et l’aperçu de l’e-mail dans l’atelier.
4. **Refus** : lancer « Tester une carte refusée », confirmer le paiement et vérifier l’erreur sans fonds versés.
5. **E-mails** : consulter les aperçus dans l’atelier. Ils reproduisent les contenus utilisés par le serveur Brevo et portent la mention non envoyé.
6. **Litige** : acheter puis ouvrir un litige côté acheteur ; vérifier que la remise ou le versement ne peut plus être validé.

## Recette Stripe test + Brevo

Le serveur doit être hébergé avec un volume persistant (Dockerfile fourni), ses secrets configurés, son URL HTTPS et son webhook Stripe accessibles. Recompiler le mobile/web avec le driver HTTP. La version publiée en simulation ne bascule pas automatiquement quand les clés sont ajoutées.

Les e-mails Brevo de recette sont de vrais e-mails, préfixés [TEST]. Les paiements utilisent uniquement les clés Stripe `sk_test_`. Le transport reste simulé. L’atelier affiche les services configurés et l’état des e-mails de l’utilisateur connecté. « Accepté par Brevo » ne prouve pas la réception en boîte de réception.

## Installation native avec TestFlight

Le profil `testflight` du fichier eas.json produit une build iOS destinée à TestFlight. Il nécessite une session Expo autorisée, le programme Apple Developer actif, les certificats et l’application App Store Connect. Le CLI Expo n’était pas connecté lors de la préparation.

Depuis le projet :

```sh
eas login
eas build --platform ios --profile testflight
eas submit --platform ios --profile production
```

Ajouter ensuite le testeur dans App Store Connect → TestFlight. Le test externe nécessite la revue bêta Apple. Ne pas envoyer directement une IPA non provisionnée à un iPhone. Aucun binaire signé ni invitation TestFlight n’a été créé par cette livraison.

Références : https://docs.expo.dev/submit/testflight/ et https://docs.expo.dev/review/overview/
