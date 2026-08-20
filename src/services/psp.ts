import { id } from '@/lib/ids';
import type { Commande } from '@/types';

/**
 * Prestataire de services de paiement agréé pour l'encaissement pour compte de
 * tiers (§4.5). Contrat volontairement minimal : côté mobile on ne manipule que
 * des identifiants et des URL de redirection 3-D Secure — jamais de PAN.
 * Implémentation cible : Mangopay (wallets + escrow + KYC + payout SEPA).
 */
export interface PrestatairePaiement {
  /** Jeton de carte obtenu via le SDK/WebView du PSP. Liked ne le stocke pas. */
  creerIntentionPaiement(input: {
    commandeId: string;
    montantCents: number;
    acheteurId: string;
  }): Promise<{ intentionId: string; urlAuthentification?: string }>;

  confirmerPaiement(intentionId: string): Promise<{ ok: boolean; motif?: string }>;

  /** Séquestre : crédite le wallet technique Liked, fonds bloqués. */
  sequestrer(commande: Commande): Promise<{ sequestreId: string }>;

  /** Libère les fonds vers le wallet vendeur après confirmation (§4.5). */
  libererVersVendeur(input: {
    sequestreId: string;
    vendeurId: string;
    montantCents: number;
  }): Promise<{ transfertId: string }>;

  rembourser(input: {
    sequestreId: string;
    montantCents: number;
    motif: string;
  }): Promise<{ remboursementId: string }>;

  /** Virement du wallet vendeur vers son IBAN — exige un KYC validé. */
  virerVersBanque(input: {
    vendeurId: string;
    montantCents: number;
    iban: string;
  }): Promise<{ payoutId: string }>;

  /** Dépôt des pièces d'identité (§4.1). */
  soumettreKyc(input: {
    utilisateurId: string;
    documents: { type: 'identite_recto' | 'identite_verso' | 'justificatif_domicile'; uri: string }[];
  }): Promise<{ dossierId: string }>;
}

/** Driver local : reproduit les états du PSP sans appel réseau. */
export const pspMock: PrestatairePaiement = {
  async creerIntentionPaiement({ commandeId }) {
    await pause(450);
    return { intentionId: id('pi') + ':' + commandeId };
  },
  async confirmerPaiement() {
    await pause(900);
    return { ok: true };
  },
  async sequestrer() {
    await pause(300);
    return { sequestreId: id('esc') };
  },
  async libererVersVendeur() {
    await pause(400);
    return { transfertId: id('tr') };
  },
  async rembourser() {
    await pause(400);
    return { remboursementId: id('rb') };
  },
  async virerVersBanque() {
    await pause(600);
    return { payoutId: id('po') };
  },
  async soumettreKyc() {
    await pause(700);
    return { dossierId: id('kyc') };
  },
};

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const psp: PrestatairePaiement = pspMock;
