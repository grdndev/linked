import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Avatar, Bouton, Champ, Ecran, EnTete, Feuille, Puce, Texte } from '@/components';
import { COMMUNES } from '@/data/communes';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useMoi } from '@/store/selecteurs';

export default function ModifierProfil() {
  const moi = useMoi();
  const majProfil = useLiked((e) => e.majProfil);

  const [pseudo, setPseudo] = useState(moi?.pseudo ?? '');
  const [bio, setBio] = useState(moi?.bio ?? '');
  const [commune, setCommune] = useState(moi?.commune ?? 'Saint-Denis');
  const [photoUrl, setPhotoUrl] = useState(moi?.photoUrl);
  const [choixCommune, setChoixCommune] = useState(false);
  const [erreur, setErreur] = useState<string>();

  if (!moi) return null;

  const changerPhoto = async () => {
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (resultat.canceled) return;
    setPhotoUrl(resultat.assets[0].uri);
  };

  const enregistrer = () => {
    if (pseudo.trim().length < 3) return setErreur('Ton pseudonyme doit faire au moins 3 caractères.');
    majProfil({ pseudo: pseudo.trim(), bio: bio.trim() || undefined, commune, photoUrl });
    router.back();
  };

  return (
    <Ecran>
      <EnTete titre="Modifier mon profil" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={changerPhoto} style={{ alignItems: 'center', gap: space.sm }}>
            <View>
              <Avatar uri={photoUrl} pseudo={pseudo || moi.pseudo} taille={92} />
              <View style={styles.badgePhoto}>
                <Ionicons name="camera" size={15} color={colors.blanc} />
              </View>
            </View>
            <Texte variante="petit" couleur={colors.corail}>Changer ma photo</Texte>
          </Pressable>

          <Champ label="Pseudonyme" value={pseudo} onChangeText={setPseudo} maxLength={24} />
          <Champ
            label="Bio" value={bio} onChangeText={setBio} multiline maxLength={200}
            placeholder="Dis en deux mots ce que tu vends et où tu remets tes articles."
            aide={`${bio.length}/200`}
          />

          <View style={{ gap: space.sm }}>
            <Texte variante="micro">COMMUNE</Texte>
            <Pressable onPress={() => setChoixCommune(true)} style={styles.selecteur}>
              <Texte variante="corps">{commune}</Texte>
              <Ionicons name="chevron-down" size={18} color={colors.encre60} />
            </Pressable>
          </View>

          <View style={styles.rappel}>
            <Ionicons name="eye-off-outline" size={18} color={colors.encre80} />
            <Texte variante="petit" style={{ flex: 1 }}>
              Ton e-mail et ton numéro ne sont jamais affichés publiquement. Seuls ton
              pseudonyme, ta commune et tes évaluations sont visibles.
            </Texte>
          </View>

          {erreur ? <Texte variante="petit" couleur={colors.danger}>{erreur}</Texte> : null}
          <Bouton titre="Enregistrer" pleineLargeur onPress={enregistrer} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Feuille visible={choixCommune} onFermer={() => setChoixCommune(false)} titre="Ta commune">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {COMMUNES.map((c) => (
            <Puce key={c} libelle={c} active={c === commune} onPress={() => { setCommune(c); setChoixCommune(false); }} />
          ))}
        </View>
      </Feuille>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  badgePhoto: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.corail,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.sable,
  },
  selecteur: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg,
  },
  rappel: {
    flexDirection: 'row', gap: space.md, alignItems: 'flex-start',
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg,
  },
});
