import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, shadow } from '@/theme';
import { useLiked } from '@/store/liked';
import { useEstFavori } from '@/store/selecteurs';

/** Le cœur corail : mise en favori d'un appui (§4.3). */
export function CoeurFavori({ annonceId, taille = 20, fond = true }: { annonceId: string; taille?: number; fond?: boolean }) {
  const favori = useEstFavori(annonceId);
  const basculer = useLiked((e) => e.basculerFavori);
  const connecte = useLiked((e) => Boolean(e.sessionId));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      hitSlop={8}
      onPress={() => {
        if (!connecte) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        basculer(annonceId);
      }}
      style={
        fond
          ? [
              {
                width: taille + 18, height: taille + 18, borderRadius: 999,
                backgroundColor: colors.blanc, alignItems: 'center', justifyContent: 'center',
              },
              shadow.carte,
            ]
          : undefined
      }
    >
      <Ionicons
        name={favori ? 'heart' : 'heart-outline'}
        size={taille}
        color={favori ? colors.corail : colors.encre80}
      />
    </Pressable>
  );
}
