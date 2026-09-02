# Mise en production — comptes, API et accès à ouvrir

Ce document liste **tout** ce qu'il faut souscrire, créer ou obtenir pour passer
Liked de la recette à l'exploitation réelle. Chaque ligne indique qui doit ouvrir
le compte, ce que ça coûte, et ce que ça débloque.

L'application mobile ne détient aucun secret : elle parle uniquement à l'API Liked,
qui est le seul composant autorisé à dialoguer avec les prestataires.

```
Mobile (aucun secret)  →  API Liked (tous les secrets)  →  Prestataires
```

---

## 1. Bloquant — sans ça, pas de service

### 1.1 Prestataire de paiement et séquestre

**Mangopay** (recommandé) ou **Lemonway**. Le prestataire doit être agréé
établissement de monnaie électronique pour l'encaissement pour compte de tiers :
c'est une obligation réglementaire, on ne peut pas la contourner avec Stripe seul.

| À obtenir | Détail |
| --- | --- |
| Compte marchand | Dossier KYB : Kbis, statuts, pièce d'identité du dirigeant, RIB |
| Clés API sandbox | Pour la recette de bout en bout |
| Clés API production | `CLIENT_ID`, `API_KEY` |
| URL de webhook | Événements `PAYIN_NORMAL_SUCCEEDED`, `KYC_SUCCEEDED`, `KYC_FAILED`, `PAYOUT_NORMAL_SUCCEEDED`, `TRANSFER_NORMAL_FAILED` |
| Wallet technique Liked | Reçoit les fonds séquestrés avant reversement |

- **Délai** : 2 à 4 semaines de validation du dossier. **À lancer en premier.**
- **Coût** : commission par transaction (à négocier, ordre de grandeur 1,8 % + 0,18 €).
- **Débloque** : paiement carte, séquestre, KYC vendeur, virements SEPA.

### 1.2 Expédition Colissimo

**La Poste — Colissimo Entreprise.**

| À obtenir | Détail |
| --- | --- |
| Contrat Colissimo | Numéro de contrat + identifiants API |
| Accès API affranchissement | Génération d'étiquettes prépayées |
| Accès API suivi | Statuts de livraison |
| Grille tarifaire négociée | Détermine la marge sur le port |

- **Délai** : 1 à 3 semaines.
- **Important** : les tarifs négociés doivent être reportés dans
  `COUTS_PORT_CENTS` (`src/lib/argent.ts`). Aujourd'hui, les forfaits facturés
  sont 4,50 / 5,50 / 7,00 € et les coûts supposés 3,85 / 4,70 / 6,10 €.

### 1.3 Hébergement de l'API et de la base

Hébergement **dans l'Union européenne** (exigence RGPD du cahier des charges).

| Besoin | Options |
| --- | --- |
| API + base PostgreSQL | Scaleway (Paris), OVHcloud, Clever Cloud |
| Stockage des images | Scaleway Object Storage ou OVH, avec redimensionnement serveur |
| Sauvegardes | Quotidiennes, rétention 30 jours minimum |

- **Coût** : 50 à 150 €/mois au démarrage.

### 1.4 Nom de domaine et certificats

- Domaine `liked.re` + sous-domaines `api.liked.re`, `admin.liked.re`
- Certificats TLS (Let's Encrypt, gratuit)
- **Coût** : ~30 €/an

---

## 2. Bloquant pour la distribution mobile

### 2.1 Apple

| À obtenir | Coût | Délai |
| --- | --- | --- |
| Apple Developer Program | 99 €/an | 1 à 2 jours (jusqu'à 1 semaine pour une société) |
| Identifiant App Store Connect | — | immédiat après |
| Numéro DUNS (si compte société) | gratuit | 1 à 2 semaines |

Débloque TestFlight puis la publication App Store.

### 2.2 Google

| À obtenir | Coût | Délai |
| --- | --- | --- |
| Compte Google Play Console | 25 € une fois | 1 à 2 jours |
| Vérification d'identité du développeur | — | jusqu'à 2 semaines |

### 2.3 Expo Application Services

Déjà en place (`@jayance/liked`). Le plan gratuit suffit pour démarrer ;
le plan payant (~19 $/mois) devient utile pour les builds prioritaires et
au-delà de 1 000 utilisateurs actifs par mois sur les mises à jour.

---

## 3. Nécessaire au fonctionnement nominal

### 3.1 E-mails transactionnels

**Brevo** (français, RGPD) ou **Postmark**.

- Clé API, domaine d'envoi vérifié, enregistrements **SPF, DKIM et DMARC**
- Modèles à créer, un par événement : nouveau message, offre reçue, article vendu,
  étiquette disponible, colis livré, code de remise, fonds versés, évaluation reçue,
  alerte de recherche
- **Coût** : gratuit jusqu'à ~300 envois/jour, puis ~25 €/mois

### 3.2 SMS de vérification

**Twilio Verify** ou **Vonage**.

- Compte, clé API, et déclaration de l'expéditeur
- **Attention La Réunion** : vérifier la couverture et le tarif de l'indicatif +262
- **Coût** : ~0,05 à 0,08 € par SMS

### 3.3 Notifications push

- **APNs** : clé `.p8` depuis le compte Apple Developer
- **FCM** : projet Firebase + fichier de configuration
- Ou **Expo Push**, qui encapsule les deux (gratuit)

### 3.4 Mesure d'audience

**Matomo** (auto-hébergé ou cloud européen) ou **Plausible**.

- **Coût** : 0 € auto-hébergé, ou ~10 €/mois en cloud
- Aucun événement n'est émis tant que l'utilisateur n'a pas consenti.

---

## 4. Obligations légales et réglementaires

| Élément | Détail |
| --- | --- |
| **Société immatriculée** | Kbis exigé par le prestataire de paiement |
| **Déclaration DAC7** | Enregistrement auprès de la DGFiP comme opérateur de plateforme ; déclaration annuelle avant le 31 janvier |
| **Registre des traitements RGPD** | Obligatoire, à tenir à jour |
| **Délégué à la protection des données** | Non obligatoire à ce stade, mais recommandé |
| **CGU et CGV** | À faire rédiger par un avocat — le séquestre et le statut d'intermédiaire doivent être décrits précisément |
| **Politique de confidentialité** | Idem |
| **Médiateur de la consommation** | Obligatoire pour toute plateforme B2C (~500 à 1 500 €/an) |
| **Assurance responsabilité civile professionnelle** | Fortement recommandée |
| **Procédure LCB-FT** | Exigée par le prestataire de paiement : gel des avoirs, déclaration de soupçon |

---

## 5. Développement restant côté serveur

L'application mobile est complète. Ce qui manque est l'API — aujourd'hui simulée
en local par le store `src/store/liked.ts`, dont chaque action correspond
directement à un futur point d'entrée.

| Chantier | Détail |
| --- | --- |
| **Authentification réelle** | Aujourd'hui, connexion sur simple e-mail sans mot de passe. À implémenter : hachage Argon2id, limitation des tentatives, 2FA optionnelle, jetons de session à durée limitée |
| **API REST ou GraphQL** | Un point d'entrée par action du store, avec cloisonnement strict par utilisateur |
| **Webhooks** | Paiement, KYC, virement, livraison — aujourd'hui simulés par des minuteurs côté client |
| **Notifications push réelles** | Enregistrement des jetons, envoi serveur |
| **Traitement d'images** | Redimensionnement, format moderne, trois tailles |
| **Modération** | Détection automatique de contrefaçons et de contenus interdits |
| **Tests automatisés** | Les fonctions de `src/lib/` sont pures et directement testables |
| **Supervision** | Sentry pour les erreurs, alertes sur les échecs de paiement |

**Charge estimée** : 2 à 3 mois pour un développeur back-end expérimenté.

---

## 6. Ordre de lancement conseillé

1. **Semaine 1** — Créer la société si ce n'est pas fait, déposer le dossier
   Mangopay et la demande de contrat Colissimo. Ce sont les délais les plus longs.
2. **Semaine 1** — Ouvrir les comptes Apple et Google en parallèle.
3. **Semaines 2 à 8** — Développer l'API en environnement sandbox.
4. **Semaine 6** — Faire rédiger CGU, CGV et politique de confidentialité.
5. **Semaines 9 à 10** — Recette de bout en bout avec de vraies transactions en
   circuit fermé, 50 à 100 testeurs locaux comme prévu au cahier des charges.
6. **Semaine 11** — Passage en production et publication sur les stores.

---

## 7. Budget de démarrage

| Poste | Première année |
| --- | --- |
| Apple Developer | 99 € |
| Google Play | 25 € |
| Domaine et TLS | 30 € |
| Hébergement UE | 600 à 1 800 € |
| E-mails transactionnels | 0 à 300 € |
| SMS de vérification | selon volume, ~50 € pour 1 000 vérifications |
| Médiateur de la consommation | 500 à 1 500 € |
| Rédaction juridique | 1 500 à 3 000 € |
| **Total hors développement** | **≈ 2 800 à 6 800 €** |

Les commissions du prestataire de paiement et les frais Colissimo sont
proportionnels au volume et se déduisent des revenus, pas du budget de départ.
