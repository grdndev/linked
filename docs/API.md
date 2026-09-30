# API de bêta

JSON UTF-8. Erreur : `{ "erreur": "Message pour l’utilisateur" }`. Les erreurs de validation peuvent fournir `champs`. Session : `Authorization: Bearer <token>`. Réponses sensibles `Cache-Control: no-store`.

| Méthode | Route | Corps / résultat |
|---|---|---|
| GET | `/health` | État du processus et `payments: test-only` |
| POST | `/auth/code` | `{email}` → `{envoye:true}` ; Brevo requis |
| POST | `/auth/verify` | `{email,code,profile?:{pseudo,commune,majeur}}` → `{token,state}` |
| POST | `/auth/logout` | Révocation de la session courante |
| GET | `/state` | Projection publique ou privée de l’état selon la session |
| POST | `/uploads` | Multipart `photo` → `{url}` ; session requise |
| GET | `/media/:fichier` | Photo publique WebP |
| POST | `/commands/:name` | `{args:[...]}` → `{result,state}` |
| POST | `/checkout` | `{annonceId,mode:"main_propre",prixNegocieCents?}` → `{ok,commandeId,checkoutUrl,state}` |
| POST | `/orders/:id/handover` | `{code}` → `{ok,erreur?,state}` |
| POST | `/connect/onboarding` | Session vendeur majeur → `{url}` Stripe Express |
| POST | `/webhooks/stripe` | Corps brut + `Stripe-Signature`, jamais appeler depuis le mobile |
| GET | `/payment-return` | Lien retour vers l’application ; ne valide aucun paiement |

Commandes câblées : `majProfil`, `majPreference`, `majProspection`, `publierAnnonce`, `modifierAnnonce`, `supprimerAnnonce`, `basculerFavori`, `ouvrirConversation`, `envoyerMessage`, `faireOffre`, `repondreOffre` (acceptation/refus), `marquerLu`, `signaler`, `ouvrirLitige`, `repondreLitige`, `evaluer`, `marquerNotificationLue`, `toutMarquerLu`, `sauvegarderRecherche`, `supprimerRecherche`, `marquerRechercheVue`, `modererAnnonce`, `sanctionner`, `traiterSignalement`.

Les signatures d’arguments suivent `ActionsLiked` dans `src/store/liked.ts`. Les schémas Zod serveur sont l’autorité de validation. Seuls les champs autorisés sont retenus. Les photos des annonces doivent avoir été téléversées par le même utilisateur. `incrementerVue` est un no-op, pas un compteur fiable d’audience.

Les autres commandes sont refusées (501), notamment virements locaux, simulation de livraison, validation manuelle KYC, export DAC7 et résolution financière de litiges. Les clés Stripe réelles sont refusées (503).
