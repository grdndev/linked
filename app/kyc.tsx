import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Bouton, Champ, Ecran, EnTete, Etiquette, Texte } from '@/components';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useMoi } from '@/store/selecteurs';

type TypeDocument = 'identite_recto' | 'identite_verso' | 'justificatif_domicile';

const DOCUMENTS: { type: TypeDocument; libelle: string; aide: string }[] = [
  { type: 'identite_recto', libelle: "Pièce d'identité — recto", aide: 'CNI, passeport ou titre de séjour' },
  { type: 'identite_verso', libelle: "Pièce d'identité — verso", aide: 'Inutile pour un passeport' },
  { type: 'justificatif_domicile', libelle: 'Justificatif de domicile', aide: 'Moins de 3 mois' },
];

export default function Kyc() {
  const moi = useMoi();
  const soumettreKyc = useLiked((e) => e.soumettreKyc);
  const [fichiers, setFichiers] = useState<Partial<Record<TypeDocument, string>>>({});
  const [prenom, setPrenom] = useState(moi?.dac7.prenomLegal ?? '');
  const [nom, setNom] = useState(moi?.dac7.nomLegal ?? '');
  const [naissance, setNaissance] = useState(moi?.dac7.dateNaissance ?? '');
  const [adresse, setAdresse] = useState(moi?.dac7.adresseLigne1 ?? '');
  const [codePostal, setCodePostal] = useState(moi?.dac7.codePostal ?? '974');
  const [ville, setVille] = useState(moi?.dac7.ville ?? moi?.commune ?? '');
  const [nif, setNif] = useState(moi?.dac7.nif ?? '');
  const [enCours, setEnCours] = useState(false);

  if (!moi) return null;

  const choisir = async (type: TypeDocument) => {
    const resultat = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (resultat.canceled) return;
    setFichiers((f) => ({ ...f, [type]: resultat.assets[0].uri }));
  };

  const envoyer = async () => {
    setEnCours(true);
    await soumettreKyc(
      (Object.entries(fichiers) as [TypeDocument, string][]).map(([type, uri]) => ({ type, uri })),
      {
        prenomLegal: prenom, nomLegal: nom, dateNaissance: naissance,
        adresseLigne1: adresse, codePostal, ville, pays: 'FR', nif,
      },
    );
    setEnCours(false);
    router.back();
  };

  const complet = Boolean(fichiers.identite_recto && prenom && nom && naissance && adresse && ville);

  return (
    <Ecran>
      <EnTete titre="Vérification d'identité" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
        <View style={styles.encart}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.encre80} />
          <Texte variante="petit" style={{ flex: 1 }}>
            Ces informations sont transmises directement à notre prestataire de paiement agréé,
            qui les conserve dans l'Union européenne. Liked ne stocke pas tes pièces d'identité.
          </Texte>
        </View>

        {moi.kyc === 'en_examen' ? <Etiquette libelle="Dossier en cours d'examen" ton="alerte" /> : null}
        {moi.kyc === 'valide' ? <Etiquette libelle="Identité vérifiée" ton="succes" /> : null}

        <View style={{ gap: space.md }}>
          <Texte variante="micro">IDENTITÉ LÉGALE</Texte>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Champ style={{ flex: 1 }} label="Prénom" value={prenom} onChangeText={setPrenom} />
            <Champ style={{ flex: 1 }} label="Nom" value={nom} onChangeText={setNom} />
          </View>
          <Champ label="Date de naissance" value={naissance} onChangeText={setNaissance} placeholder="AAAA-MM-JJ" />
          <Champ label="Adresse" value={adresse} onChangeText={setAdresse} />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Champ style={{ width: 120 }} label="Code postal" value={codePostal} onChangeText={setCodePostal} keyboardType="number-pad" />
            <Champ style={{ flex: 1 }} label="Ville" value={ville} onChangeText={setVille} />
          </View>
          <Champ
            label="Numéro fiscal (NIF)" value={nif} onChangeText={setNif} keyboardType="number-pad"
            aide="Exigé par la directive européenne DAC7 pour les vendeurs réguliers."
          />
        </View>

        <View style={{ gap: space.md }}>
          <Texte variante="micro">DOCUMENTS</Texte>
          {DOCUMENTS.map((d) => (
            <Pressable key={d.type} onPress={() => choisir(d.type)} style={styles.document}>
              {fichiers[d.type] ? (
                <Image source={{ uri: fichiers[d.type] }} style={styles.apercu} contentFit="cover" />
              ) : (
                <View style={[styles.apercu, styles.apercuVide]}>
                  <Ionicons name="camera-outline" size={20} color={colors.encre60} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Texte variante="corps">{d.libelle}</Texte>
                <Texte variante="petit">{d.aide}</Texte>
              </View>
              <Ionicons
                name={fichiers[d.type] ? 'checkmark-circle' : 'chevron-forward'}
                size={20}
                color={fichiers[d.type] ? colors.succes : colors.encre40}
              />
            </Pressable>
          ))}
        </View>

        <Bouton titre="Envoyer mon dossier" pleineLargeur desactive={!complet} chargement={enCours} onPress={envoyer} />
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  encart: {
    flexDirection: 'row', gap: space.md, alignItems: 'flex-start',
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg,
  },
  document: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.md,
  },
  apercu: { width: 56, height: 40, borderRadius: radius.sm, backgroundColor: colors.sableFonce },
  apercuVide: { alignItems: 'center', justifyContent: 'center' },
});
