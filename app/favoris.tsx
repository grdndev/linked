import { Dimensions, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { CarteAnnonce, Ecran, EnTete, Texte, Vide } from '@/components';
import { space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useShallow } from 'zustand/react/shallow';

const COLONNE = (Dimensions.get('window').width - space.lg * 2 - space.md) / 2;

export default function Favoris() {
  const annonces = useLiked(
    useShallow((e) => {
      const ids = e.sessionId ? e.favoris[e.sessionId] ?? [] : [];
      return ids.map((id) => e.annonces.find((a) => a.id === id)).filter(Boolean);
    }),
  );

  return (
    <Ecran>
      <EnTete titre="Mes favoris" sousTitre={`${annonces.length} article(s)`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl }}>
        {annonces.length === 0 ? (
          <Vide
            icone="heart-outline" titre="Aucun favori"
            corps="Appuie sur le cœur d'un article pour le retrouver ici."
            action="Explorer le catalogue" onAction={() => router.push('/(tabs)/recherche')}
          />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {annonces.map((a) => (a ? <CarteAnnonce key={a.id} annonce={a} largeur={COLONNE} /> : null))}
          </View>
        )}
      </ScrollView>
    </Ecran>
  );
}
