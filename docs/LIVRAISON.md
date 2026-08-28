# Livrer une version au client

## iPhone / Android — Expo Go (recette client, gratuit)

C'est le canal utilisé pour la recette. Aucun compte Apple Developer nécessaire.

**Côté client :**

1. Installer **Expo Go** depuis l'App Store (iPhone) ou le Play Store (Android).
2. Ouvrir le lien de recette envoyé par Liked.
3. L'application se charge et s'utilise normalement.

**Côté équipe — publier une nouvelle version :**

```bash
cd ~/Developer/liked && eas update --branch preview --message "Ce qui change"
```

La mise à jour est instantanée : le client n'a rien à réinstaller, il relance
simplement l'application depuis Expo Go.

Comptes de démonstration : `demo@liked.re` (membre vérifié, Saint-Pierre) et
`admin@liked.re` (back-office). Code de vérification à l'inscription : `123456`.

## iPhone — TestFlight (vraie application)

Pour une application autonome avec l'icône Liked sur l'écran d'accueil, il faut
un compte Apple Developer (99 €/an) :

```bash
eas build --platform ios --profile production
```

puis `eas submit -p ios`. Les testeurs reçoivent une invitation TestFlight par
e-mail. Les testeurs internes y ont accès immédiatement ; les testeurs externes
passent par une revue Apple (1 à 3 jours).

## Android — APK d'essai

```bash
eas build --platform android --profile preview
```

Produit un APK téléchargeable, installable directement sur un téléphone Android
(autoriser les « sources inconnues »). Pour le Play Store, générer une clé de
production et passer sur le profil `production`.

## Recette en local

- iOS : `npx expo run:ios`
- Android : `npx expo run:android`
- Serveur de développement seul : `npx expo start`

## Pièges connus

- **Ne pas placer le dépôt dans un dossier synchronisé iCloud** (Bureau,
  Documents) : iCloud téléverse `node_modules` en continu, sature les I/O et
  fait échouer `npm install`, `expo prebuild` et `xcodebuild` avec des erreurs
  de disque. Emplacement recommandé : `~/Developer/liked`.
- `metro.config.js` force le profil de transformation `default` : sans lui, le
  binaire hermesc de react-native 0.81 refuse les champs de classe privés `#x`
  utilisés par la Nouvelle Architecture.
