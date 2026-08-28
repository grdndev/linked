import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Bouton, Ecran, EnTete, Texte } from '@/components';
import { partagerFichier } from '@/lib/fichiers';
import { colors, font, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';

export default function ExportDac7() {
  const exportDac7 = useLiked((e) => e.exportDac7);
  const utilisateurs = useLiked((e) => e.utilisateurs);
  const annee = new Date().getFullYear();
  const [apercu, setApercu] = useState<string>();

  const aDeclarer = utilisateurs.filter(
    // Seuils DAC7 : plus de 30 ventes ou plus de 2 000 € encaissés dans l'année.
    (u) => u.dac7.nombreTransactionsAnnuel > 30 || u.dac7.montantAnnuelCents > 200000,
  );

  const generer = async () => {
    const csv = exportDac7(annee);
    setApercu(csv);
    const resultat = await partagerFichier(`liked-dac7-${annee}.csv`, csv, 'text/csv');
    if (!resultat.ok) Alert.alert('Export généré', resultat.emplacement ?? '');
  };

  return (
    <Ecran>
      <EnTete titre="Export DAC7" sousTitre={`Année de référence ${annee}`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }}>
        <View style={styles.bloc}>
          <Texte variante="section">Vendeurs concernés</Texte>
          <Texte variante="petit">
            La directive européenne DAC7 impose de déclarer chaque vendeur dépassant
            30 transactions ou 2 000 € encaissés sur l'année, et de lui adresser un récapitulatif individuel.
          </Texte>
          <Texte variante="titre">{aDeclarer.length}</Texte>
          <Texte variante="petit">vendeur(s) au-dessus des seuils · {utilisateurs.filter((u) => u.dac7.nombreTransactionsAnnuel > 0).length} vendeur(s) actif(s)</Texte>
        </View>

        <Bouton titre="Générer le fichier annuel" pleineLargeur icone="download-outline" onPress={generer} />
        <Bouton
          titre="Envoyer les récapitulatifs individuels" ton="contour" pleineLargeur
          onPress={() => Alert.alert('Récapitulatifs', `${aDeclarer.length} récapitulatif(s) mis en file d'envoi.`)}
        />

        {apercu ? (
          <View style={styles.apercu}>
            <Texte variante="micro">APERÇU CSV</Texte>
            <Texte style={{ fontFamily: font.regular, fontSize: 11, color: colors.encre80 }}>{apercu}</Texte>
          </View>
        ) : null}

        <Texte variante="micro">
          Les données sont conservées cinq ans après la fin de la relation, conformément aux obligations
          fiscales et de lutte contre le blanchiment.
        </Texte>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bloc: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  apercu: { backgroundColor: colors.encre15, borderRadius: radius.md, padding: space.lg, gap: space.sm },
});
