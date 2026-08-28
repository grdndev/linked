import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

/**
 * Voile encre appliqué sur les photos plein écran pour garantir le contraste
 * du texte blanc posé dessus.
 */
export function VoileEncre({ inverse = false }: { inverse?: boolean }) {
  const couleurs = inverse
    ? (['rgba(11,59,60,0.86)', 'rgba(11,59,60,0.45)', 'rgba(11,59,60,0.20)'] as const)
    : (['rgba(11,59,60,0.20)', 'rgba(11,59,60,0.55)', 'rgba(11,59,60,0.90)'] as const);

  return <LinearGradient colors={couleurs} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />;
}
