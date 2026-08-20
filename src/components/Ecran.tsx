import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '@/theme';

export function Ecran({
  children, fond = colors.sable, bords = ['top'], style,
}: { children: ReactNode; fond?: string; bords?: Edge[]; style?: ViewStyle }) {
  return (
    <SafeAreaView edges={bords} style={[styles.base, { backgroundColor: fond }]}>
      <View style={[styles.base, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ base: { flex: 1 } });
