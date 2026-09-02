import { id } from '@/lib/ids';
import type { AdresseLivraison, EtapeSuivi, Gabarit } from '@/types';

/**
 * Génération d'étiquettes Colissimo prépayées et suivi (§4.6).
 * Implémentation cible : API La Poste / Colissimo, appelée côté serveur.
 */
export interface Transporteur {
  genererEtiquette(input: {
    commandeId: string;
    gabarit: Gabarit;
    expediteurCommune: string;
    destinataire: AdresseLivraison;
  }): Promise<{ numeroSuivi: string; etiquetteUrl: string }>;

  suivre(numeroSuivi: string): Promise<EtapeSuivi[]>;
}

export const transporteurMock: Transporteur = {
  async genererEtiquette({ commandeId }) {
    await pause(800);
    const numeroSuivi = '6A' + String(Math.floor(1e10 + Math.random() * 8e10)) + 'FR';
    return {
      numeroSuivi,
      // En production : PDF signé servi par l'API Liked, transmis au vendeur.
      etiquetteUrl: `https://api.liked.re/etiquettes/${commandeId}.pdf`,
    };
  },
  async suivre() {
    await pause(300);
    // En production : appel à l'API de suivi La Poste. En local, les étapes
    // sont conservées sur la commande elle-même.
    return [];
  },
};

export const transporteur: Transporteur = transporteurMock;

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function referenceDepot(): string {
  return id('dep').toUpperCase().slice(0, 12);
}
