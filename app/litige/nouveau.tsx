import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';

import { Bouton, Champ, Ecran, EnTete, Texte } from '@/components';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import type { MotifLitige } from '@/types';

const MOTIFS: { cle: MotifLitige; libelle: string; aide: string }[] = [
  { cle: 'non_recu', libelle: "Je n'ai pas reçu l'article", aide: 'Colis perdu ou rendez-vous non honoré' },
  { cle: 'non_conforme', libelle: "L'article ne correspond pas", aide: 'Taille, couleur, modèle différents' },
  { cle: 'endommage', libelle: "L'article est abîmé", aide: 'Défauts non mentionnés dans l’annonce' },
  { cle: 'contrefacon', libelle: 'Je soupçonne une contrefaçon', aide: 'Article non authentique' },
  { cle: 'autre', libelle: 'Autre problème', aide: '' },
];

export default function NouveauLitige() {
  const { commandeId } = useLocalSearchParams<{ commandeId: string }>();
  const ouvrirLitige = useLiked((e) => e.ouvrirLitige);
  const [motif, setMotif] = useState<MotifLitige>();
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const ajouter = async () => {
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 4, quality: 0.7,
    });
    if (resultat.canceled) return;
    setPhotos((p) => [...p, ...resultat.assets.map((a) => a.uri)].slice(0, 4));
  };

  return (
    <Ecran>
      <EnTete titre="Ouvrir un litige" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
        <View style={styles.encart}>
          <Ionicons name="information-circle-outline" size={20} color={colors.encre80} />
          <Texte variante="petit" style={{ flex: 1 }}>
            Tu as 48 h après la livraison pour signaler un problème. L'ouverture d'un litige
            bloque le versement au vendeur jusqu'à résolution par notre équipe.
          </Texte>
        </View>

        <View style={{ gap: space.sm }}>
          <Texte variante="micro">QUE S'EST-IL PASSÉ ?</Texte>
          {MOTIFS.map((m) => (
            <Pressable key={m.cle} onPress={() => setMotif(m.cle)} style={[styles.option, motif === m.cle ? { borderColor: colors.corail } : null]}>
              <Ionicons name={motif === m.cle ? 'radio-button-on' : 'radio-button-off'} size={20} color={motif === m.cle ? colors.corail : colors.encre40} />
              <View style={{ flex: 1 }}>
                <Texte variante="corps">{m.libelle}</Texte>
                {m.aide ? <Texte variante="petit">{m.aide}</Texte> : null}
              </View>
            </Pressable>
          ))}
        </View>

        <Champ
          label="Explique en détail" multiline value={description} onChangeText={setDescription}
          placeholder="Décris précisément le problème pour accélérer le traitement."
        />

        <View style={{ gap: space.sm }}>
          <Texte variante="micro">PHOTOS · {photos.length}/4</Texte>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            {photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
            ))}
            {photos.length < 4 ? (
              <Pressable onPress={ajouter} style={[styles.photo, styles.ajout]}>
                <Ionicons name="camera-outline" size={22} color={colors.corail} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Bouton
          titre="Envoyer ma demande" pleineLargeur
          desactive={!motif || description.trim().length < 15}
          onPress={() => {
            const litigeId = ouvrirLitige(commandeId!, motif!, description.trim(), photos);
            router.replace(`/litige/${litigeId}`);
          }}
        />
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  encart: {
    flexDirection: 'row', gap: space.md, alignItems: 'flex-start',
    backgroundColor: colors.alerteDoux, borderRadius: radius.lg, padding: space.lg,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  photo: { width: 76, height: 76, borderRadius: radius.md, backgroundColor: colors.sableFonce },
  ajout: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.corail,
    backgroundColor: colors.corailDoux, alignItems: 'center', justifyContent: 'center',
  },
});
