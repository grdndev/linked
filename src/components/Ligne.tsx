import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space } from '@/theme';
import { Texte } from './Texte';

export function Ligne({
  icone, titre, valeur, sousTitre, onPress, droite, ton = 'encre',
}: {
  icone?: keyof typeof Ionicons.glyphMap;
  titre: string;
  valeur?: string;
  sousTitre?: string;
  onPress?: () => void;
  droite?: ReactNode;
  ton?: 'encre' | 'danger';
}) {
  const Conteneur = onPress ? Pressable : View;
  const couleur = ton === 'danger' ? colors.danger : colors.encre;
  return (
    <Conteneur onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} style={styles.base}>
      {icone ? (
        <View style={styles.icone}>
          <Ionicons name={icone} size={18} color={couleur} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Texte variante="corps" couleur={couleur}>{titre}</Texte>
        {sousTitre ? <Texte variante="petit">{sousTitre}</Texte> : null}
      </View>
      {valeur ? <Texte variante="petit">{valeur}</Texte> : null}
      {droite ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.encre40} /> : null)}
    </Conteneur>
  );
}

export function Groupe({ titre, children }: { titre?: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      {titre ? <Texte variante="micro" style={{ marginLeft: space.xs }}>{titre.toUpperCase()}</Texte> : null}
      <View style={styles.groupe}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingVertical: 14,
  },
  icone: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sable,
    alignItems: 'center', justifyContent: 'center',
  },
  groupe: { backgroundColor: colors.blanc, borderRadius: radius.lg, overflow: 'hidden' },
});
