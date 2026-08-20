import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Ecran, EnTete, Etiquette, Texte, Vide } from '@/components';
import { depuis } from '@/lib/temps';
import { colors, radius, space } from '@/theme';
import { correspond, useLiked } from '@/store/liked';

export default function RecherchesSauvegardees() {
  const recherches = useLiked((e) => e.recherchesSauvegardees.filter((r) => r.utilisateurId === e.sessionId));
  const annonces = useLiked((e) => e.annonces);
  const { supprimerRecherche, marquerRechercheVue } = useLiked();

  return (
    <Ecran>
      <EnTete titre="Recherches enregistrées" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxxl }}>
        {recherches.length === 0 ? (
          <Vide
            icone="notifications-outline" titre="Aucune recherche enregistrée"
            corps="Depuis la recherche, enregistre tes critères pour être alerté des nouveautés."
            action="Aller à la recherche" onAction={() => router.push('/(tabs)/recherche')}
          />
        ) : (
          recherches.map((r) => {
            const nouveautes = annonces.filter(
              (a) => correspond(a, r.filtres) && new Date(a.publieeLe) > new Date(r.derniereVueLe),
            ).length;
            return (
              <Pressable
                key={r.id}
                onPress={() => {
                  marquerRechercheVue(r.id);
                  router.push({ pathname: '/(tabs)/recherche', params: { texte: r.filtres.texte ?? '', universe: r.filtres.universe ?? '' } });
                }}
                style={styles.carte}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Texte variante="section">{r.nom}</Texte>
                  <Texte variante="petit">Créée {depuis(r.creeeLe)}</Texte>
                  {nouveautes > 0 ? <Etiquette libelle={`${nouveautes} nouveauté(s)`} ton="action" /> : null}
                </View>
                <Pressable onPress={() => supprimerRecherche(r.id)} hitSlop={10} accessibilityLabel="Supprimer">
                  <Ionicons name="trash-outline" size={18} color={colors.encre60} />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg,
  },
});
