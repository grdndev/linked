import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space } from '@/theme';
import { Texte } from './Texte';

/** Feuille modale bas d'écran — motif d'interaction principal en mobile-first. */
export function Feuille({
  visible, onFermer, titre, children, hauteur = 0.72,
}: { visible: boolean; onFermer: () => void; titre?: string; children: ReactNode; hauteur?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onFermer}>
      <Pressable style={styles.voile} onPress={onFermer} accessibilityLabel="Fermer" />
      <View style={[styles.feuille, { maxHeight: `${hauteur * 100}%`, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.poignee} />
        {titre ? (
          <View style={styles.entete}>
            <Texte variante="soustitre" style={{ flex: 1 }}>{titre}</Texte>
            <Pressable onPress={onFermer} hitSlop={10} accessibilityRole="button" accessibilityLabel="Fermer">
              <Ionicons name="close" size={22} color={colors.encre80} />
            </Pressable>
          </View>
        ) : null}
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  voile: { flex: 1, backgroundColor: 'rgba(11,59,60,0.45)' },
  feuille: {
    backgroundColor: colors.sable,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  poignee: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.encre15,
    alignSelf: 'center', marginTop: space.md,
  },
  entete: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingTop: space.lg,
  },
});
