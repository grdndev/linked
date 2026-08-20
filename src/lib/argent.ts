import type { Gabarit, ModeRemise } from '@/types';

/**
 * Frais de protection acheteur — §2.2 : 5 % de la vente + 0,80 €,
 * ajoutés au panier de l'acheteur. La vente reste gratuite pour le vendeur.
 */
export const TAUX_PROTECTION = 0.05;
export const PART_FIXE_PROTECTION_CENTS = 80;

/** Forfaits de port facturés à l'acheteur — §4.6. */
export const FORFAITS_PORT_CENTS: Record<Gabarit, number> = {
  petit: 450,
  moyen: 550,
  volumineux: 700,
};

/** Coût d'achat négocié auprès de La Poste : la différence est la marge Liked (§2.2). */
export const COUTS_PORT_CENTS: Record<Gabarit, number> = {
  petit: 385,
  moyen: 470,
  volumineux: 610,
};

export const LIBELLES_GABARIT: Record<Gabarit, { nom: string; exemples: string }> = {
  petit: { nom: 'Petit', exemples: 'T-shirt, top, accessoire' },
  moyen: { nom: 'Moyen', exemples: 'Jean, robe, pull, chaussures' },
  volumineux: { nom: 'Volumineux', exemples: 'Manteau, lot, grande taille' },
};

export function fraisProtectionCents(prixArticleCents: number): number {
  return Math.round(prixArticleCents * TAUX_PROTECTION) + PART_FIXE_PROTECTION_CENTS;
}

export interface Panier {
  prixArticleCents: number;
  fraisProtectionCents: number;
  fraisPortCents: number;
  totalCents: number;
  margePortCents: number;
  /** Ce que touchera le vendeur après libération des fonds. */
  versementVendeurCents: number;
}

export function calculerPanier(
  prixArticleCents: number,
  mode: ModeRemise,
  gabarit: Gabarit,
): Panier {
  const protection = fraisProtectionCents(prixArticleCents);
  const port = mode === 'colissimo' ? FORFAITS_PORT_CENTS[gabarit] : 0;
  const marge = mode === 'colissimo' ? port - COUTS_PORT_CENTS[gabarit] : 0;
  return {
    prixArticleCents,
    fraisProtectionCents: protection,
    fraisPortCents: port,
    totalCents: prixArticleCents + protection + port,
    margePortCents: marge,
    versementVendeurCents: prixArticleCents,
  };
}

const formateur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function euros(cents: number): string {
  return formateur.format(cents / 100).replace(/ | /g, ' ');
}

/** Saisie utilisateur « 12,50 » → 1250 */
export function parseEuros(saisie: string): number | null {
  const nettoye = saisie.replace(/[^0-9,.]/g, '').replace(',', '.');
  if (!nettoye) return null;
  const valeur = Number(nettoye);
  if (Number.isNaN(valeur) || valeur < 0) return null;
  return Math.round(valeur * 100);
}
