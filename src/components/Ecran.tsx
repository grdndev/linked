import { usePathname, router } from 'expo-router';
import { MODE_DEMO } from '@/services/config';
import { Texte } from './Texte';
import { Bouton } from './Bouton';
import { EtatConnexion } from './EtatConnexion';
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
  const pathname = usePathname();
  const unavailable = !MODE_DEMO && ['/kyc','/portefeuille','/admin/dac7','/admin/litiges','/reglages/confidentialite'].includes(pathname);
  return (
    <SafeAreaView edges={bords} style={[styles.base, { backgroundColor: fond }]}>
      <View style={styles.centrage}>
        <View style={[styles.colonne, style]}><EtatConnexion />{unavailable ? <View style={{ padding: 24, gap: 20 }}><Texte variante="titre">Bientôt disponible</Texte><Texte>Ce parcours est visible dans la démonstration. Son raccordement au serveur doit être terminé avant l’ouverture publique.</Texte><Bouton titre="Revenir" onPress={() => router.back()} /></View> : children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
  centrage: { flex: 1, alignItems: 'center' },
  colonne: { flex: 1, width: '100%', maxWidth: LARGEUR_MAX },
});
