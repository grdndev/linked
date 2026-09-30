import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { Bouton, CarteAnnonce, Ecran, EnTete, Vide } from '@/components';
import { boostActif } from '@/lib/boost';
import { space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useGrille } from '@/lib/grille';
import { useShallow } from 'zustand/react/shallow';


export default function MesAnnonces() {
  const { largeurColonne } = useGrille();
  const annonces = useLiked(
    useShallow((e) => e.annonces.filter((a) => a.vendeurId === e.sessionId && a.statut !== 'supprimee')),
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
            {annonces.map((a) => <View key={a.id} style={{width:largeurColonne,gap:8}}><CarteAnnonce annonce={a} largeur={largeurColonne}/>{a.statut==='en_ligne' && <Bouton titre={boostActif(a)?'Voir mon boost':'Booster'} taille="sm" icone="flash-outline" ton={boostActif(a)?'contour':'action'} onPress={()=>router.push(`/booster/${a.id}`)}/>}</View>)}
          </View>
        )}
      </ScrollView>
    </Ecran>
  );
}
