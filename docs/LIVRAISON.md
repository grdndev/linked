# Livraison — 30 septembre 2026

## Nature de la livraison

Amélioration du dépôt React Native existant, et ajout d’un premier serveur de bêta. **Le périmètre intégral du cahier des charges n’est pas achevé pour une exploitation réelle.** Il faut distinguer les écrans fonctionnels en démonstration et les actions raccordées à l’API.

| Parcours | Démonstration locale | API de bêta |
|---|---|---|
| Catalogue, recherche, filtres, favoris | Oui | Oui, snapshot complet sans pagination |
| Inscription et connexion | Comptes fictifs / code fixe | OTP Brevo, sessions révocables |
| Photos et dépôt d’annonce | Local | Upload WebP avec suppression EXIF/GPS |
| Messagerie, offres | Oui | Messages + offre acceptée/refusée ; pas de contre-offre |
| Paiement en main propre | Simulé | Checkout Stripe de test + webhook |
| Code et transfert vendeur | Simulé | Serveur, droits, cinq essais, idempotence |
| KYC et compte vendeur | Simulé | Onboarding Stripe Express ; statut KYC UI non synchronisé |
| Colissimo | Simulation complète | Bloqué, intégration à développer |
| Litiges | Simulation complète | Ouverture / discussion / gel du transfert ; résolution financière à développer |
| Évaluations | Oui | Après transaction finalisée, une note par partie |
| Notifications | Simulées | Internes pour certains événements ; e-mail OTP seulement |
| Recherches enregistrées | Oui | Sauvegarde ; alertes automatiques à développer |
| Modération / sanctions | Oui | Contrôle admin côté serveur ; provisionnement admin hors UI |
| DAC7 / RGPD export et effacement | Simulation | À développer avant lancement |
| Apple / Google Login | Retirés de l’accueil | Non implémentés |
| App Store / Play Store | Projet Expo configuré | Pas de build signée ni de publication |

## Changements visibles

Accueil éditorial, nouvelle page de bienvenue, navigation visiteur, catalogue conservant les codes graphiques du brief, prix avec protection sur les cartes, erreurs réseau explicites, boutons qui bloquent les doubles appuis. Le statut démonstration est visible ; aucune connexion sociale fictive n’est présentée comme réelle. Permissions Android nettoyées (microphone retiré).

## Validation

- TypeScript application et serveur.
- 18 tests métier / HTTP réussis ; Stripe et Brevo remplacés par des doubles de test.
- Vérification navigateur au format 390 × 844 : accueil, catalogue visiteur, connexion démo, fiche article, panier, création de commande et code de remise fictif.
- Export Expo iOS (Hermes), Android (Hermes) et web réussi. Cela valide les bundles, pas la signature ni une installation sur appareil réel.

Les clés API n’étant pas configurées, aucun e-mail réel, paiement Stripe réel, onboarding vendeur réel ou envoi Colissimo n’a été exécuté. Aucun compte externe n’a été modifié avec les mots de passe fournis.

## Prochaine recette

Configurer les clés test et un expéditeur Brevo, effectuer une transaction complète entre deux utilisateurs sur deux appareils, tester les erreurs prestataires et retours 3DS, puis compléter les fonctions serveur manquantes listées ci-dessus. Les photos de preuve de litige doivent être privées avant utilisation avec des données personnelles réelles.
