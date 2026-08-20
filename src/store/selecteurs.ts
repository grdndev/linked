import { useLiked } from './liked';
import type { Annonce, Commande, Conversation, Utilisateur } from '@/types';

export function useMoi(): Utilisateur | null {
  return useLiked((e) => e.utilisateurs.find((u) => u.id === e.sessionId) ?? null);
}

export function useUtilisateur(utilisateurId?: string): Utilisateur | null {
  return useLiked((e) => e.utilisateurs.find((u) => u.id === utilisateurId) ?? null);
}

export function useAnnonce(annonceId?: string): Annonce | null {
  return useLiked((e) => e.annonces.find((a) => a.id === annonceId) ?? null);
}

export function useCommande(commandeId?: string): Commande | null {
  return useLiked((e) => e.commandes.find((c) => c.id === commandeId) ?? null);
}

export function useConversation(conversationId?: string): Conversation | null {
  return useLiked((e) => e.conversations.find((c) => c.id === conversationId) ?? null);
}

export function useEstFavori(annonceId: string): boolean {
  return useLiked((e) => (e.sessionId ? (e.favoris[e.sessionId] ?? []).includes(annonceId) : false));
}

export function useNonLus(): number {
  return useLiked((e) => {
    if (!e.sessionId) return 0;
    return e.conversations.filter(
      (c) =>
        (c.acheteurId === e.sessionId || c.vendeurId === e.sessionId) && !c.luPar.includes(e.sessionId),
    ).length;
  });
}

export function useNotificationsNonLues(): number {
  return useLiked((e) => e.notifications.filter((n) => n.utilisateurId === e.sessionId && !n.lue).length);
}
