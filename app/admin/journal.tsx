import { ScrollView, StyleSheet, View } from 'react-native';

import { Ecran, EnTete, Texte, Vide } from '@/components';
import { dateCourte, heureCourte } from '@/lib/temps';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';

export default function Journal() {
  const entrees = useLiked((e) => e.journalAdmin);
  const utilisateurs = useLiked((e) => e.utilisateurs);

  return (
    <Ecran>
      <EnTete titre="Journal d'administration" sousTitre={`${entrees.length} action(s)`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: space.xxxl }}>
        {entrees.length === 0 ? (
          <Vide icone="list-outline" titre="Journal vide" corps="Les actions d'administration seront tracées ici." />
        ) : (
          entrees.map((e) => (
            <View key={e.id} style={styles.carte}>
              <Texte variante="corps">{e.action}</Texte>
              <Texte variante="petit">Cible : {e.cible}{e.detail ? ` — ${e.detail}` : ''}</Texte>
              <Texte variante="micro">
                {utilisateurs.find((u) => u.id === e.adminId)?.pseudo ?? e.adminId} ·
                {' '}{dateCourte(e.le)} {heureCourte(e.le)}
              </Texte>
            </View>
          ))
        )}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: 2 },
});
