# Intégrations tierces

## Principe

L'application mobile ne dialogue **jamais** directement avec un prestataire tiers.
Chaque service est décrit par une interface TypeScript dans `src/services/`, avec un
driver `mock` qui permet de dérouler tous les parcours sans clé d'API. En production,
c'est l'API Liked qui appelle les prestataires : c'est le seul endroit où vivent les
secrets, et le seul point à auditer.

```
Application mobile ──► API Liked ──► Mangopay / La Poste / Brevo / Twilio
     (aucun secret)      (secrets)
```

## Paiement, séquestre et KYC — `src/services/psp.ts`

**Candidats : Mangopay, Lemonway.** Le prestataire doit être agréé établissement de
monnaie électronique pour l'encaissement pour compte de tiers.

| Méthode de l'interface | Appel Mangopay correspondant |
| --- | --- |
| `creerIntentionPaiement` | `POST /payins/card/direct` (avec 3-D Secure) |
| `sequestrer` | Crédit du wallet technique Liked, fonds non transférables |
| `libererVersVendeur` | `POST /transfers` wallet Liked → wallet vendeur |
| `rembourser` | `POST /payins/{id}/refunds` |
| `virerVersBanque` | `POST /payouts/bankwire` (exige un KYC `VALIDATED`) |
| `soumettreKyc` | `POST /kyc/documents` + upload des pages |

**À brancher côté API** : les webhooks `PAYIN_NORMAL_SUCCEEDED`, `KYC_SUCCEEDED`,
`KYC_FAILED`, `PAYOUT_NORMAL_SUCCEEDED`. Ils sont aujourd'hui simulés par des minuteurs
côté client, ce qui est acceptable en recette mais pas en production.

**Contraintes structurantes** :
- Un vendeur mineur ne peut pas passer le KYC : la vente lui est fermée dès l'inscription.
- Le KYC est exigé **avant le premier retrait**, pas avant la première vente — c'est ce
  que fait `verserAuVendeur()` en basculant le statut de `non_requis` à `a_fournir`.
- Aucune donnée de carte ne doit toucher les serveurs Liked : la saisie se fait dans le
  composant hébergé du PSP.

## Expédition — `src/services/transport.ts`

**API La Poste / Colissimo.**

| Méthode | Appel correspondant |
| --- | --- |
| `genererEtiquette` | `POST /sls-ws/SlsServiceWSRest/2.0/generateLabel` → PDF + numéro de suivi |
| `suivre` | `GET /suivi/v2/idships/{numero}` |

L'étiquette doit être stockée côté API et servie au vendeur par une URL signée à durée
limitée, jamais en accès public. Le passage du colis à l'état livré déclenche le
compte à rebours de 48 heures avant versement.

Les forfaits facturés à l'acheteur (4,50 € / 5,50 € / 7,00 €) et les coûts d'achat
négociés sont des constantes dans `src/lib/argent.ts` : la marge est la différence.
Après négociation tarifaire avec La Poste, seule cette table change.

## E-mails transactionnels

**Candidats : Brevo, Postmark.** Modèles à prévoir, un par événement de `CanalEvenement` :
nouveau message, offre reçue, article vendu, étiquette disponible, colis livré, code de
remise, fonds versés, évaluation reçue, alerte de recherche.

Les préférences par canal sont stockées sur l'utilisateur (`preferences.email`) et
respectées par `notifier()` dans `src/store/liked.ts`. La prospection commerciale est
un consentement séparé, désactivé par défaut.

## SMS et vérification — `src/services/verification.ts`

**Candidats : Twilio Verify, Vonage.** Code à 6 chiffres, expiration courte, limitation
du nombre de tentatives côté API. En recette, le driver local accepte `123456`.

## Notifications push

Expo Push (jetons `ExponentPushToken`) ou APNs/FCM directs. Le module `expo-notifications`
est déjà déclaré dans `app.json` avec l'icône et la couleur corail de la marque ; il reste
à enregistrer le jeton à la connexion et à le transmettre à l'API.

## Mesure d'audience — `src/services/analytique.ts`

**Candidats : Matomo, Plausible.** Aucun événement n'est émis tant que l'utilisateur n'a
pas donné son consentement dans Réglages → Confidentialité. Aucune donnée personnelle
n'est envoyée : seuls des événements agrégés (`inscription`, `annonce_publiee`, `achat`).

## Variables d'environnement

| Variable | Valeurs | Effet |
| --- | --- | --- |
| `EXPO_PUBLIC_API_DRIVER` | `mock` (défaut) · `http` | Bascule les adaptateurs vers l'API réelle |
| `EXPO_PUBLIC_API_URL` | URL | Base de l'API Liked |
| `EXPO_PUBLIC_PSP` | `mangopay` · `lemonway` | Prestataire de paiement retenu |

Seules des valeurs `EXPO_PUBLIC_*` sont lisibles par l'application : par construction,
aucun secret ne peut se retrouver dans le bundle.
