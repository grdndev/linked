# liked

Application React Native / Expo pour acheter et vendre des vêtements de seconde main à La Réunion. Interface française, Outfit, palette encre / corail / sable.

**Statut : bêta technique, pas une marketplace ouverte au public.** Les écrans de démonstration couvrent le brief ; le serveur raccorde un premier parcours multiutilisateur en main propre avec Stripe de test. Voir la matrice précise dans [Livraison](docs/LIVRAISON.md).

## Tester l’application

Node 22.13+ recommandé.

```sh
npm ci
npm start
```

Ouvrir avec Expo Go compatible SDK 54 ou une development build. Pour le navigateur : `npm run web`. Pour une build native locale : `npm run ios` / `npm run android` (Xcode / Android SDK nécessaires).

Par défaut, `EXPO_PUBLIC_API_DRIVER=mock` : comptes fictifs `demo@liked.re` et `admin@liked.re`, code d’inscription `123456`. Aucun e-mail ni paiement réel. Le bandeau de démonstration reste visible. Apple et Google ne sont plus présentés comme des connexions actives alors qu’ils ouvraient un compte fictif.

## Connecter le serveur

```sh
npm --prefix server ci
cp server/.env.example server/.env
cp .env.example .env
```

Configurer les variables de [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md), puis :

```sh
npm run api
```

Dans `.env` à la racine, définir `EXPO_PUBLIC_API_DRIVER=http` et `EXPO_PUBLIC_API_URL`. Redémarrer Expo. Le serveur démarre avec une base vide et ne charge jamais les comptes de démonstration. Les sessions natives sont conservées dans Keychain/Keystore ; la prévisualisation web garde son jeton dans sessionStorage, limité à l’onglet et conservé au retour de Stripe.

Les mots de passe des comptes Stripe, Brevo et Apple ne sont pas des clés API. Aucun identifiant fourni dans la conversation n’est enregistré dans le dépôt.

## Vérifier

```sh
npm run typecheck
npm --prefix server run typecheck
npm test
npm run export
```

Les tests couvrent l’OTP, les sessions, les droits d’accès, les profils publics, les frais, les doubles achats, les webhooks idempotents, le code de remise, les litiges et les évaluations. Les appels Stripe/Brevo sont remplacés dans les tests ; une recette avec leurs véritables environnements test reste nécessaire.

## Structure

- `app/` : écrans iOS, Android et web, Expo Router.
- `src/components/`, `src/theme/` : composants accessibles et identité visuelle.
- `src/store/liked.ts` : démonstration locale ; `src/store/http.ts` : actions distantes et rafraîchissement.
- `server/src/` : API TypeScript, SQLite durable, OTP Brevo, Stripe Connect / Checkout.
- `server/test/` : tests métier et HTTP.
- `.github/workflows/check.yml` : compilation TypeScript, tests et exports.

## Documentation

- [Livraison et limites](docs/LIVRAISON.md)
- [Configuration Stripe / Brevo / Apple](docs/INTEGRATIONS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API HTTP](docs/API.md)
- [Avant ouverture publique](docs/MISE-EN-PRODUCTION.md)

Le serveur de bêta est prévu pour **une seule instance**, sur un volume persistant. SQLite et les photos doivent être sauvegardés ensemble. Ne pas déployer tel quel sur un filesystem éphémère, ni ouvrir les paiements réels. Les clés `sk_live_` sont refusées.

## Tester sur iPhone

Ouvrir l’atelier depuis le bandeau « Espace de test ». Les scénarios achat, carte refusée, livraison et remboursement sont disponibles sans clés en mode mock. Voir [le guide iPhone](docs/TEST-IPHONE.md) pour le partage Safari et TestFlight. L’API inclut les remboursements Stripe avant expédition, la livraison simulée et la file d’e-mails transactionnels Brevo. Les clés réelles de recette et l’hébergement de l’API restent requis pour ces appels externes.

## Administration web indépendante

Le dashboard est dans `dashboard/` et se construit avec `npm run build:web` (ou `npm run build:dashboard`). Son adresse est `/dashboard/`, avec une connexion réservée aux administrateurs. Les écrans de gestion ne sont pas embarqués dans le mobile. Voir [le manuel du dashboard](docs/BACK-OFFICE.md). Colissimo est désactivé par défaut ; son activation dans les réglages ouvre uniquement le transport simulé de recette.
