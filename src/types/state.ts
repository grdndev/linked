import type {
  AdresseLivraison,
  Annonce,
  CanalEvenement,
  Commande,
  Conversation,
  EntreeJournalAdmin,
  Evaluation,
  FiltresRecherche,
  IssueLitige,
  Litige,
  Message,
  ModeRemise,
  MotifLitige,
  MouvementPortefeuille,
  Notification,
  RechercheSauvegardee,
  Signalement,
  Utilisateur,
} from './index';

export interface EtatPersiste {
  utilisateurs: Utilisateur[];
  annonces: Annonce[];
  conversations: Conversation[];
  messages: Message[];
  commandes: Commande[];
  litiges: Litige[];
  evaluations: Evaluation[];
  favoris: Record<string, string[]>; // utilisateurId -> annonceIds
  recherchesSauvegardees: RechercheSauvegardee[];
  signalements: Signalement[];
  notifications: Notification[];
  mouvements: MouvementPortefeuille[];
  journalAdmin: EntreeJournalAdmin[];
  sessionId: string | null;
  consentementMesure: boolean;
}
