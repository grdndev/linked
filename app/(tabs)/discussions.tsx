import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { Avatar, Ecran, Texte, Vide } from '@/components';
import { euros } from '@/lib/argent';
import { depuis } from '@/lib/temps';
import { colors, font, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useMoi } from '@/store/selecteurs';

export default function Discussions() {
  const moi = useMoi();
  const { conversations, messages, annonces, utilisateurs } = useLiked();

  const fils = useMemo(() => {
    if (!moi) return [];
    return conversations
      .filter((c) => c.acheteurId === moi.id || c.vendeurId === moi.id)
      .map((c) => {
        const dernier = [...messages].filter((m) => m.conversationId === c.id).pop();
        const annonce = annonces.find((a) => a.id === c.annonceId);
        const autreId = c.acheteurId === moi.id ? c.vendeurId : c.acheteurId;
        const autre = utilisateurs.find((u) => u.id === autreId);
        return { c, dernier, annonce, autre, nonLu: !c.luPar.includes(moi.id) };
      })
      .sort((a, b) => +new Date(b.c.derniereActiviteLe) - +new Date(a.c.derniereActiviteLe));
  }, [conversations, messages, annonces, utilisateurs, moi]);

  if (!moi) {
    return (
      <Ecran>
        <Vide icone="chatbubble-outline" titre="Connecte-toi" corps="Tes discussions avec les vendeurs apparaîtront ici."
          action="Créer mon compte" onAction={() => router.push('/bienvenue')} />
      </Ecran>
    );
  }

  return (
    <Ecran>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
        <Texte variante="titre">Messages</Texte>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm, paddingBottom: space.xxxl }}>
        {fils.length === 0 ? (
          <Vide icone="chatbubble-outline" titre="Aucune discussion"
            corps="Pose une question sur un article ou propose ton prix, tout démarre ici." />
        ) : (
          fils.map(({ c, dernier, annonce, autre, nonLu }) => (
            <Pressable key={c.id} onPress={() => router.push(`/discussion/${c.id}`)} style={styles.fil}>
              <View>
                <Avatar uri={autre?.photoUrl} pseudo={autre?.pseudo ?? '?'} taille={46} />
                {nonLu ? <View style={styles.pastille} /> : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Texte style={{ fontFamily: nonLu ? font.semibold : font.medium, fontSize: 15, color: colors.encre, flex: 1 }} numberOfLines={1}>
                    {autre?.pseudo ?? 'Membre'}
                  </Texte>
                  <Texte variante="micro">{dernier ? depuis(dernier.envoyeLe) : ''}</Texte>
                </View>
                <Texte variante="petit" numberOfLines={1}>
                  {dernier?.offre
                    ? `🏷️ Offre à ${euros(dernier.offre.montantCents)}`
                    : dernier?.texte ?? 'Démarrer la conversation'}
                </Texte>
                <Texte variante="micro" numberOfLines={1}>{annonce?.titre}</Texte>
              </View>
              {annonce ? (
                <Image source={{ uri: annonce.photos[0] }} style={styles.vignette} contentFit="cover" />
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  fil: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.md,
  },
  vignette: { width: 44, height: 56, borderRadius: radius.sm, backgroundColor: colors.sableFonce },
  pastille: {
    position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.corail, borderWidth: 2, borderColor: colors.blanc,
  },
});
