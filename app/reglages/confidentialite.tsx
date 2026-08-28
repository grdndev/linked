import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Bouton, Ecran, EnTete, Groupe, Ligne, Texte } from '@/components';
import { partagerFichier } from '@/lib/fichiers';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useMoi } from '@/store/selecteurs';
import { alerter, confirmer } from '@/lib/dialogues';

export default function Confidentialite() {
  const moi = useMoi();
  const { exporterMesDonnees, supprimerCompte, autoriserMesure } = useLiked();
  const consentementMesure = useLiked((e) => e.consentementMesure);
  const [enCours, setEnCours] = useState(false);

  if (!moi) return null;

  const exporter = async () => {
    setEnCours(true);
    const contenu = exporterMesDonnees();
    const resultat = await partagerFichier('liked-mes-donnees.json', contenu, 'application/json');
    setEnCours(false);
    if (!resultat.ok) alerter('Export prêt', `Fichier enregistré : ${resultat.emplacement}`);
  };

  const supprimer = async () => {
    const ok = await confirmer(
      'Supprimer mon compte',
      "Ton profil et tes annonces seront effacés. Les données de transaction sont conservées de façon " +
        'pseudonymisée au titre des obligations fiscales (DAC7) et de lutte contre le blanchiment.',
      'Supprimer',
      true,
    );
    if (ok) { await supprimerCompte(); router.replace('/bienvenue'); }
  };

  return (
    <Ecran>
      <EnTete titre="Confidentialité et données" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxxl }}>
        <Groupe titre="Mes droits">
          <Ligne icone="download-outline" titre="Exporter mes données"
            sousTitre="Profil, annonces, commandes, messages, évaluations" onPress={exporter} />
          <Ligne icone="trash-outline" titre="Supprimer mon compte" ton="danger" onPress={supprimer} />
        </Groupe>

        <Pressable onPress={() => autoriserMesure(!consentementMesure)} style={styles.consentement}>
          <View style={{ flex: 1 }}>
            <Texte variante="corps">Mesure d'audience</Texte>
            <Texte variante="petit">
              Statistiques anonymes pour améliorer l'application. Aucune donnée revendue,
              aucun cookie publicitaire.
            </Texte>
          </View>
          <View style={[styles.piste, consentementMesure ? { backgroundColor: colors.corail } : null]}>
            <View style={[styles.pouce, consentementMesure ? { alignSelf: 'flex-end' } : null]} />
          </View>
        </Pressable>

        <View style={styles.bloc}>
          <Texte variante="section">Conservation des données</Texte>
          <Texte variante="petit">· Compte actif : tant que tu utilises Liked.</Texte>
          <Texte variante="petit">· Messagerie : 3 ans après le dernier échange.</Texte>
          <Texte variante="petit">· Pièces comptables et transactions : 10 ans (obligation légale).</Texte>
          <Texte variante="petit">· Données DAC7 et LCB-FT : 5 ans après la fin de la relation.</Texte>
          <Texte variante="petit">· Hébergement dans l'Union européenne.</Texte>
        </View>

        {enCours ? <Bouton titre="Export en cours…" ton="discret" pleineLargeur chargement /> : null}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  consentement: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg,
  },
  piste: { width: 46, height: 28, borderRadius: 14, backgroundColor: colors.encre15, padding: 3, justifyContent: 'center' },
  pouce: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.blanc },
  bloc: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: 6 },
});
