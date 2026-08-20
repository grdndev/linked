import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Ecran, EnTete, Texte } from '@/components';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useMoi } from '@/store/selecteurs';
import type { CanalEvenement } from '@/types';

const EVENEMENTS: { cle: CanalEvenement; libelle: string }[] = [
  { cle: 'nouveau_message', libelle: 'Nouveau message' },
  { cle: 'offre_recue', libelle: 'Offre reçue' },
  { cle: 'article_vendu', libelle: 'Article vendu' },
  { cle: 'etiquette_disponible', libelle: 'Étiquette disponible' },
  { cle: 'colis_livre', libelle: 'Colis livré' },
  { cle: 'code_remise', libelle: 'Code de remise' },
  { cle: 'fonds_verses', libelle: 'Fonds versés' },
  { cle: 'evaluation_recue', libelle: 'Évaluation reçue' },
  { cle: 'alerte_recherche', libelle: 'Alerte de recherche' },
];

export default function ReglagesNotifications() {
  const moi = useMoi();
  const majPreference = useLiked((e) => e.majPreference);
  const majProspection = useLiked((e) => e.majProspection);

  if (!moi) return null;

  return (
    <Ecran>
      <EnTete titre="Notifications" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }}>
        <Texte variante="petit">
          Chaque type d'alerte est paramétrable indépendamment par e-mail et par notification push.
        </Texte>

        <View style={styles.tableau}>
          <View style={[styles.ligne, { borderBottomWidth: 1, borderBottomColor: colors.encre15 }]}>
            <Texte variante="micro" style={{ flex: 1 }}>ÉVÉNEMENT</Texte>
            <Texte variante="micro" style={{ width: 52, textAlign: 'center' }}>E-MAIL</Texte>
            <Texte variante="micro" style={{ width: 52, textAlign: 'center' }}>PUSH</Texte>
          </View>
          {EVENEMENTS.map((e) => (
            <View key={e.cle} style={styles.ligne}>
              <Texte variante="corps" style={{ flex: 1 }}>{e.libelle}</Texte>
              <Case actif={moi.preferences.email[e.cle]} onPress={() => majPreference('email', e.cle, !moi.preferences.email[e.cle])} />
              <Case actif={moi.preferences.push[e.cle]} onPress={() => majPreference('push', e.cle, !moi.preferences.push[e.cle])} />
            </View>
          ))}
        </View>

        <Pressable onPress={() => majProspection(!moi.preferences.prospectionCommerciale)} style={styles.consentement}>
          <View style={{ flex: 1 }}>
            <Texte variante="corps">Offres et nouveautés Liked</Texte>
            <Texte variante="petit">
              Consentement explicite requis pour la prospection commerciale. Révocable à tout moment.
            </Texte>
          </View>
          <View style={[styles.piste, moi.preferences.prospectionCommerciale ? { backgroundColor: colors.corail } : null]}>
            <View style={[styles.pouce, moi.preferences.prospectionCommerciale ? { alignSelf: 'flex-end' } : null]} />
          </View>
        </Pressable>
      </ScrollView>
    </Ecran>
  );
}

function Case({ actif, onPress }: { actif: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: 52, alignItems: 'center' }} accessibilityRole="checkbox" accessibilityState={{ checked: actif }}>
      <View style={[styles.case, actif ? { backgroundColor: colors.corail, borderColor: colors.corail } : null]}>
        {actif ? <View style={styles.coche} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tableau: { backgroundColor: colors.blanc, borderRadius: radius.lg, overflow: 'hidden' },
  ligne: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md },
  case: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.encre15,
    alignItems: 'center', justifyContent: 'center',
  },
  coche: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.blanc },
  consentement: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg,
  },
  piste: { width: 46, height: 28, borderRadius: 14, backgroundColor: colors.encre15, padding: 3, justifyContent: 'center' },
  pouce: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.blanc },
});
