import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bouton, Logotype, Texte } from '@/components';
import { colors, font, space } from '@/theme';
import { MODE_DEMO } from '@/services/config';

export default function Bienvenue() {
  return <SafeAreaView style={styles.page}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.top}><Logotype hauteur={32} sombre /><Texte variante="micro" couleur="#C6D5D5">LA RÉUNION · 974</Texte></View>
      <View style={styles.collage} accessible accessibilityLabel="Un nouveau dressing avec des vêtements de seconde main">
        <View style={[styles.photoCard,{ transform: [{ rotate: '-9deg' }], left: '7%', top: 26 }]}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=480&q=80' }} style={styles.photo} contentFit="cover" />
          <View style={styles.caption}><Texte variante="petit">Une seconde histoire</Texte><Ionicons name="heart" color={colors.corail} size={18}/></View>
        </View>
        <View style={[styles.photoCard,{ transform: [{ rotate: '10deg' }], right: '5%', top: 4 }]}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=480&q=80' }} style={styles.photo} contentFit="cover" />
          <View style={styles.caption}><Texte variante="petit">Un nouveau coup de cœur</Texte></View>
        </View>
        <View style={styles.round}><Ionicons name="heart" size={29} color={colors.corail}/></View>
      </View>
      <View style={{ gap: 14 }}>
        <Texte couleur={colors.blanc} style={styles.title}>Ton style.{'\n'}Ton île.{'\n'}Une seconde vie.</Texte>
        <Texte couleur="#C6D5D5" style={{ fontSize: 16, lineHeight: 24 }}>Les dressings de La Réunion ont des trésors. Trouve ton prochain coup de cœur, tout près de chez toi.</Texte>
      </View>
      <View style={styles.trust}><Ionicons name="shield-checkmark-outline" size={17} color="#C6D5D5"/><Texte variante="petit" couleur="#C6D5D5">Vente gratuite · Remise en main propre</Texte></View>
      <View style={styles.actions}>
        <Bouton titre="Découvrir les articles" taille="lg" pleineLargeur onPress={() => router.replace('/(tabs)')} />
        <Bouton titre="Créer mon compte" ton="contourClair" pleineLargeur onPress={() => router.push('/inscription')} />
        <Pressable accessibilityRole="button" onPress={() => router.push('/connexion')} style={{ padding: 10 }}><Texte centre couleur={colors.blanc}>Déjà un compte ? Connecte-toi</Texte></Pressable>
        {MODE_DEMO && <Texte variante="micro" centre couleur="#C6D5D5">DÉMONSTRATION · ARTICLES ET TRANSACTIONS FICTIFS</Texte>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.encre },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', padding: 26, gap: 22, paddingBottom: 30 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: font.semibold, fontSize: 43, lineHeight: 46, letterSpacing: -1.6 },
  collage: { height: 238, marginHorizontal: -12 },
  photoCard: { position: 'absolute', width: '49%', padding: 7, borderRadius: 14, backgroundColor: colors.sable },
  photo: { height: 166, width: '100%', borderRadius: 9 },
  caption: { paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.sable, position: 'absolute', bottom: 1, left: '44%', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.encre },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { gap: 11, marginTop: 3 },
});
