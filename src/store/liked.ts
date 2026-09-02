import { create } from 'zustand';

import {
  ANNONCES_SEED,
  CONVERSATIONS_SEED,
  EVALUATIONS_SEED,
  MESSAGES_SEED,
  UTILISATEURS_SEED,
} from '@/data/seed';
import { calculerPanier, euros } from '@/lib/argent';
import { AVERTISSEMENT_FILTRE, filtrerCoordonnees } from '@/lib/filtreCoordonnees';
import { codeRemise as genererCode, id, reference } from '@/lib/ids';
import { DELAI_LIBERATION_MS, DELAI_LITIGE_MS, maintenant } from '@/lib/temps';
import { analytique } from '@/services/analytique';
import { psp } from '@/services/psp';
import { transporteur } from '@/services/transport';
import { verification } from '@/services/verification';
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
} from '@/types';
import { ecrireEtat, effacerEtat, lireEtat } from './persistance';

interface EtatPersiste {
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

interface ActionsLiked {
  amorcer: () => Promise<void>;
  reinitialiser: () => Promise<void>;

  // — Comptes (§4.1)
  demanderCode: (destination: string, canal: 'email' | 'sms') => Promise<boolean>;
  inscrire: (input: {
    pseudo: string;
    email: string;
    telephone?: string;
    commune: string;
    majeur: boolean;
    code: string;
  }) => Promise<{ ok: boolean; erreur?: string }>;
  connecter: (email: string) => Promise<{ ok: boolean; erreur?: string }>;
  connecterAvec: (fournisseur: 'google' | 'apple') => Promise<{ ok: boolean }>;
  deconnecter: () => void;
  majProfil: (patch: Partial<Utilisateur>) => void;
  majPreference: (canal: 'email' | 'push', evenement: CanalEvenement, valeur: boolean) => void;
  majProspection: (valeur: boolean) => void;
  autoriserMesure: (valeur: boolean) => void;
  supprimerCompte: () => Promise<void>;
  exporterMesDonnees: () => string;

  // — KYC & portefeuille (§4.1, §4.5)
  soumettreKyc: (documents: { type: 'identite_recto' | 'identite_verso' | 'justificatif_domicile'; uri: string }[], dac7: Partial<Utilisateur['dac7']>) => Promise<void>;
  demanderVirement: (montantCents: number) => Promise<{ ok: boolean; erreur?: string }>;

  // — Annonces (§4.2)
  publierAnnonce: (brouillon: Omit<Annonce, 'id' | 'vendeurId' | 'statut' | 'publieeLe' | 'favoris' | 'vues' | 'signalements'>) => string;
  modifierAnnonce: (annonceId: string, patch: Partial<Annonce>) => void;
  supprimerAnnonce: (annonceId: string) => void;
  incrementerVue: (annonceId: string) => void;

  // — Catalogue (§4.3)
  basculerFavori: (annonceId: string) => void;
  sauvegarderRecherche: (nom: string, filtres: FiltresRecherche, alerte: boolean) => void;
  supprimerRecherche: (rechercheId: string) => void;
  marquerRechercheVue: (rechercheId: string) => void;

  // — Messagerie (§4.4)
  ouvrirConversation: (annonceId: string) => string;
  envoyerMessage: (conversationId: string, texte: string) => void;
  faireOffre: (conversationId: string, montantCents: number) => void;
  repondreOffre: (messageId: string, reponse: 'acceptee' | 'refusee', contrePropositionCents?: number) => void;
  marquerLu: (conversationId: string) => void;
  signaler: (type: Signalement['type'], cibleId: string, motif: string, detail?: string) => void;

  // — Achat, séquestre (§4.5, §4.6)
  passerCommande: (input: {
    annonceId: string;
    mode: ModeRemise;
    adresse?: AdresseLivraison;
    prixNegocieCents?: number;
  }) => Promise<{ ok: boolean; commandeId?: string; erreur?: string }>;
  genererEtiquette: (commandeId: string) => Promise<void>;
  marquerExpedie: (commandeId: string) => void;
  simulerLivraison: (commandeId: string) => void;
  validerCodeRemise: (commandeId: string, code: string) => Promise<{ ok: boolean; erreur?: string }>;
  /** L'acheteur confirme que tout est conforme : versement immédiat (§4.6). */
  confirmerReception: (commandeId: string) => Promise<{ ok: boolean; erreur?: string }>;
  libererFondsSiEchu: () => Promise<void>;
  annulerCommande: (commandeId: string, motif: string) => Promise<void>;

  // — Litiges & évaluations (§4.7)
  ouvrirLitige: (commandeId: string, motif: MotifLitige, description: string, photos: string[]) => string;
  repondreLitige: (litigeId: string, texte: string) => void;
  resoudreLitige: (litigeId: string, issue: IssueLitige, montantCents: number, motivation: string) => Promise<void>;
  evaluer: (commandeId: string, note: number, commentaire: string) => void;

  // — Notifications (§4.8)
  marquerNotificationLue: (notificationId: string) => void;
  toutMarquerLu: () => void;

  // — Back-office (§4.9)
  modererAnnonce: (annonceId: string, action: 'masquer' | 'retablir' | 'supprimer', motif: string) => void;
  sanctionner: (utilisateurId: string, statut: Utilisateur['statut'], motif: string) => void;
  traiterSignalement: (signalementId: string) => void;
  majStatutKyc: (utilisateurId: string, statut: Utilisateur['kyc']) => void;
  exportDac7: (annee: number) => string;
}

export type EtatLiked = EtatPersiste & {
  pret: boolean;
  chargement: boolean;
} & ActionsLiked;

const CLES_PERSISTEES: (keyof EtatPersiste)[] = [
  'utilisateurs', 'annonces', 'conversations', 'messages', 'commandes', 'litiges',
  'evaluations', 'favoris', 'recherchesSauvegardees', 'signalements', 'notifications',
  'mouvements', 'journalAdmin', 'sessionId', 'consentementMesure',
];

const etatInitial: EtatPersiste = {
  utilisateurs: UTILISATEURS_SEED,
  annonces: ANNONCES_SEED,
  conversations: CONVERSATIONS_SEED,
  messages: MESSAGES_SEED,
  commandes: [],
  litiges: [],
  evaluations: EVALUATIONS_SEED,
  favoris: { u_demo: ['a_3', 'a_5'] },
  recherchesSauvegardees: [],
  signalements: [],
  notifications: [],
  mouvements: [],
  journalAdmin: [],
  sessionId: null,
  consentementMesure: false,
};

export const useLiked = create<EtatLiked>()((set, get) => {
  /** Persiste uniquement les champs de données, jamais les actions. */
  const sauver = () => {
    const etat = get();
    const extrait: Record<string, unknown> = {};
    for (const cle of CLES_PERSISTEES) extrait[cle] = etat[cle];
    ecrireEtat(extrait);
  };

  const majEtat = (patch: Partial<EtatPersiste>) => {
    set(patch as Partial<EtatLiked>);
    sauver();
  };

  const moi = (): Utilisateur | null => {
    const { sessionId, utilisateurs } = get();
    return utilisateurs.find((u) => u.id === sessionId) ?? null;
  };

  const notifier = (utilisateurId: string, canal: CanalEvenement, titre: string, corps: string, lien?: string) => {
    const utilisateur = get().utilisateurs.find((u) => u.id === utilisateurId);
    if (!utilisateur) return;
    // Chaque canal est paramétrable par l'utilisateur (§4.8).
    if (!utilisateur.preferences.push[canal] && !utilisateur.preferences.email[canal]) return;
    const notification: Notification = {
      id: id('n'), utilisateurId, canal, titre, corps, lien, le: maintenant(), lue: false,
    };
    set((e) => ({ notifications: [notification, ...e.notifications] }));
    sauver();
  };

  const journaliser = (action: string, cible: string, detail?: string) => {
    const admin = moi();
    if (!admin) return;
    const entree: EntreeJournalAdmin = {
      id: id('log'), adminId: admin.id, action, cible, le: maintenant(), detail,
    };
    set((e) => ({ journalAdmin: [entree, ...e.journalAdmin] }));
    sauver();
  };

  const patcherUtilisateur = (utilisateurId: string, patch: Partial<Utilisateur>) => {
    set((e) => ({
      utilisateurs: e.utilisateurs.map((u) => (u.id === utilisateurId ? { ...u, ...patch } : u)),
    }));
  };

  const patcherCommande = (commandeId: string, patch: Partial<Commande>, evenement?: string, detail?: string) => {
    set((e) => ({
      commandes: e.commandes.map((c) =>
        c.id === commandeId
          ? {
              ...c,
              ...patch,
              journal: evenement ? [...c.journal, { le: maintenant(), libelle: evenement, detail }] : c.journal,
            }
          : c,
      ),
    }));
    sauver();
  };

  const mouvementer = (utilisateurId: string, sens: 'credit' | 'debit', montantCents: number, libelle: string, commandeId?: string) => {
    const mouvement: MouvementPortefeuille = {
      id: id('mv'), utilisateurId, sens, montantCents, libelle, le: maintenant(), commandeId,
    };
    const utilisateur = get().utilisateurs.find((u) => u.id === utilisateurId);
    if (utilisateur) {
      patcherUtilisateur(utilisateurId, {
        soldePortefeuilleCents:
          utilisateur.soldePortefeuilleCents + (sens === 'credit' ? montantCents : -montantCents),
      });
    }
    set((e) => ({ mouvements: [mouvement, ...e.mouvements] }));
    sauver();
  };

  /** Versement au vendeur : crédite le portefeuille et met à jour les agrégats DAC7. */
  const verserAuVendeur = async (commande: Commande) => {
    await psp.libererVersVendeur({
      sequestreId: commande.id,
      vendeurId: commande.vendeurId,
      montantCents: commande.prixArticleCents,
    });
    mouvementer(commande.vendeurId, 'credit', commande.prixArticleCents, `Vente ${commande.reference}`, commande.id);
    const vendeur = get().utilisateurs.find((u) => u.id === commande.vendeurId);
    if (vendeur) {
      const annee = new Date().getFullYear();
      const dac7 = vendeur.dac7.anneeReference === annee
        ? vendeur.dac7
        : { ...vendeur.dac7, anneeReference: annee, montantAnnuelCents: 0, nombreTransactionsAnnuel: 0 };
      patcherUtilisateur(vendeur.id, {
        nombreVentes: vendeur.nombreVentes + 1,
        // Agrégats déclaratifs DAC7 (§4.1).
        dac7: {
          ...dac7,
          montantAnnuelCents: dac7.montantAnnuelCents + commande.prixArticleCents,
          nombreTransactionsAnnuel: dac7.nombreTransactionsAnnuel + 1,
        },
        // Le KYC devient exigible avant le premier retrait.
        kyc: vendeur.kyc === 'non_requis' ? 'a_fournir' : vendeur.kyc,
      });
    }
    patcherCommande(commande.id, { statut: 'finalisee', finaliseeLe: maintenant() }, 'Fonds versés au vendeur');
    notifier(commande.vendeurId, 'fonds_verses', 'Fonds versés 💸',
      `Ta vente ${commande.reference} est finalisée. L'argent est sur ton portefeuille.`, `/commande/${commande.id}`);
    notifier(commande.acheteurId, 'evaluation_recue', 'Transaction terminée',
      'Pense à évaluer ton vendeur, ça aide toute la communauté.', `/evaluation/${commande.id}`);
    sauver();
  };

  return {
    ...etatInitial,
    pret: false,
    chargement: false,

    async amorcer() {
      const sauvegarde = await lireEtat<Partial<EtatPersiste>>();
      if (sauvegarde) {
        set({ ...sauvegarde, pret: true } as Partial<EtatLiked>);
      } else {
        set({ pret: true });
      }
      analytique.autoriser(get().consentementMesure);
      await get().libererFondsSiEchu();
    },

    async reinitialiser() {
      await effacerEtat();
      set({ ...etatInitial, pret: true } as Partial<EtatLiked>);
    },

    // ——— Comptes ———————————————————————————————————————————————

    async demanderCode(destination, canal) {
      const { envoye } = await verification.envoyerCode(destination, canal);
      return envoye;
    },

    async inscrire({ pseudo, email, telephone, commune, majeur, code }) {
      const valide = await verification.verifierCode(telephone ?? email, code);
      if (!valide) return { ok: false, erreur: 'Code de vérification incorrect.' };
      if (get().utilisateurs.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return { ok: false, erreur: 'Un compte existe déjà avec cet e-mail.' };
      }
      const annee = new Date().getFullYear();
      const nouveau: Utilisateur = {
        id: id('u'), pseudo, email, telephone, emailVerifie: true,
        telephoneVerifie: Boolean(telephone), commune, dateInscription: maintenant(),
        majeur, role: 'membre', statut: 'actif', noteMoyenne: 0, nombreEvaluations: 0,
        nombreVentes: 0, kyc: 'non_requis', soldePortefeuilleCents: 0,
        dac7: { pays: 'FR', montantAnnuelCents: 0, nombreTransactionsAnnuel: 0, anneeReference: annee },
        preferences: UTILISATEURS_SEED[0].preferences,
      };
      majEtat({ utilisateurs: [...get().utilisateurs, nouveau], sessionId: nouveau.id });
      analytique.suivre('inscription', { commune });
      return { ok: true };
    },

    async connecter(email) {
      const utilisateur = get().utilisateurs.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!utilisateur) return { ok: false, erreur: 'Aucun compte avec cet e-mail.' };
      if (utilisateur.statut === 'banni') return { ok: false, erreur: 'Ce compte a été banni.' };
      majEtat({ sessionId: utilisateur.id });
      analytique.suivre('connexion');
      return { ok: true };
    },

    async connecterAvec() {
      // Connexion sociale optionnelle (§4.1) : le jeton OIDC est échangé côté API.
      majEtat({ sessionId: 'u_demo' });
      return { ok: true };
    },

    deconnecter() {
      majEtat({ sessionId: null });
    },

    majProfil(patch) {
      const utilisateur = moi();
      if (!utilisateur) return;
      patcherUtilisateur(utilisateur.id, patch);
      sauver();
    },

    majPreference(canal, evenement, valeur) {
      const utilisateur = moi();
      if (!utilisateur) return;
      patcherUtilisateur(utilisateur.id, {
        preferences: {
          ...utilisateur.preferences,
          [canal]: { ...utilisateur.preferences[canal], [evenement]: valeur },
        },
      });
      sauver();
    },

    majProspection(valeur) {
      const utilisateur = moi();
      if (!utilisateur) return;
      patcherUtilisateur(utilisateur.id, {
        preferences: { ...utilisateur.preferences, prospectionCommerciale: valeur },
      });
      sauver();
    },

    autoriserMesure(valeur) {
      analytique.autoriser(valeur);
      majEtat({ consentementMesure: valeur });
    },

    async supprimerCompte() {
      // Droit à l'effacement (§6.4). Les commandes restent conservées de façon
      // pseudonymisée au titre des obligations DAC7 / LCB-FT.
      const utilisateur = moi();
      if (!utilisateur) return;
      set((e) => ({
        utilisateurs: e.utilisateurs.map((u) =>
          u.id === utilisateur.id
            ? { ...u, pseudo: 'Compte supprimé', email: `supprime+${u.id}@liked.re`,
                telephone: undefined, photoUrl: undefined, bio: undefined, statut: 'suspendu' }
            : u,
        ),
        annonces: e.annonces.map((a) =>
          a.vendeurId === utilisateur.id ? { ...a, statut: 'supprimee' as const } : a,
        ),
        sessionId: null,
      }));
      sauver();
    },

    exporterMesDonnees() {
      // Droit d'accès et à la portabilité (§6.4).
      const utilisateur = moi();
      const e = get();
      if (!utilisateur) return '{}';
      return JSON.stringify(
        {
          genereLe: maintenant(),
          profil: utilisateur,
          annonces: e.annonces.filter((a) => a.vendeurId === utilisateur.id),
          commandes: e.commandes.filter((c) => c.acheteurId === utilisateur.id || c.vendeurId === utilisateur.id),
          messages: e.messages.filter((m) => m.auteurId === utilisateur.id),
          evaluations: e.evaluations.filter((v) => v.auteurId === utilisateur.id || v.cibleId === utilisateur.id),
          mouvements: e.mouvements.filter((m) => m.utilisateurId === utilisateur.id),
        },
        null,
        2,
      );
    },

    // ——— KYC & portefeuille —————————————————————————————————————

    async soumettreKyc(documents, dac7) {
      const utilisateur = moi();
      if (!utilisateur) return;
      patcherUtilisateur(utilisateur.id, { kyc: 'en_examen', dac7: { ...utilisateur.dac7, ...dac7 } });
      sauver();
      await psp.soumettreKyc({ utilisateurId: utilisateur.id, documents });
      // Le PSP répond par webhook ; en local on valide après un court délai.
      setTimeout(() => {
        patcherUtilisateur(utilisateur.id, { kyc: 'valide' });
        notifier(utilisateur.id, 'fonds_verses', 'Identité vérifiée ✅',
          'Ton compte est vérifié, tu peux virer ton argent sur ton compte bancaire.');
        sauver();
      }, 4000);
    },

    async demanderVirement(montantCents) {
      const utilisateur = moi();
      if (!utilisateur) return { ok: false, erreur: 'Non connecté.' };
      if (utilisateur.kyc !== 'valide') {
        return { ok: false, erreur: "Ton identité doit être vérifiée avant le premier retrait." };
      }
      if (montantCents <= 0 || montantCents > utilisateur.soldePortefeuilleCents) {
        return { ok: false, erreur: 'Montant supérieur à ton solde.' };
      }
      await psp.virerVersBanque({ vendeurId: utilisateur.id, montantCents, iban: utilisateur.ibanMasque ?? '' });
      mouvementer(utilisateur.id, 'debit', montantCents, 'Virement vers compte bancaire');
      sauver();
      return { ok: true };
    },

    // ——— Annonces —————————————————————————————————————————————

    publierAnnonce(brouillon) {
      const utilisateur = moi();
      if (!utilisateur) return '';
      const annonce: Annonce = {
        ...brouillon,
        id: id('a'),
        vendeurId: utilisateur.id,
        statut: 'en_ligne', // publication immédiate, modération a posteriori (§4.2)
        publieeLe: maintenant(),
        favoris: 0,
        vues: 0,
        signalements: 0,
      };
      majEtat({ annonces: [annonce, ...get().annonces] });
      analytique.suivre('annonce_publiee', { categorie: annonce.categorie, gabarit: annonce.gabarit });

      // Alerte de nouveautés pour les recherches sauvegardées (§4.3).
      for (const recherche of get().recherchesSauvegardees) {
        if (!recherche.alerte || recherche.utilisateurId === utilisateur.id) continue;
        if (correspond(annonce, recherche.filtres)) {
          notifier(recherche.utilisateurId, 'alerte_recherche', `Nouveau pour « ${recherche.nom} »`,
            annonce.titre, `/annonce/${annonce.id}`);
        }
      }
      return annonce.id;
    },

    modifierAnnonce(annonceId, patch) {
      majEtat({
        annonces: get().annonces.map((a) => (a.id === annonceId ? { ...a, ...patch } : a)),
      });
    },

    supprimerAnnonce(annonceId) {
      majEtat({
        annonces: get().annonces.map((a) =>
          a.id === annonceId ? { ...a, statut: 'supprimee' as const } : a,
        ),
      });
    },

    incrementerVue(annonceId) {
      set((e) => ({
        annonces: e.annonces.map((a) => (a.id === annonceId ? { ...a, vues: a.vues + 1 } : a)),
      }));
    },

    // ——— Catalogue —————————————————————————————————————————————

    basculerFavori(annonceId) {
      const utilisateur = moi();
      if (!utilisateur) return;
      const actuels = get().favoris[utilisateur.id] ?? [];
      const present = actuels.includes(annonceId);
      const suivants = present ? actuels.filter((a) => a !== annonceId) : [annonceId, ...actuels];
      majEtat({
        favoris: { ...get().favoris, [utilisateur.id]: suivants },
        annonces: get().annonces.map((a) =>
          a.id === annonceId ? { ...a, favoris: Math.max(0, a.favoris + (present ? -1 : 1)) } : a,
        ),
      });
      analytique.suivre(present ? 'favori_retire' : 'favori_ajoute');
    },

    sauvegarderRecherche(nom, filtres, alerte) {
      const utilisateur = moi();
      if (!utilisateur) return;
      const recherche: RechercheSauvegardee = {
        id: id('rs'), utilisateurId: utilisateur.id, nom, filtres, alerte,
        creeeLe: maintenant(), derniereVueLe: maintenant(),
      };
      majEtat({ recherchesSauvegardees: [recherche, ...get().recherchesSauvegardees] });
    },

    supprimerRecherche(rechercheId) {
      majEtat({ recherchesSauvegardees: get().recherchesSauvegardees.filter((r) => r.id !== rechercheId) });
    },

    marquerRechercheVue(rechercheId) {
      majEtat({
        recherchesSauvegardees: get().recherchesSauvegardees.map((r) =>
          r.id === rechercheId ? { ...r, derniereVueLe: maintenant() } : r,
        ),
      });
    },

    // ——— Messagerie ————————————————————————————————————————————

    ouvrirConversation(annonceId) {
      const utilisateur = moi();
      const annonce = get().annonces.find((a) => a.id === annonceId);
      if (!utilisateur || !annonce) return '';
      const existante = get().conversations.find(
        (c) => c.annonceId === annonceId && c.acheteurId === utilisateur.id,
      );
      if (existante) return existante.id;
      const conversation: Conversation = {
        id: id('c'), annonceId, acheteurId: utilisateur.id, vendeurId: annonce.vendeurId,
        derniereActiviteLe: maintenant(), filtrageLeve: false, luPar: [utilisateur.id],
      };
      majEtat({ conversations: [conversation, ...get().conversations] });
      return conversation.id;
    },

    envoyerMessage(conversationId, texte) {
      const utilisateur = moi();
      const conversation = get().conversations.find((c) => c.id === conversationId);
      if (!utilisateur || !conversation) return;
      const { texte: nettoye, filtre } = filtrerCoordonnees(texte, !conversation.filtrageLeve);
      const message: Message = {
        id: id('m'), conversationId, auteurId: utilisateur.id, texte: nettoye,
        envoyeLe: maintenant(), filtre,
      };
      const messages = [...get().messages, message];
      if (filtre) {
        messages.push({
          id: id('m'), conversationId, auteurId: 'systeme', texte: AVERTISSEMENT_FILTRE,
          envoyeLe: maintenant(), filtre: false, systeme: true,
        });
      }
      const destinataire =
        conversation.acheteurId === utilisateur.id ? conversation.vendeurId : conversation.acheteurId;
      majEtat({
        messages,
        conversations: get().conversations.map((c) =>
          c.id === conversationId ? { ...c, derniereActiviteLe: maintenant(), luPar: [utilisateur.id] } : c,
        ),
      });
      notifier(destinataire, 'nouveau_message', `Message de ${utilisateur.pseudo}`, nettoye.slice(0, 90), `/discussion/${conversationId}`);
    },

    faireOffre(conversationId, montantCents) {
      const utilisateur = moi();
      const conversation = get().conversations.find((c) => c.id === conversationId);
      if (!utilisateur || !conversation) return;
      const message: Message = {
        id: id('m'), conversationId, auteurId: utilisateur.id,
        texte: 'a proposé un prix', envoyeLe: maintenant(), filtre: false,
        offre: { montantCents, statut: 'en_attente' },
      };
      const destinataire =
        conversation.acheteurId === utilisateur.id ? conversation.vendeurId : conversation.acheteurId;
      majEtat({
        messages: [...get().messages, message],
        conversations: get().conversations.map((c) =>
          c.id === conversationId ? { ...c, derniereActiviteLe: maintenant(), luPar: [utilisateur.id] } : c,
        ),
      });
      notifier(destinataire, 'offre_recue', 'Nouvelle offre 🏷️',
        `${utilisateur.pseudo} propose ${euros(montantCents)}`, `/discussion/${conversationId}`);
      analytique.suivre('offre_envoyee', { montantCents });
    },

    repondreOffre(messageId, reponse, contrePropositionCents) {
      const utilisateur = moi();
      const message = get().messages.find((m) => m.id === messageId);
      if (!utilisateur || !message?.offre) return;
      const messages = get().messages.map((m) =>
        m.id === messageId && m.offre
          ? { ...m, offre: { ...m.offre, statut: contrePropositionCents ? ('contre_proposee' as const) : reponse } }
          : m,
      );
      if (contrePropositionCents) {
        messages.push({
          id: id('m'), conversationId: message.conversationId, auteurId: utilisateur.id,
          texte: 'a fait une contre-proposition', envoyeLe: maintenant(), filtre: false,
          offre: { montantCents: contrePropositionCents, statut: 'en_attente' },
        });
      } else {
        messages.push({
          id: id('m'), conversationId: message.conversationId, auteurId: 'systeme',
          texte: reponse === 'acceptee'
            ? `Offre acceptée à ${euros(message.offre.montantCents)}. L'acheteur peut régler à ce prix.`
            : 'Offre refusée.',
          envoyeLe: maintenant(), filtre: false, systeme: true,
        });
      }
      majEtat({ messages });
      notifier(message.auteurId, 'offre_recue',
        reponse === 'acceptee' ? 'Offre acceptée 🎉' : contrePropositionCents ? 'Contre-proposition reçue' : 'Offre refusée',
        contrePropositionCents ? euros(contrePropositionCents) : '',
        `/discussion/${message.conversationId}`);
    },

    marquerLu(conversationId) {
      const utilisateur = moi();
      if (!utilisateur) return;
      majEtat({
        conversations: get().conversations.map((c) =>
          c.id === conversationId && !c.luPar.includes(utilisateur.id)
            ? { ...c, luPar: [...c.luPar, utilisateur.id] }
            : c,
        ),
      });
    },

    signaler(type, cibleId, motif, detail) {
      const utilisateur = moi();
      if (!utilisateur) return;
      const signalement: Signalement = {
        id: id('sig'), type, cibleId, auteurId: utilisateur.id, motif, detail,
        le: maintenant(), traite: false,
      };
      majEtat({
        signalements: [signalement, ...get().signalements],
        annonces: type === 'annonce'
          ? get().annonces.map((a) => (a.id === cibleId ? { ...a, signalements: a.signalements + 1 } : a))
          : get().annonces,
      });
    },

    // ——— Achat & séquestre ——————————————————————————————————————

    async passerCommande({ annonceId, mode, adresse, prixNegocieCents }) {
      const utilisateur = moi();
      const annonce = get().annonces.find((a) => a.id === annonceId);
      if (!utilisateur) return { ok: false, erreur: 'Connecte-toi pour acheter.' };
      if (!annonce || annonce.statut !== 'en_ligne') return { ok: false, erreur: "Cet article n'est plus disponible." };
      if (annonce.vendeurId === utilisateur.id) return { ok: false, erreur: 'Tu ne peux pas acheter ton propre article.' };
      if (mode === 'colissimo' && !adresse) return { ok: false, erreur: 'Adresse de livraison manquante.' };

      const prix = prixNegocieCents ?? annonce.prixCents;
      const panier = calculerPanier(prix, mode, annonce.gabarit);
      const commande: Commande = {
        id: id('cmd'),
        reference: reference(),
        annonceId,
        acheteurId: utilisateur.id,
        vendeurId: annonce.vendeurId,
        mode,
        prixArticleCents: panier.prixArticleCents,
        fraisProtectionCents: panier.fraisProtectionCents,
        fraisPortCents: panier.fraisPortCents,
        totalCents: panier.totalCents,
        margePortCents: panier.margePortCents,
        statut: 'paiement_en_attente',
        creeeLe: maintenant(),
        adresseLivraison: adresse,
        evaluationAcheteurFaite: false,
        evaluationVendeurFaite: false,
        journal: [{ le: maintenant(), libelle: 'Commande créée' }],
      };
      majEtat({ commandes: [commande, ...get().commandes] });

      // Paiement par carte via le PSP : aucune donnée bancaire ne transite par Liked (§4.5, §6.3).
      const intention = await psp.creerIntentionPaiement({
        commandeId: commande.id, montantCents: commande.totalCents, acheteurId: utilisateur.id,
      });
      const confirmation = await psp.confirmerPaiement(intention.intentionId);
      if (!confirmation.ok) {
        patcherCommande(commande.id, { statut: 'annulee' }, 'Paiement refusé', confirmation.motif);
        return { ok: false, erreur: confirmation.motif ?? 'Paiement refusé.' };
      }
      await psp.sequestrer(commande);

      const patch: Partial<Commande> = { statut: 'sequestre' };
      if (mode === 'main_propre') patch.codeRemise = genererCode();

      patcherCommande(commande.id, patch, 'Paiement encaissé, fonds séquestrés');
      set((e) => ({
        annonces: e.annonces.map((a) => (a.id === annonceId ? { ...a, statut: 'reservee' as const } : a)),
        // Le filtrage des coordonnées est levé après paiement (§4.4).
        conversations: e.conversations.map((c) =>
          c.annonceId === annonceId && c.acheteurId === utilisateur.id ? { ...c, filtrageLeve: true } : c,
        ),
      }));
      sauver();

      notifier(annonce.vendeurId, 'article_vendu', 'Article vendu 🎉',
        mode === 'main_propre'
          ? `${utilisateur.pseudo} a payé. Organise la remise, puis saisis son code à 4 chiffres.`
          : `${utilisateur.pseudo} a payé. Ton étiquette Colissimo est prête à générer.`,
        `/commande/${commande.id}`);
      if (mode === 'main_propre') {
        notifier(utilisateur.id, 'code_remise', 'Ton code de remise',
          'Donne-le au vendeur seulement après avoir vérifié l’article.', `/commande/${commande.id}`);
      }
      analytique.suivre('achat', { mode, totalCents: commande.totalCents });
      return { ok: true, commandeId: commande.id };
    },

    async genererEtiquette(commandeId) {
      const commande = get().commandes.find((c) => c.id === commandeId);
      if (!commande || !commande.adresseLivraison) return;
      const annonce = get().annonces.find((a) => a.id === commande.annonceId);
      const vendeur = get().utilisateurs.find((u) => u.id === commande.vendeurId);
      const { numeroSuivi, etiquetteUrl } = await transporteur.genererEtiquette({
        commandeId,
        gabarit: annonce?.gabarit ?? 'moyen',
        expediteurCommune: vendeur?.commune ?? 'Saint-Denis',
        destinataire: commande.adresseLivraison,
      });
      patcherCommande(
        commandeId,
        {
          statut: 'etiquette_emise',
          numeroSuivi,
          etiquetteUrl,
          suivi: [{ le: maintenant(), libelle: 'Étiquette générée', livre: false }],
        },
        'Étiquette Colissimo générée',
        numeroSuivi,
      );
      notifier(commande.vendeurId, 'etiquette_disponible', 'Étiquette prête 📦',
        'Imprime-la et dépose le colis en bureau de poste.', `/commande/${commandeId}`);
    },

    marquerExpedie(commandeId) {
      const commande = get().commandes.find((c) => c.id === commandeId);
      if (!commande?.numeroSuivi) return;
      patcherCommande(
        commandeId,
        {
          statut: 'expedie',
          suivi: [
            ...(commande.suivi ?? []),
            { le: maintenant(), libelle: 'Colis pris en charge', lieu: 'Bureau de poste', livre: false },
          ],
        },
        'Colis déposé',
      );
      notifier(commande.acheteurId, 'colis_livre', 'Colis expédié 🚚',
        `Suivi ${commande.numeroSuivi}`, `/commande/${commandeId}`);
    },

    simulerLivraison(commandeId) {
      const commande = get().commandes.find((c) => c.id === commandeId);
      if (!commande) return;
      const livreeLe = maintenant();
      // Fonds libérés 48 h après la livraison confirmée, sauf litige (§4.6).
      const liberableLe = new Date(Date.now() + DELAI_LIBERATION_MS).toISOString();
      patcherCommande(
        commandeId,
        {
          statut: 'livre',
          livreeLe,
          liberableLe,
          suivi: commande.numeroSuivi
            ? [
                ...(commande.suivi ?? []),
                { le: livreeLe, libelle: 'Colis livré', lieu: commande.adresseLivraison?.ville, livre: true },
              ]
            : commande.suivi,
        },
        'Livraison confirmée par le suivi',
      );
      notifier(commande.acheteurId, 'colis_livre', 'Colis livré 📬',
        'Tu as 48 h pour signaler un souci, sinon le vendeur est payé.', `/commande/${commandeId}`);
    },

    async validerCodeRemise(commandeId, code) {
      const commande = get().commandes.find((c) => c.id === commandeId);
      if (!commande) return { ok: false, erreur: 'Commande introuvable.' };
      if (commande.statut !== 'sequestre') return { ok: false, erreur: 'Cette commande n’attend pas de code.' };
      if (commande.codeRemise !== code.trim()) return { ok: false, erreur: 'Code incorrect. Vérifie avec l’acheteur.' };
      patcherCommande(commandeId, { statut: 'livre', livreeLe: maintenant() }, 'Code de remise validé');
      set((e) => ({
        annonces: e.annonces.map((a) => (a.id === commande.annonceId ? { ...a, statut: 'vendue' as const } : a)),
      }));
      // La remise en main propre déclenche immédiatement la libération des fonds (§4.6).
      await verserAuVendeur({ ...commande, statut: 'livre' });
      return { ok: true };
    },

    async confirmerReception(commandeId) {
      const utilisateur = moi();
      const commande = get().commandes.find((c) => c.id === commandeId);
      if (!utilisateur || !commande) return { ok: false, erreur: 'Commande introuvable.' };
      if (commande.acheteurId !== utilisateur.id) {
        return { ok: false, erreur: "Seul l'acheteur peut confirmer la réception." };
      }
      if (commande.statut !== 'livre') {
        return { ok: false, erreur: "Cette commande n'est pas encore livrée." };
      }
      set((e) => ({
        annonces: e.annonces.map((a) => (a.id === commande.annonceId ? { ...a, statut: 'vendue' as const } : a)),
      }));
      patcherCommande(commandeId, {}, 'Réception confirmée par l’acheteur');
      await verserAuVendeur(commande);
      return { ok: true };
    },

    async libererFondsSiEchu() {
      const echues = get().commandes.filter(
        (c) => c.statut === 'livre' && c.liberableLe && new Date(c.liberableLe).getTime() <= Date.now(),
      );
      for (const commande of echues) {
        set((e) => ({
          annonces: e.annonces.map((a) => (a.id === commande.annonceId ? { ...a, statut: 'vendue' as const } : a)),
        }));
        await verserAuVendeur(commande);
      }
    },

    async annulerCommande(commandeId, motif) {
      const commande = get().commandes.find((c) => c.id === commandeId);
      if (!commande) return;
      await psp.rembourser({ sequestreId: commande.id, montantCents: commande.totalCents, motif });
      patcherCommande(commandeId, { statut: 'remboursee' }, 'Commande annulée et remboursée', motif);
      set((e) => ({
        annonces: e.annonces.map((a) =>
          a.id === commande.annonceId && a.statut === 'reservee' ? { ...a, statut: 'en_ligne' as const } : a,
        ),
      }));
      sauver();
    },

    // ——— Litiges & évaluations ——————————————————————————————————

    ouvrirLitige(commandeId, motif, description, photos) {
      const utilisateur = moi();
      const commande = get().commandes.find((c) => c.id === commandeId);
      if (!utilisateur || !commande) return '';
      const litige: Litige = {
        id: id('lit'), commandeId, ouvertPar: utilisateur.id, motif, description, photos,
        statut: 'ouvert', ouvertLe: maintenant(),
        messages: [{ id: id('ml'), auteurId: utilisateur.id, role: utilisateur.id === commande.acheteurId ? 'acheteur' : 'vendeur', texte: description, le: maintenant() }],
      };
      // Le litige suspend la libération des fonds (§4.5, §4.7).
      majEtat({ litiges: [litige, ...get().litiges] });
      patcherCommande(commandeId, { statut: 'litige', litigeId: litige.id, liberableLe: undefined }, 'Litige ouvert', motif);
      notifier(commande.vendeurId, 'article_vendu', 'Litige ouvert ⚠️',
        'Un litige est ouvert sur une de tes ventes. Les fonds restent bloqués.', `/litige/${litige.id}`);
      return litige.id;
    },

    repondreLitige(litigeId, texte) {
      const utilisateur = moi();
      const litige = get().litiges.find((l) => l.id === litigeId);
      if (!utilisateur || !litige) return;
      const commande = get().commandes.find((c) => c.id === litige.commandeId);
      const role: 'acheteur' | 'vendeur' | 'support' =
        utilisateur.role === 'admin' ? 'support' : utilisateur.id === commande?.acheteurId ? 'acheteur' : 'vendeur';
      majEtat({
        litiges: get().litiges.map((l) =>
          l.id === litigeId
            ? {
                ...l,
                statut: role === 'support' ? 'en_examen' : l.statut,
                messages: [...l.messages, { id: id('ml'), auteurId: utilisateur.id, role, texte, le: maintenant() }],
              }
            : l,
        ),
      });
    },

    async resoudreLitige(litigeId, issue, montantCents, motivation) {
      const litige = get().litiges.find((l) => l.id === litigeId);
      if (!litige) return;
      const commande = get().commandes.find((c) => c.id === litige.commandeId);
      if (!commande) return;

      if (issue === 'remboursement_total' || issue === 'remboursement_partiel' || issue === 'retour_article') {
        const montant = issue === 'remboursement_total' ? commande.totalCents : montantCents;
        await psp.rembourser({ sequestreId: commande.id, montantCents: montant, motif: issue });
        if (issue === 'remboursement_partiel') {
          await psp.libererVersVendeur({
            sequestreId: commande.id, vendeurId: commande.vendeurId,
            montantCents: Math.max(0, commande.prixArticleCents - montant),
          });
          mouvementer(commande.vendeurId, 'credit', Math.max(0, commande.prixArticleCents - montant),
            `Vente ${commande.reference} (litige, versement partiel)`, commande.id);
        }
        patcherCommande(commande.id, { statut: 'remboursee', finaliseeLe: maintenant() }, 'Litige résolu', motivation);
      } else {
        await verserAuVendeur(commande);
      }

      majEtat({
        litiges: get().litiges.map((l) =>
          l.id === litigeId
            ? { ...l, statut: 'resolu', issue, montantRembourseCents: montantCents, decisionMotivee: motivation }
            : l,
        ),
      });
      journaliser('resolution_litige', litigeId, `${issue} — ${motivation}`);
      notifier(commande.acheteurId, 'fonds_verses', 'Litige tranché', motivation, `/commande/${commande.id}`);
      notifier(commande.vendeurId, 'fonds_verses', 'Litige tranché', motivation, `/commande/${commande.id}`);
    },

    evaluer(commandeId, note, commentaire) {
      const utilisateur = moi();
      const commande = get().commandes.find((c) => c.id === commandeId);
      if (!utilisateur || !commande) return;
      const estAcheteur = commande.acheteurId === utilisateur.id;
      const cibleId = estAcheteur ? commande.vendeurId : commande.acheteurId;
      const evaluation: Evaluation = {
        id: id('ev'), commandeId, auteurId: utilisateur.id, cibleId, note, commentaire,
        le: maintenant(), role: estAcheteur ? 'acheteur' : 'vendeur',
      };
      const cible = get().utilisateurs.find((u) => u.id === cibleId);
      if (cible) {
        const total = cible.noteMoyenne * cible.nombreEvaluations + note;
        patcherUtilisateur(cibleId, {
          nombreEvaluations: cible.nombreEvaluations + 1,
          noteMoyenne: Number((total / (cible.nombreEvaluations + 1)).toFixed(2)),
        });
      }
      majEtat({ evaluations: [evaluation, ...get().evaluations] });
      patcherCommande(commandeId,
        estAcheteur ? { evaluationAcheteurFaite: true } : { evaluationVendeurFaite: true },
        'Évaluation déposée');
      notifier(cibleId, 'evaluation_recue', 'Nouvelle évaluation ⭐',
        `${utilisateur.pseudo} t'a mis ${note}/5.`, `/profil/${cibleId}`);
    },

    // ——— Notifications ——————————————————————————————————————————

    marquerNotificationLue(notificationId) {
      majEtat({
        notifications: get().notifications.map((n) => (n.id === notificationId ? { ...n, lue: true } : n)),
      });
    },

    toutMarquerLu() {
      const utilisateur = moi();
      if (!utilisateur) return;
      majEtat({
        notifications: get().notifications.map((n) =>
          n.utilisateurId === utilisateur.id ? { ...n, lue: true } : n,
        ),
      });
    },

    // ——— Back-office ————————————————————————————————————————————

    modererAnnonce(annonceId, action, motif) {
      const statut = action === 'masquer' ? 'masquee' : action === 'retablir' ? 'en_ligne' : 'supprimee';
      majEtat({
        annonces: get().annonces.map((a) => (a.id === annonceId ? { ...a, statut } : a)),
      });
      journaliser(`moderation_${action}`, annonceId, motif);
    },

    sanctionner(utilisateurId, statut, motif) {
      patcherUtilisateur(utilisateurId, { statut });
      journaliser('sanction', utilisateurId, `${statut} — ${motif}`);
      sauver();
    },

    traiterSignalement(signalementId) {
      majEtat({
        signalements: get().signalements.map((s) => (s.id === signalementId ? { ...s, traite: true } : s)),
      });
      journaliser('signalement_traite', signalementId);
    },

    majStatutKyc(utilisateurId, statut) {
      patcherUtilisateur(utilisateurId, { kyc: statut });
      journaliser('kyc', utilisateurId, statut);
      sauver();
    },

    exportDac7(annee) {
      // Fichier annuel des vendeurs à déclarer (§4.9). Format CSV lisible par
      // l'équipe conformité ; le fichier XML officiel est généré côté back-office.
      const lignes = [
        'identifiant;nom;prenom;date_naissance;adresse;code_postal;ville;pays;nif;montant_annuel_eur;nombre_transactions;annee',
      ];
      for (const u of get().utilisateurs) {
        if (u.dac7.nombreTransactionsAnnuel === 0) continue;
        lignes.push(
          [
            u.id, u.dac7.nomLegal ?? '', u.dac7.prenomLegal ?? '', u.dac7.dateNaissance ?? '',
            u.dac7.adresseLigne1 ?? '', u.dac7.codePostal ?? '', u.dac7.ville ?? '',
            u.dac7.pays ?? 'FR', u.dac7.nif ?? '',
            (u.dac7.montantAnnuelCents / 100).toFixed(2), String(u.dac7.nombreTransactionsAnnuel), String(annee),
          ].join(';'),
        );
      }
      journaliser('export_dac7', String(annee), `${lignes.length - 1} vendeur(s)`);
      return lignes.join('\n');
    },
  };
});

/** Un article correspond-il aux filtres d'une recherche sauvegardée ? */
export function correspond(annonce: Annonce, f: FiltresRecherche): boolean {
  if (annonce.statut !== 'en_ligne') return false;
  if (f.texte) {
    const q = f.texte.toLowerCase();
    const foin = `${annonce.titre} ${annonce.description} ${annonce.marque}`.toLowerCase();
    if (!foin.includes(q)) return false;
  }
  if (f.universe && annonce.universe !== f.universe) return false;
  if (f.categorie && annonce.categorie !== f.categorie) return false;
  if (f.tailles?.length && !f.tailles.includes(annonce.taille)) return false;
  if (f.marques?.length && !f.marques.includes(annonce.marque)) return false;
  if (f.etats?.length && !f.etats.includes(annonce.etat)) return false;
  if (f.communes?.length && !(annonce.communeRemise && f.communes.includes(annonce.communeRemise))) return false;
  if (f.prixMinCents != null && annonce.prixCents < f.prixMinCents) return false;
  if (f.prixMaxCents != null && annonce.prixCents > f.prixMaxCents) return false;
  if (f.mode === 'main_propre' && !annonce.accepteMainPropre) return false;
  if (f.mode === 'colissimo' && !annonce.accepteEnvoi) return false;
  return true;
}

export function trier(annonces: Annonce[], tri: FiltresRecherche['tri']): Annonce[] {
  const copie = [...annonces];
  switch (tri) {
    case 'prix_croissant':
      return copie.sort((a, b) => a.prixCents - b.prixCents);
    case 'prix_decroissant':
      return copie.sort((a, b) => b.prixCents - a.prixCents);
    case 'commune':
      return copie.sort((a, b) => (a.communeRemise ?? 'zz').localeCompare(b.communeRemise ?? 'zz', 'fr'));
    default:
      return copie.sort((a, b) => +new Date(b.publieeLe) - +new Date(a.publieeLe));
  }
}
