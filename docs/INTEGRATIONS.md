# Configuration des intégrations

## Variables mobiles — `.env`

Copier `.env.example`. Ces variables sont publiques et intégrées au bundle :

| Variable | Valeur |
|---|---|
| `EXPO_PUBLIC_API_DRIVER` | `mock` pour démonstration, `http` pour le serveur |
| `EXPO_PUBLIC_API_URL` | URL de l’API sans slash final |

Sur un téléphone physique, `localhost` désigne le téléphone : utiliser l’adresse LAN de l’ordinateur (serveur `HOST=0.0.0.0`) ou une API HTTPS. Redémarrer Expo après modification. En dehors de la recette locale, utiliser HTTPS.

## Serveur — `server/.env`

Copier `server/.env.example`. Les valeurs secrètes restent uniquement sur le serveur :

| Variable | Origine / rôle |
|---|---|
| `AUTH_SECRET` | Générer avec `openssl rand -hex 32` ; HMAC des OTP et jetons |
| `BREVO_API_KEY` | Clé API depuis le compte Brevo |
| `BREVO_SENDER_EMAIL` | Expéditeur authentifié dans Brevo |
| `BREVO_SENDER_NAME` | `Liked` |
| `STRIPE_SECRET_KEY` | Clé `sk_test_…` de l’environnement test |
| `STRIPE_WEBHOOK_SECRET` | Secret `whsec_…` du webhook ou de Stripe CLI |
| `PUBLIC_API_URL` | URL externe de cette API ; utilisée par Checkout et les images |
| `APP_RETURN_URL` | `liked://mes-achats` pour le natif ; URL de l’aperçu pour le web |
| `WEB_ORIGIN` | Origine exacte de l’aperçu web autorisé par CORS |
| `DATABASE_PATH` | Fichier SQLite sur volume persistant |
| `UPLOAD_DIR` | Dossier de photos sur le même volume sauvegardé |

Aucun `.env` réel n’est livré. Les mots de passe de connexion ne doivent pas être utilisés dans ces variables.

## Brevo

Le serveur appelle `POST https://api.brevo.com/v3/smtp/email` pour un code aléatoire à six chiffres, valable dix minutes. Le code n’est jamais renvoyé au mobile ni journalisé. Un renvoi impose une minute d’attente ; cinq erreurs bloquent le code. Chaque e-mail normalisé possède son propre compteur. Des limites par IP complètent ces contrôles.

Configurer un expéditeur validé, idéalement un domaine authentifié. Les e-mails métier (vente, nouveau message, évaluation) et les notifications push distantes restent à implémenter ; seule la notification interne à l’application est disponible pour les événements câblés.

Documentation : https://developers.brevo.com/docs/send-a-transactional-email

## Stripe Connect — exclusivement test

1. Activer Connect dans l’environnement test de Stripe.
2. Configurer la clé secrète de test côté serveur.
3. Créer un webhook `POST /webhooks/stripe`, événements `checkout.session.completed` et `checkout.session.expired`.
4. Pour la recette locale : `stripe listen --forward-to localhost:3001/webhooks/stripe` puis copier son secret dans `server/.env`.
5. Créer deux utilisateurs réels de recette dans Liked, vérifier leurs e-mails.
6. Depuis le profil vendeur, ouvrir **Mon compte vendeur → Configurer mon compte Stripe** et compléter l’onboarding Express avec des données de test Stripe.
7. Publier une annonce, puis l’acheter avec le compte acheteur en main propre.
8. Vérifier le webhook : le statut passe de `paiement_en_attente` à `sequestre` (nom historique dans le modèle), le code est visible uniquement par l’acheteur.
9. Saisir ce code côté vendeur. Le serveur transfère le prix de l’article vers le compte connecté. La protection reste sur la plateforme ; les frais Stripe sont à sa charge.

Stripe Checkout héberge la saisie bancaire ; aucune donnée de carte ne transite par l’API. La page de retour ne confirme jamais le paiement. Le serveur vérifie la signature du webhook, la session, le montant, la devise et le PaymentIntent. Les transferts utilisent une clé d’idempotence et la charge source.

**Ce modèle est un paiement avec transfert différé, pas une prestation juridique de séquestre.** Faire valider le modèle Connect et les conditions de conservation des fonds avec Stripe avant lancement, notamment pour les vendeurs réunionnais. Le serveur livré refuse les clés de paiement réelles. Les litiges gèlent le transfert, mais la résolution financière, les remboursements, les chargebacks et la réconciliation après incident ne sont pas encore implémentés.

Documentation : https://docs.stripe.com/connect/separate-charges-and-transfers

## Apple et Android

Identifiants applicatifs existants : `re.liked.app`. Le projet Expo/EAS du dépôt a été conservé. Vérifier la propriété de ce projet, les certificats et les droits du compte avant une build signée.

Pour une distribution TestFlight : configurer les credentials avec EAS dans sa session authentifiée ou une clé App Store Connect (`.p8`, Key ID, Issuer ID) via le gestionnaire de secrets. Aucune clé Apple n’est nécessaire au code de l’application. Aucun mot de passe Apple n’est embarqué. Ni TestFlight ni Google Play n’ont été publiés lors de cette livraison.

Le profil EAS `production` exige une URL d’API publique ; il ne suffit pas à rendre cette bêta exploitable en production. Les connexions Apple/Google sont à implémenter si retenues.

## Colissimo

Les prix du brief (4,50 / 5,50 / 7 €) restent ceux de la démonstration. Côté serveur, tout checkout Colissimo retourne une indisponibilité explicite. Restent nécessaires : contrat, credentials La Poste, étiquettes, suivi fiable, tâche serveur après livraison +48 h, litiges et annulations.
