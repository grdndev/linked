# Architecture technique

## Socle

| Élément | Choix | Pourquoi |
| --- | --- | --- |
| Framework | React Native 0.81 via Expo SDK 54 | Un seul code pour iOS et Android, mises à jour OTA possibles |
| Navigation | expo-router 6 (routage par fichiers) | URL propres, liens profonds gratuits, structure lisible |
| État | zustand + persistance AsyncStorage | Peu de cérémonie, sélecteurs fins, pas de re-rendus inutiles |
| Typage | TypeScript strict | Le modèle de données est la spécification exécutable |
| Images | expo-image | Cache disque, transitions, décodage hors du fil principal |

Le projet est délibérément **sans backend embarqué** : toute la logique métier vit dans
`src/store/liked.ts`, derrière des interfaces qui correspondent une à une aux futurs
appels d'API. Basculer sur l'API réelle ne change aucun écran.

## Découpage

```
app/                          Écrans (une route = un fichier)
  _layout.tsx                 Polices, amorçage, minuteur de libération des fonds
  (tabs)/                     Accueil · Recherche · Vendre · Messages · Profil
  annonce/[id].tsx            Fiche article
  paiement/[id].tsx           Tunnel d'achat
  commande/[id].tsx           Suivi de commande, code de remise, étiquette
  discussion/[id].tsx         Messagerie et offres
  litige/                     Ouverture et espace d'échange à trois
  admin/                      Back-office (accès réservé au rôle `admin`)

src/
  components/                 Système de composants, aucun style en dur ailleurs
  data/                       Référentiels figés : communes, catégories, marques, jeu d'essai
  lib/                        Fonctions pures et testables
    argent.ts                 Frais de protection, forfaits de port, marge, formatage
    filtreCoordonnees.ts      Masquage des coordonnées avant paiement
    temps.ts                  Délais 48 h, formats relatifs français
  services/                   Adaptateurs tiers, un fichier par prestataire
  store/
    liked.ts                  Entités + règles métier + persistance
    selecteurs.ts             Accès mémoïsés depuis les écrans
  theme/                      Palette, typographie Outfit, espacements, ombres
  types/                      Modèle de données complet, DAC7 inclus
```

## Règles métier centrales

### Frais (`src/lib/argent.ts`)

```
protection = arrondi(prix × 5 %) + 0,80 €
total acheteur = prix + protection + forfait de port éventuel
revenu Liked = protection + (forfait de port − coût transporteur négocié)
versement vendeur = prix de l'article
```

Les forfaits de port par gabarit — 4,50 € / 5,50 € / 7,00 € — et les coûts d'achat
correspondants sont des constantes uniques ; les ajuster après négociation avec La Poste
ne demande qu'une seule modification.

### Cycle de vie d'une commande

```
paiement_en_attente
   └─ paiement accepté, fonds séquestrés ─────────► sequestre
        ├─ main propre : code à 4 chiffres validé ► livre ──► finalisee (versement immédiat)
        └─ Colissimo   : étiquette_emise ► expedie ► livre ──► finalisee (livraison + 48 h)
                                                        └───► litige (versement suspendu)
                                                                 └─► finalisee | remboursee
```

Le passage `livre → finalisee` est déclenché soit par la validation du code de remise,
soit par un minuteur qui tourne dans `app/_layout.tsx` et appelle `libererFondsSiEchu()`.
Un litige efface `liberableLe`, ce qui gèle définitivement la libération automatique.

### Filtrage des coordonnées

`filtrerCoordonnees()` masque e-mails, numéros de téléphone (formats réunionnais et
métropolitains, y compris espacés ou écrits « nom (at) domaine point fr ») et identifiants
de réseaux sociaux. Le filtre s'applique tant que `conversation.filtrageLeve` est faux ;
le paiement le passe à vrai, ce qui libère l'échange pour organiser la remise.

Un message masqué déclenche l'insertion d'un message système qui explique pourquoi —
le filtrage silencieux est perçu comme un bug par les utilisateurs.

## Performance

- Les listes du catalogue rendent des cartes à hauteur fixe et des images `expo-image`
  avec cache disque, ce qui évite les sauts de mise en page sur connexion lente.
- Les sélecteurs zustand sont granulaires : modifier une conversation ne re-rend pas
  le catalogue.
- Le calcul du fil d'accueil personnalisé est mémoïsé sur les seules entrées qui le
  concernent (annonces, favoris, commune du membre).

En production, l'API doit servir des images déjà redimensionnées et en format moderne
(AVIF/WebP), en trois tailles : vignette de grille, galerie, plein écran.

## Sécurité

- Aucun secret dans le bundle mobile : les clés Mangopay et La Poste vivent côté API.
- Aucune donnée de carte ne transite par l'application ni par les serveurs Liked ;
  la saisie se fait dans le composant hébergé du PSP.
- `expo-secure-store` est provisionné pour le jeton de session (Keychain / Keystore).
- Le cloisonnement des données est appliqué côté API : le mobile ne demande jamais
  une ressource « au nom de » quelqu'un d'autre.

## Ce qui reste à faire pour la production

1. Implémenter le driver `http` des adaptateurs de `src/services/` contre l'API Liked.
2. Brancher les webhooks du PSP (paiement confirmé, KYC validé, virement exécuté) et
   ceux du transporteur (colis livré) — aujourd'hui simulés côté client.
3. Remplacer la persistance AsyncStorage par un cache de requêtes API.
4. Notifications push réelles (jetons Expo Push ou APNs/FCM directs).
5. Suite de tests : les fonctions de `src/lib/` sont pures et se testent sans rendu.
