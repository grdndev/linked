import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { MODE_DEMO } from '@/services/config';
import { useLiked } from '@/store/liked';
import { colors } from '@/theme';
import { Texte } from './Texte';
export function EtatConnexion() {
  const erreur = useLiked(e => e.erreurReseau);
  const rafraichir = useLiked(e => e.rafraichir);
  if (erreur) return <Pressable accessibilityRole="button" onPress={rafraichir} style={{ padding: 10, backgroundColor: colors.alerteDoux }}><Texte variante="petit" centre>{erreur} Appuie pour réessayer.</Texte></Pressable>;
  return <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir l’espace de test" onPress={() => router.push('/test-lab')}  style={{ paddingVertical: 5, backgroundColor: colors.sableFonce }}><Texte variante="micro" centre couleur={colors.encre80}>{MODE_DEMO ? 'DÉMO · OUVRIR L’ESPACE DE TEST →' : 'BÊTA STRIPE TEST · ESPACE DE TEST →'}</Texte></Pressable>;
}
