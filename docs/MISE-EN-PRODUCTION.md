# Avant ouverture publique

Cette livraison est une bêta et refuse les clés Stripe réelles. Une démonstration web en mode mock est hébergée ; aucune API de production ni publication App Store / Play Store n’a été effectuée.

## Prérequis techniques

- Recette Stripe Connect dans la région et les pays applicables ; frais, chargebacks et responsabilités validés.
- Résolution de litiges, remboursements après transfert et partiels, rapprochement exhaustif Stripe/BDD et récupération après crash. Le remboursement intégral avant envoi/remise est livré.
- Stockage privé de preuves de litige ; conservation limitée, purge des uploads orphelins et quotas de stockage.
- API Colissimo réelle et suivi vérifié côté serveur. La tâche de versement à 48 h est livrée pour la simulation.
- Export et effacement RGPD, conservation DAC7, procédure d’administration et journalisation.
- E-mails métier, push, alertes de recherche, contre-offres, synchronisation KYC.
- Hébergement UE, HTTPS, sauvegardes restaurées en recette, supervision et secrets serveur.
- Migration de l’agrégat JSON vers des tables paginées / jobs durables avant montée en charge.

## Builds

La compilation JavaScript iOS/Android/web n’est pas une build native signée. Configurer les credentials dans EAS / App Store Connect / Google Play, vérifier les identifiants applicatifs et le projet EAS existants, puis tester caméra, sélection photo, SecureStore, liens profonds, réseau intermittent, clavier et accessibilité sur appareils réels.

Ne pas utiliser les mots de passe des comptes dans le code ou des variables publiques. Les `.env`, certificats et clés privées sont ignorés par Git.
