import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, space } from '@/theme';
import { Texte } from './Texte';

export function EnTete({
  titre, sousTitre, retour = true, action, fond = 'transparent',
}: { titre?: string; sousTitre?: string; retour?: boolean; action?: ReactNode; fond?: string }) {
  return (
    <View style={[styles.base, { backgroundColor: fond }]}>
      {retour ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={10}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={styles.rond}
        >
          <Ionicons name="chevron-back" size={22} color={colors.encre} />
        </Pressable>
      ) : (
        <View style={{ width: 36 }} />
      )}
      <View style={{ flex: 1 }}>
        {titre ? <Texte variante="section" numberOfLines={1}>{titre}</Texte> : null}
        {sousTitre ? <Texte variante="petit" numberOfLines={1}>{sousTitre}</Texte> : null}
      </View>
      {action ?? <View style={{ width: 36 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rond: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.blanc, alignItems: 'center', justifyContent: 'center',
  },
});
