# Conformité — RGPD, DAC7, LCB-FT

## Minimisation

Le modèle de données ne collecte que ce qui sert un traitement identifié :

| Donnée | Finalité | Base légale |
| --- | --- | --- |
| Pseudonyme, commune, photo | Affichage public du profil | Exécution du contrat |
| E-mail, téléphone | Authentification, notifications | Exécution du contrat |
| Adresse de livraison | Génération de l'étiquette Colissimo | Exécution du contrat |
| Identité légale, pièce d'identité | KYC imposé au prestataire de paiement | Obligation légale (LCB-FT) |
| NIF, montants annuels | Déclaration DAC7 | Obligation légale |
| Événements de mesure d'audience | Amélioration du service | Consentement |
| Prospection commerciale | Offres et nouveautés | Consentement explicite |

Les coordonnées n'apparaissent **jamais** sur un profil public : seuls le pseudonyme,
la commune, la note et l'historique d'évaluations sont visibles.

## Droits des personnes

Réglages → **Confidentialité et données** :

- **Export** — produit un JSON complet (profil, annonces, commandes, messages,
  évaluations, mouvements de portefeuille) partageable par les moyens du système.
- **Effacement** — anonymise le profil et retire les annonces. Les commandes sont
  conservées de façon pseudonymisée : la conservation comptable et les obligations
  DAC7 / LCB-FT priment sur le droit à l'effacement, ce qui est indiqué à l'utilisateur
  avant confirmation.
- **Consentements** — mesure d'audience et prospection commerciale, révocables à tout
  moment, désactivés par défaut.
- **Notifications** — chaque événement est paramétrable indépendamment par e-mail et
  par push.

## Durées de conservation

| Donnée | Durée |
| --- | --- |
| Compte actif | Durée d'utilisation du service |
| Messagerie | 3 ans après le dernier échange |
| Pièces comptables et transactions | 10 ans |
| Données KYC / LCB-FT | 5 ans après la fin de la relation |
| Données DAC7 | 5 ans |
| Événements de mesure d'audience | 13 mois |

## Hébergement et sécurité

- Données hébergées dans l'Union européenne.
- Aucune donnée bancaire ne transite par les serveurs Liked : la saisie de carte se fait
  dans le composant hébergé du prestataire agréé.
- Aucun secret n'est embarqué dans l'application mobile.
- Jeton de session stocké dans le Keychain (iOS) / Keystore (Android) via `expo-secure-store`.
- Les accès sensibles et toutes les actions d'administration sont journalisés.

## DAC7 en pratique

Les champs exigés sont présents dès l'origine dans le modèle (`DonneesDac7`) :
identité complète, date de naissance, adresse, pays, NIF, montant annuel et nombre de
transactions. Ils sont collectés au moment du KYC — c'est-à-dire avant le premier
retrait — et les agrégats sont incrémentés à chaque versement au vendeur.

Le back-office produit le fichier annuel et les récapitulatifs individuels
(voir [BACK-OFFICE.md](BACK-OFFICE.md)).
