import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, space } from '@/theme';
import { Texte } from './Texte';

type Ton = 'action' | 'encre' | 'contour' | 'discret' | 'danger';
type Taille = 'md' | 'lg' | 'sm';

interface Props {
  titre: string;
  onPress?: () => void;
  ton?: Ton;
  taille?: Taille;
  icone?: keyof typeof Ionicons.glyphMap;
  pleineLargeur?: boolean;
  chargement?: boolean;
  desactive?: boolean;
  style?: ViewStyle;
}

/** Le corail est la couleur d'action unique (§3.2) : `ton="action"`. */
export function Bouton({
  titre, onPress, ton = 'action', taille = 'md', icone,
  pleineLargeur, chargement, desactive, style,
}: Props) {
  const inactif = desactive || chargement;
  const fonds: Record<Ton, ViewStyle> = {
    action: { backgroundColor: colors.corail },
    encre: { backgroundColor: colors.encre },
    contour: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.encre15 },
    discret: { backgroundColor: colors.sableFonce },
    danger: { backgroundColor: colors.dangerDoux, borderWidth: 1.5, borderColor: colors.danger },
  };
  const textes: Record<Ton, string> = {
    action: colors.blanc,
    encre: colors.blanc,
    contour: colors.encre,
    discret: colors.encre,
    danger: colors.danger,
  };
  const hauteurs: Record<Taille, number> = { sm: 38, md: 48, lg: 56 };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif }}
      onPress={inactif ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        fonds[ton],
        { height: hauteurs[taille] },
        pleineLargeur ? { alignSelf: 'stretch' } : null,
        pressed && !inactif ? { opacity: 0.85, transform: [{ scale: 0.99 }] } : null,
        inactif ? { opacity: 0.45 } : null,
        style,
      ]}
    >
      {chargement ? (
        <ActivityIndicator color={textes[ton]} />
      ) : (
        <View style={styles.contenu}>
          {icone ? <Ionicons name={icone} size={taille === 'sm' ? 16 : 18} color={textes[ton]} /> : null}
          <Texte
            style={{
              fontFamily: font.semibold,
              fontSize: taille === 'sm' ? 14 : 16,
              color: textes[ton],
            }}
          >
            {titre}
          </Texte>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  contenu: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
