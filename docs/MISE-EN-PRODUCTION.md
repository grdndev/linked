# Avant ouverture publique

Cette livraison est une bêta et refuse les clés Stripe réelles. Aucun déploiement de production ni publication App Store / Play Store n’a été effectué.

## Prérequis techniques

- Recette Stripe Connect dans la région et les pays applicables ; frais, chargebacks et responsabilités validés.
- Résolution de litiges, remboursements, annulations, rapprochement Stripe/BDD et récupération après crash.
- Stockage privé de preuves de litige ; conservation limitée, purge des uploads orphelins et quotas de stockage.
- API Colissimo réelle, suivi vérifié côté serveur et tâche de libération après 48 h.
- Export et effacement RGPD, conservation DAC7, procédure d’administration et journalisation.
- E-mails métier, push, alertes de recherche, contre-offres, synchronisation KYC.
- Hébergement UE, HTTPS, sauvegardes restaurées en recette, supervision et secrets serveur.
- Migration de l’agrégat JSON vers des tables paginées / jobs durables avant montée en charge.

## Builds

La compilation JavaScript iOS/Android/web n’est pas une build native signée. Configurer les credentials dans EAS / App Store Connect / Google Play, vérifier les identifiants applicatifs et le projet EAS existants, puis tester caméra, sélection photo, SecureStore, liens profonds, réseau intermittent, clavier et accessibilité sur appareils réels.

Ne pas utiliser les mots de passe des comptes dans le code ou des variables publiques. Les `.env`, certificats et clés privées sont ignorés par Git.
