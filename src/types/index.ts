/** Modèle de données Liked — couvre §4 du cahier des charges, DAC7 inclus. */

export type Commune = string;

export type StatutKyc = 'non_requis' | 'a_fournir' | 'en_examen' | 'valide' | 'refuse';

/** Champs imposés par la directive DAC7 (§4.1) — collectés dès l'origine. */
export interface DonneesDac7 {
  prenomLegal?: string;
  nomLegal?: string;
  dateNaissance?: string; // ISO
  adresseLigne1?: string;
  codePostal?: string;
  ville?: string;
  pays?: string; // FR par défaut
  nif?: string; // numéro d'identification fiscale
  /** Agrégats annuels recalculés à chaque versement. */
  montantAnnuelCents: number;
  nombreTransactionsAnnuel: number;
  anneeReference: number;
}

export interface Utilisateur {
  id: string;
  pseudo: string;
  email: string;
  telephone?: string;
  emailVerifie: boolean;
  telephoneVerifie: boolean;
  photoUrl?: string;
  commune: Commune;
  bio?: string;
  dateInscription: string;
  /** Un mineur ne peut pas vendre : contrainte KYC du PSP (§2.4). */
  majeur: boolean;
  role: 'membre' | 'admin';
  statut: 'actif' | 'averti' | 'suspendu' | 'banni';
  noteMoyenne: number;
  nombreEvaluations: number;
  nombreVentes: number;
  kyc: StatutKyc;
  dac7: DonneesDac7;
  soldePortefeuilleCents: number;
  ibanMasque?: string;
  preferences: PreferencesNotifications;
}

export interface PreferencesNotifications {
  email: Record<CanalEvenement, boolean>;
  push: Record<CanalEvenement, boolean>;
  prospectionCommerciale: boolean; // consentement explicite RGPD §6.4
}

export type CanalEvenement =
  | 'nouveau_message'
  | 'offre_recue'
  | 'article_vendu'
  | 'etiquette_disponible'
  | 'colis_livre'
  | 'code_remise'
  | 'fonds_verses'
  | 'evaluation_recue'
  | 'alerte_recherche';

export type EtatArticle =
  | 'neuf_avec_etiquette'
  | 'neuf_sans_etiquette'
  | 'tres_bon'
  | 'bon'
  | 'satisfaisant';

export type Gabarit = 'petit' | 'moyen' | 'volumineux';

export type StatutAnnonce = 'en_ligne' | 'reservee' | 'vendue' | 'masquee' | 'supprimee';

export interface Annonce {
  id: string;
  vendeurId: string;
  titre: string;
  description: string;
  photos: string[]; // 8 max
  universe: 'femme' | 'homme' | 'enfant';
  categorie: string; // slug feuille
  taille: string;
  marque: string;
  couleur: string;
  etat: EtatArticle;
  prixCents: number;
  gabarit: Gabarit;
  accepteMainPropre: boolean;
  communeRemise?: Commune;
  accepteEnvoi: boolean;
  statut: StatutAnnonce;
  publieeLe: string;
  favoris: number;
  vues: number;
  signalements: number;
}

export type StatutOffre = 'en_attente' | 'acceptee' | 'refusee' | 'contre_proposee' | 'expiree';

export interface Message {
  id: string;
  conversationId: string;
  auteurId: string;
  texte: string;
  envoyeLe: string;
  /** true si la messagerie a masqué des coordonnées (§4.4). */
  filtre: boolean;
  offre?: { montantCents: number; statut: StatutOffre };
  systeme?: boolean;
  signale?: boolean;
}

export interface Conversation {
  id: string;
  annonceId: string;
  acheteurId: string;
  vendeurId: string;
  derniereActiviteLe: string;
  /** Le filtrage des coordonnées est levé après paiement (§4.4). */
  filtrageLeve: boolean;
  luPar: string[];
}

export type ModeRemise = 'main_propre' | 'colissimo';

export type StatutCommande =
  | 'paiement_en_attente'
  | 'sequestre' // fonds bloqués
  | 'etiquette_emise'
  | 'expedie'
  | 'livre'
  | 'litige'
  | 'finalisee'
  | 'remboursee'
  | 'annulee';

export interface Commande {
  id: string;
  reference: string;
  annonceId: string;
  acheteurId: string;
  vendeurId: string;
  mode: ModeRemise;
  prixArticleCents: number;
  fraisProtectionCents: number;
  fraisPortCents: number;
  totalCents: number;
  /** Marge plateforme sur le port (§2.2). */
  margePortCents: number;
  statut: StatutCommande;
  creeeLe: string;
  /** Code à 4 chiffres remis à l'acheteur pour la main propre (§4.6). */
  codeRemise?: string;
  numeroSuivi?: string;
  etiquetteUrl?: string;
  livreeLe?: string;
  /** Date à partir de laquelle les fonds sont libérables (livraison + 48 h). */
  liberableLe?: string;
  finaliseeLe?: string;
  adresseLivraison?: AdresseLivraison;
  litigeId?: string;
  evaluationAcheteurFaite: boolean;
  evaluationVendeurFaite: boolean;
  journal: EvenementCommande[];
}

export interface EvenementCommande {
  le: string;
  libelle: string;
  detail?: string;
}

export interface AdresseLivraison {
  nomComplet: string;
  ligne1: string;
  ligne2?: string;
  codePostal: string;
  ville: string;
  telephone: string;
}

export type MotifLitige = 'non_recu' | 'non_conforme' | 'contrefacon' | 'endommage' | 'autre';
export type StatutLitige = 'ouvert' | 'en_examen' | 'resolu' | 'clos';
export type IssueLitige =
  | 'remboursement_total'
  | 'remboursement_partiel'
  | 'versement_vendeur'
  | 'retour_article';

export interface Litige {
  id: string;
  commandeId: string;
  ouvertPar: string;
  motif: MotifLitige;
  description: string;
  photos: string[];
  statut: StatutLitige;
  ouvertLe: string;
  issue?: IssueLitige;
  montantRembourseCents?: number;
  decisionMotivee?: string;
  messages: MessageLitige[];
}

export interface MessageLitige {
  id: string;
  auteurId: string;
  role: 'acheteur' | 'vendeur' | 'support';
  texte: string;
  le: string;
}

export interface Evaluation {
  id: string;
  commandeId: string;
  auteurId: string;
  cibleId: string;
  note: number; // 1..5
  commentaire: string;
  le: string;
  role: 'acheteur' | 'vendeur';
}

export interface RechercheSauvegardee {
  id: string;
  utilisateurId: string;
  nom: string;
  filtres: FiltresRecherche;
  alerte: boolean;
  creeeLe: string;
  derniereVueLe: string;
}

export interface FiltresRecherche {
  texte?: string;
  universe?: Annonce['universe'];
  categorie?: string;
  tailles?: string[];
  marques?: string[];
  etats?: EtatArticle[];
  communes?: Commune[];
  prixMinCents?: number;
  prixMaxCents?: number;
  mode?: ModeRemise;
  tri?: 'recent' | 'prix_croissant' | 'prix_decroissant' | 'commune';
}

export interface Signalement {
  id: string;
  type: 'annonce' | 'utilisateur' | 'message';
  cibleId: string;
  auteurId: string;
  motif: string;
  detail?: string;
  le: string;
  traite: boolean;
}

export interface EntreeJournalAdmin {
  id: string;
  adminId: string;
  action: string;
  cible: string;
  le: string;
  detail?: string;
}

export interface Notification {
  id: string;
  utilisateurId: string;
  canal: CanalEvenement;
  titre: string;
  corps: string;
  lien?: string;
  le: string;
  lue: boolean;
}

export interface MouvementPortefeuille {
  id: string;
  utilisateurId: string;
  sens: 'credit' | 'debit';
  montantCents: number;
  libelle: string;
  le: string;
  commandeId?: string;
}
