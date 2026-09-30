import { Pressable, View } from 'react-native';
import { MODE_DEMO } from '@/services/config';
import { useLiked } from '@/store/liked';
import { colors } from '@/theme';
import { Texte } from './Texte';
export function EtatConnexion() {
  const erreur = useLiked(e => e.erreurReseau);
  const rafraichir = useLiked(e => e.rafraichir);
  if (erreur) return <Pressable accessibilityRole="button" onPress={rafraichir} style={{ padding: 10, backgroundColor: colors.alerteDoux }}><Texte variante="petit" centre>{erreur} Appuie pour réessayer.</Texte></Pressable>;
  if (!MODE_DEMO) return null;
  return <View style={{ paddingVertical: 5, backgroundColor: colors.sableFonce }}><Texte variante="micro" centre couleur={colors.encre80}>DÉMONSTRATION · AUCUN PAIEMENT RÉEL</Texte></View>;
}
