import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, space } from '@/theme';
import { Texte } from './Texte';

interface Props {
  libelle: string;
  active?: boolean;
  onPress?: () => void;
  icone?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}

export function Puce({ libelle, active, onPress, icone, compact }: Props) {
  const Conteneur = onPress ? Pressable : View;
  return (
    <Conteneur
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: active }}
      style={[
        styles.base,
        compact ? { paddingVertical: 5, paddingHorizontal: space.md } : null,
        active ? styles.active : null,
      ]}
    >
      {icone ? (
        <Ionicons name={icone} size={14} color={active ? colors.blanc : colors.encre80} />
      ) : null}
      <Texte
        style={{
          fontFamily: active ? font.semibold : font.regular,
          fontSize: compact ? 12 : 13,
          color: active ? colors.blanc : colors.encre80,
        }}
      >
        {libelle}
      </Texte>
    </Conteneur>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.encre15,
    backgroundColor: colors.blanc,
    paddingVertical: 8,
    paddingHorizontal: space.lg,
  },
  active: { backgroundColor: colors.encre, borderColor: colors.encre },
});
