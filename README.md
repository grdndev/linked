<div align="center">

# liked

**La place de marché de vêtements d'occasion de La Réunion.**
Application mobile React Native (iOS + Android).

</div>

---

## Le projet

Liked est une place de marché entre particuliers (C2C) dédiée à l'achat et à la vente
de vêtements de seconde main, **exclusivement à La Réunion (974)**. Le service s'inspire
du modèle Vinted mais l'adapte aux réalités locales : forte culture de la remise en main
propre, réseau de points relais quasi inexistant, distances courtes.

**La vente est gratuite pour le vendeur.** La plateforme se rémunère par les frais de
protection acheteur (5 % + 0,80 €) et par une marge sur les frais d'envoi.

La proposition de valeur centrale face aux groupes Facebook : **le paiement est séquestré**
et n'est versé au vendeur qu'après confirmation de la remise ou de la livraison.

## Périmètre couvert (V1)

| Chapitre du cahier des charges | Où c'est implémenté |
| --- | --- |
| §4.1 Comptes, KYC, DAC7 | [inscription](app/inscription.tsx), [kyc](app/kyc.tsx), [`DonneesDac7`](src/types/index.ts) |
| §4.2 Dépôt d'annonce en une page | [vendre](app/(tabs)/vendre.tsx) |
| §4.3 Catalogue, recherche, favoris | [accueil](app/(tabs)/index.tsx), [recherche](app/(tabs)/recherche.tsx), [recherches enregistrées](app/recherches.tsx) |
| §4.4 Messagerie, offres, filtrage | [discussion](app/discussion/[id].tsx), [`filtrerCoordonnees`](src/lib/filtreCoordonnees.ts) |
| §4.5 Paiement, séquestre, frais | [paiement](app/paiement/[id].tsx), [`calculerPanier`](src/lib/argent.ts), [`psp`](src/services/psp.ts) |
| §4.6 Main propre & Colissimo | [commande](app/commande/[id].tsx), [`transporteur`](src/services/transport.ts) |
| §4.7 Évaluations et litiges | [évaluation](app/evaluation/[id].tsx), [litige](app/litige/[id].tsx) |
| §4.8 Notifications paramétrables | [notifications](app/notifications.tsx), [réglages](app/reglages/notifications.tsx) |
| §4.9 Back-office | [admin](app/admin/) — tableau de bord, modération, litiges, KYC, export DAC7, journal |
| §6.4 RGPD | [confidentialité](app/reglages/confidentialite.tsx) — export, effacement, consentements |

Les trois parcours de référence du chapitre 5 sont détaillés dans [docs/PARCOURS.md](docs/PARCOURS.md).

## Démarrer

```bash
npm install
```

```bash
npx expo run:ios
```

```bash
npx expo run:android
```

Comptes de démonstration (écran de connexion) :

- `demo@liked.re` — membre vérifié, Saint-Pierre, portefeuille approvisionné
- `admin@liked.re` — accès au back-office

Le code de vérification à l'inscription est `123456` en environnement de recette.

## Architecture

```
app/                    Écrans et navigation (expo-router, routage par fichiers)
src/
  components/           Système de composants (Bouton, Champ, Puce, CarteAnnonce…)
  data/                 Référentiels : 24 communes, arborescence catégories, marques
  lib/                  Règles pures : frais, filtrage des coordonnées, dates, identifiants
  services/             Adaptateurs tiers : PSP, transporteur, vérification, mesure d'audience
  store/                État applicatif et règles métier (zustand + persistance)
  theme/                Jetons de marque : palette, typographie Outfit, espacements
  types/                Modèle de données complet
```

Le détail est dans [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Intégrations tierces

L'application ne parle **jamais** directement à Mangopay ou à La Poste : elle passe par
des adaptateurs (`src/services/`) dont le driver par défaut est `mock`, ce qui permet de
dérouler tous les parcours de bout en bout sans clé d'API. Le passage en production
consiste à basculer `EXPO_PUBLIC_API_DRIVER=http` et à implémenter les mêmes interfaces
côté API Liked, seul endroit où vivent les secrets.

Voir [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Marque

| Nom | Hex | Usage |
| --- | --- | --- |
| Encre | `#0B3B3C` | Textes, en-têtes, fonds sombres |
| Corail | `#FF5E5B` | Couleur d'action **unique** : achat, cœur favori, liens actifs |
| Sable | `#F6F2EC` | Fonds de page et de sections |
| Blanc | `#FFFFFF` | Cartes produits, champs de formulaire |

Typographie **Outfit** (300 → 600). Ton tutoyé, direct et chaleureux, libellés d'action
explicites (« Acheter », « Proposer un prix », « Confirmer la remise »).

Le corail ne sert jamais de fond de page entier. L'icône d'application est le cœur corail
du point du « i » — le geste signature de la marque.

## Documentation

- [Architecture technique](docs/ARCHITECTURE.md)
- [Parcours utilisateur de référence](docs/PARCOURS.md)
- [Intégrations tierces](docs/INTEGRATIONS.md)
- [Manuel du back-office](docs/BACK-OFFICE.md)
- [Conformité RGPD et DAC7](docs/CONFORMITE.md)

## Emplacement du projet

Ne pas placer ce dépôt dans un dossier synchronisé iCloud (Bureau, Documents) :
iCloud tente de téléverser `node_modules` en continu, ce qui sature les I/O et fait
échouer `npm install`, `expo prebuild` et `xcodebuild` avec des erreurs de disque.
Emplacement recommandé : `~/Developer/liked`.
