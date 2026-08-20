import { Dimensions, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { CarteAnnonce, Ecran, EnTete, Vide } from '@/components';
import { space } from '@/theme';
import { useLiked } from '@/store/liked';

const COLONNE = (Dimensions.get('window').width - space.lg * 2 - space.md) / 2;

export default function MesAnnonces() {
  const annonces = useLiked((e) =>
    e.annonces.filter((a) => a.vendeurId === e.sessionId && a.statut !== 'supprimee'),
  );

  return (
    <Ecran>
      <EnTete titre="Mes annonces" sousTitre={`${annonces.length} annonce(s)`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        {annonces.length === 0 ? (
          <Vide icone="pricetags-outline" titre="Aucune annonce"
            corps="Dépose ta première annonce, c'est gratuit et ça prend trois minutes."
            action="Vendre un article" onAction={() => router.push('/(tabs)/vendre')} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {annonces.map((a) => <CarteAnnonce key={a.id} annonce={a} largeur={COLONNE} />)}
          </View>
        )}
      </ScrollView>
    </Ecran>
  );
}
