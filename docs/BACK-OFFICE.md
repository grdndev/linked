# Manuel du back-office

Accès : se connecter avec un compte dont le rôle est `admin` (`admin@liked.re` en
recette), puis Profil → **Back-office Liked**. Toute personne sans ce rôle voit un
écran de refus.

## Tableau de bord

Six indicateurs, recalculés en direct :

| Indicateur | Définition |
| --- | --- |
| Inscrits | Nombre total de comptes |
| Annonces en ligne | Annonces au statut `en_ligne` |
| Transactions | Toutes commandes confondues |
| Volume d'affaires | Somme des montants payés par les acheteurs |
| **Revenus Liked** | Frais de protection + marge sur les frais de port |
| Fonds séquestrés | Montants bloqués chez le prestataire, non encore versés |

## Modération et signalements

Chaque signalement affiche la cible, le motif, l'auteur et l'ancienneté.

| Action | Effet |
| --- | --- |
| **Voir** | Ouvre l'annonce telle que la voient les membres |
| **Masquer** | L'annonce sort du catalogue, le vendeur peut la corriger |
| **Supprimer** | Retrait définitif |
| **Classer sans suite** | Le signalement est traité sans sanction |

Toute action est horodatée et écrite dans le journal d'administration avec le motif.

## Litiges

La liste montre les litiges ouverts, en examen et résolus, avec le montant séquestré.

1. **Ouvrir la conversation** — accès à l'espace d'échange à trois (acheteur, vendeur,
   support), y compris les photos jointes. Répondre depuis cet écran fait passer le
   litige en « en examen ».
2. **Trancher** — quatre issues possibles :

| Issue | Conséquence financière |
| --- | --- |
| Remboursement total | L'acheteur récupère l'intégralité de ce qu'il a payé |
| Remboursement partiel | Montant saisi remboursé, le reste versé au vendeur |
| Versement au vendeur | Litige non fondé, les fonds sont libérés normalement |
| Retour article + remboursement | L'article repart chez le vendeur, l'acheteur est remboursé |

La **motivation est obligatoire** (10 caractères minimum) : elle est envoyée aux deux
parties et conservée dans le journal. Les décisions sont donc traçables et opposables.

## Utilisateurs et KYC

La fiche d'un membre donne l'identifiant, l'e-mail, le solde du portefeuille, les
agrégats DAC7 de l'année et le NIF.

**Statut KYC** — reflète l'état du dossier chez le prestataire de paiement. Le modifier
ici est un rattrapage manuel : la source de vérité reste le webhook du PSP.

**Sanctions** — Lever · Avertir · Suspendre · Bannir. Un compte banni ne peut plus se
connecter ; un compte suspendu conserve ses données mais perd l'accès aux transactions.

## Export DAC7

La directive européenne DAC7 impose de déclarer chaque vendeur dépassant, sur l'année
civile, **30 transactions ou 2 000 € encaissés**, et de lui adresser un récapitulatif
individuel.

- **Générer le fichier annuel** produit un CSV — identité complète, adresse, NIF,
  montant annuel, nombre de transactions — que l'on partage vers l'outil comptable.
  Le format XML officiel est produit par la chaîne back-office à partir des mêmes champs.
- **Envoyer les récapitulatifs individuels** met en file l'envoi à chaque vendeur concerné.

Les agrégats sont mis à jour automatiquement à chaque versement, dans `verserAuVendeur()`.

## Journal d'administration

Toute action d'administration — modération, sanction, changement de statut KYC,
résolution de litige, export DAC7 — y est inscrite avec son auteur, sa cible, son motif
et son horodatage. Le journal n'est pas modifiable depuis l'interface.
