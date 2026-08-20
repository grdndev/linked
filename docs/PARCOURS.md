# Parcours utilisateur de référence

Les trois parcours du chapitre 5 du cahier des charges, tels qu'ils se déroulent
réellement dans l'application.

## 1 · Achat avec remise en main propre

| # | Écran | Ce qui se passe |
| --- | --- | --- |
| 1 | Accueil / Recherche | L'acheteuse repère une robe à Saint-Denis |
| 2 | `annonce/[id]` | Prix affiché, protection acheteur détaillée, profil du vendeur |
| 3 | `discussion/[id]` | Question posée ; les coordonnées échangées sont masquées |
| 4 | `discussion/[id]` | « Proposer un prix » → 24 € ; le vendeur accepte |
| 5 | `paiement/[id]` | Mode « main propre » (gratuit) ; total = 24 € + 2,00 € de protection |
| 6 | `commande/[id]` | **Code à 4 chiffres** affiché en grand, copiable |
| 7 | — | Le filtrage de la messagerie est levé : on peut convenir du rendez-vous |
| 8 | Rencontre | L'acheteuse vérifie l'article **puis** donne son code |
| 9 | `commande/[id]` (vendeur) | Le vendeur saisit le code → fonds versés immédiatement |
| 10 | `evaluation/[id]` | Évaluations croisées, note sur 5 et commentaire |

Le point clé : le code n'est communiqué qu'après vérification physique de l'article.
C'est ce geste qui remplace la confiance aveugle des groupes Facebook.

## 2 · Achat avec envoi Colissimo

| # | Écran | Ce qui se passe |
| --- | --- | --- |
| 1 | `paiement/[id]` | Mode « Colissimo » ; le forfait dépend du gabarit choisi par le vendeur |
| 2 | `paiement/[id]` | Saisie de l'adresse de livraison et du téléphone (transporteur uniquement) |
| 3 | `commande/[id]` (vendeur) | « Générer mon étiquette Colissimo » → PDF prépayé + numéro de suivi |
| 4 | Bureau de poste | Dépôt du colis ; le vendeur marque « J'ai déposé le colis » |
| 5 | `commande/[id]` (acheteur) | Le suivi s'affiche étape par étape |
| 6 | — | Livraison confirmée par le tracking → compte à rebours de **48 h** |
| 7 | — | Sans litige, les fonds partent automatiquement sur le portefeuille du vendeur |
| 8 | `evaluation/[id]` | Évaluations croisées |

Si un litige est ouvert pendant les 48 h, la libération est gelée jusqu'à décision.

## 3 · Parcours vendeur

| # | Écran | Ce qui se passe |
| --- | --- | --- |
| 1 | `inscription` | E-mail ou téléphone, code de vérification, commune, majorité déclarée |
| 2 | `(tabs)/vendre` | Dépôt en **une seule page** : photos, titre, catégorie, taille, marque, état, couleur, prix, gabarit, modes de remise |
| 3 | — | Publication immédiate ; l'encart vert rappelle que la vente est gratuite |
| 4 | `discussion/[id]` | Réception d'une offre → accepter, refuser ou contre-proposer |
| 5 | `commande/[id]` | Remise en main propre (saisie du code) ou envoi (étiquette) |
| 6 | `portefeuille` | Le solde est crédité après confirmation |
| 7 | `kyc` | Au premier retrait : pièce d'identité, adresse, NIF → vérification par le PSP |
| 8 | `portefeuille` | Virement vers le compte bancaire une fois le KYC validé |

Le dépôt d'annonce tient en moins de trois minutes : un seul défilement, aucune étape
intermédiaire, aucun champ inutile.

## Cas particuliers couverts

- **Mineur** : la case de majorité conditionne l'accès au dépôt d'annonce (contrainte KYC du PSP).
- **Litige** : formulaire guidé avec motif, description et jusqu'à 4 photos, puis espace
  d'échange à trois avec le support ; issues possibles = remboursement total, partiel,
  versement au vendeur ou retour de l'article, toujours motivées et journalisées.
- **Signalement** : annonce, message ou utilisateur, en un geste depuis l'écran concerné.
- **Recherche sauvegardée** : alerte à chaque nouvelle annonce correspondante.
