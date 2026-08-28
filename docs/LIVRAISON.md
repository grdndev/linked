# Livrer une version au client

## Android — APK d'essai (le plus simple)

Un APK s'installe directement sur n'importe quel téléphone Android (autoriser
« sources inconnues »). C'est le canal recommandé pour la recette client.

```bash
cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew assembleRelease
```

L'APK sort dans `android/app/build/outputs/apk/release/app-release.apk`.
Envoyez-le par WeTransfer / Drive / WhatsApp au client.

> L'APK de recette est signé avec la clé de debug embarquée. Pour le Play Store,
> générer une clé de production (`keytool -genkeypair`) et la déclarer dans
> `android/gradle.properties` — ne jamais la commiter.

## iOS — TestFlight

Il faut un compte Apple Developer (99 €/an). Ensuite :

```bash
npx eas build --platform ios --profile preview
```

puis `npx eas submit -p ios`. Les testeurs reçoivent une invitation TestFlight
par e-mail. Alternative sans EAS : ouvrir `ios/Liked.xcworkspace` dans Xcode,
Product → Archive → Distribute App → TestFlight.

## Recette rapide en local

- iOS : `npx expo run:ios` (simulateur)
- Android : `npx expo run:android` (émulateur ou téléphone branché en USB)

Comptes de démonstration : `demo@liked.re` (membre) et `admin@liked.re`
(back-office). Code de vérification à l'inscription : `123456`.
