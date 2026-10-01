# Boutique web Liked

## Trois espaces

- `/boutique/` : catalogue public, recherche, filtres par univers, catégorie, commune, état et budget, tri, galeries produit, création de compte après le choix d’un article, récapitulatif et commandes.
- `/bienvenue` : application mobile web existante.
- `/dashboard/` : administration web avec session et autorisations séparées.

Les trois interfaces lisent la même API. Le catalogue utilise `/catalogue`, une réponse publique limitée aux annonces en ligne de vendeurs actifs et à leur profil public. Aucune commande, adresse e-mail ou donnée financière n’y est exposée. Les annonces du vendeur fictif de bêta portent une mention de démonstration et ne peuvent être vendues en réel.

Le site et le mobile partagent la session Liked dans le même onglet. L’administration utilise sa propre session. Les liens d’article et de récapitulatif conservent l’identifiant de la pièce à travers connexion et rechargement. Les montants sont recalculés par le serveur. Le retour Stripe vers `/boutique/?page=compte` ne prouve pas le paiement : seule la confirmation signée de Stripe modifie le statut.

## État de la livraison

Le catalogue peut être publié au public immédiatement. Les encaissements réels ne sont pas activés tant que l’activation Stripe, le serveur permanent, les comptes vendeurs et les données réelles ne sont pas prêts. Le serveur actuel reste celui de la bêta sur le Mac ; les achats web sont fermés dans cet environnement. Les essais privés de l’application mobile restent disponibles.

## Activer les paiements réels

1. Le titulaire termine les démarches du compte Stripe réel : activation des produits, identité et profil de l’entreprise. Vérifier les capacités Connect et les encaissements/versements.
2. Déployer l’API sur un serveur permanent HTTPS avec un stockage persistant et des sauvegardes pour SQLite et les photos. Cette architecture utilise une seule instance API. Ne pas utiliser le tunnel temporaire du Mac en production.
3. Préparer une base de production distincte. Ne pas réutiliser les comptes Stripe, paiements, commandes ou annonces fictives de la bêta. Les comptes clients et les annonces authentiques peuvent faire l’objet d’une migration explicitement vérifiée.
4. Configurer uniquement côté serveur les clés réelles, le webhook signé réel, Brevo, les origines et URLs permanentes. Aucun secret dans `EXPO_PUBLIC_*`.
5. `PAYMENTS_MODE=live`, `PUBLIC_PAYMENTS_ENABLED=true`, `SHIPPING_DRIVER=disabled`. Retirer `BETA_ALLOWED_EMAILS` et `BETA_SELLER_STRIPE_ID`. Colissimo reste désactivé tant que son intégration réelle n’est pas faite.
6. Le démarrage vérifie l’environnement, refuse une base déjà marquée test, refuse les annonces de démonstration et vérifie que Stripe autorise encaissements et versements. Chaque vendeur doit terminer son onboarding Connect réel.
7. Finaliser les informations commerciales applicables à la place de marché, les mentions légales et les conditions avec le titulaire, puis effectuer une recette réelle contrôlée par le titulaire : paiement, confirmation, remise, reversement et remboursement. Aucun débit réel n’a été effectué automatiquement pendant le développement.

## Vérification et construction

`npm run typecheck`, `npm --prefix server run typecheck`, `npm test`.

`EXPO_PUBLIC_API_URL=https://… npm run build:boutique` construit seulement le site dans `dist/boutique`. `npm run build:web` construit mobile, dashboard et boutique. Le serveur local `server/scripts/preview-admin.ts` sert une base fictive isolée sans clés externes et affiche les OTP de recette dans son terminal.

Les tests vérifient notamment l’absence de données privées dans le catalogue, la fermeture des achats web en mode test, les montants imposés par le serveur, le retour Stripe sans redirection arbitraire, le rejet des événements Stripe d’un autre mode et la séparation des bases test/réel.
