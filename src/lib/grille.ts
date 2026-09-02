import { useWindowDimensions } from 'react-native';
import { space } from '@/theme';

/** Largeur de contenu maximale : au-delà, l'application resterait lisible mais
 *  perdrait sa densité mobile-first. On centre la colonne comme le ferait une
 *  application native affichée sur tablette. */
export const LARGEUR_MAX = 560;

export function useGrille(colonnes = 2) {
  const { width } = useWindowDimensions();
  const largeurUtile = Math.min(width, LARGEUR_MAX);
  const largeurColonne = (largeurUtile - space.lg * 2 - space.md * (colonnes - 1)) / colonnes;
  return { largeurUtile, largeurColonne, estLarge: width > LARGEUR_MAX };
}
