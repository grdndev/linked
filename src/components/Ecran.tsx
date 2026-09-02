import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { LARGEUR_MAX } from '@/lib/grille';

/**
 * Conteneur d'écran. L'application est pensée mobile-first : sur un écran large
 * on centre une colonne à la largeur d'un téléphone plutôt que d'étirer la mise
 * en page, qui perdrait sa densité.
 */
export function Ecran({
  children, fond = colors.sable, bords = ['top'], style,
}: { children: ReactNode; fond?: string; bords?: Edge[]; style?: ViewStyle }) {
  return (
    <SafeAreaView edges={bords} style={[styles.base, { backgroundColor: fond }]}>
      <View style={styles.centrage}>
        <View style={[styles.colonne, style]}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
  centrage: { flex: 1, alignItems: 'center' },
  colonne: { flex: 1, width: '100%', maxWidth: LARGEUR_MAX },
});
