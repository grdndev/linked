import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradientLike } from '@/components/Degrade';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouton, Logotype, Texte } from '@/components';
import { colors, space } from '@/theme';
import { useLiked } from '@/store/liked';

export default function Bienvenue() {
  const insets = useSafeAreaInsets();
  const connecterAvec = useLiked((e) => e.connecterAvec);

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=70' }}
      style={styles.fond}
    >
      <LinearGradientLike />
      <View style={[styles.contenu, { paddingBottom: insets.bottom + space.xl, paddingTop: insets.top + space.xxl }]}>
        <View style={{ alignItems: 'center', gap: space.lg }}>
          <Logotype hauteur={40} sombre />
          <Texte variante="titre" couleur={colors.blanc} centre>
            Le dressing de{'\n'}La Réunion
          </Texte>
          <Texte variante="corps" couleur="rgba(255,255,255,0.86)" centre>
            Achète et vends tes vêtements près de chez toi. Paiement sécurisé,
            remise en main propre ou envoi Colissimo.
          </Texte>
        </View>

        <View style={{ gap: space.md }}>
          <Bouton titre="Créer mon compte" pleineLargeur onPress={() => router.push('/inscription')} />
          <Bouton
            titre="Continuer avec Apple"
            icone="logo-apple"
            ton="encre"
            pleineLargeur
            onPress={async () => { await connecterAvec('apple'); router.replace('/(tabs)'); }}
          />
          <Bouton
            titre="Continuer avec Google"
            icone="logo-google"
            ton="discret"
            pleineLargeur
            onPress={async () => { await connecterAvec('google'); router.replace('/(tabs)'); }}
          />
          <Bouton titre="J'ai déjà un compte" ton="contour" pleineLargeur
            style={{ borderColor: 'rgba(255,255,255,0.5)' }}
            onPress={() => router.push('/connexion')} />
          <Texte variante="micro" couleur="rgba(255,255,255,0.7)" centre>
            En continuant, tu acceptes les conditions générales et la politique de confidentialité de Liked.
          </Texte>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fond: { flex: 1, backgroundColor: colors.encre },
  contenu: { flex: 1, justifyContent: 'space-between', padding: space.xl },
});
