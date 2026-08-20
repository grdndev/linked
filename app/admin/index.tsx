import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Ecran, EnTete, Groupe, Ligne, Texte } from '@/components';
import { euros } from '@/lib/argent';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';

export default function TableauDeBord() {
  const e = useLiked();
  const commandes = e.commandes;
  const volumeCents = commandes.reduce((s, c) => s + c.totalCents, 0);
  const revenusCents = commandes.reduce((s, c) => s + c.fraisProtectionCents + c.margePortCents, 0);
  const signalementsOuverts = e.signalements.filter((s) => !s.traite).length;
  const litigesOuverts = e.litiges.filter((l) => l.statut !== 'resolu').length;
  const kycEnAttente = e.utilisateurs.filter((u) => u.kyc === 'en_examen' || u.kyc === 'a_fournir').length;

  return (
    <Ecran>
      <EnTete titre="Back-office Liked" sousTitre="Tableau de bord" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxxl }}>
        <View style={styles.grille}>
          <Indicateur libelle="Inscrits" valeur={String(e.utilisateurs.length)} />
          <Indicateur libelle="Annonces en ligne" valeur={String(e.annonces.filter((a) => a.statut === 'en_ligne').length)} />
          <Indicateur libelle="Transactions" valeur={String(commandes.length)} />
          <Indicateur libelle="Volume d'affaires" valeur={euros(volumeCents)} />
          <Indicateur libelle="Revenus Liked" valeur={euros(revenusCents)} accent />
          <Indicateur libelle="Fonds séquestrés" valeur={euros(commandes.filter((c) => ['sequestre', 'etiquette_emise', 'expedie', 'livre', 'litige'].includes(c.statut)).reduce((s, c) => s + c.totalCents, 0))} />
        </View>

        <Groupe titre="Exploitation">
          <Ligne icone="flag-outline" titre="Modération et signalements" valeur={String(signalementsOuverts)} onPress={() => router.push('/admin/moderation')} />
          <Ligne icone="alert-circle-outline" titre="Litiges" valeur={String(litigesOuverts)} onPress={() => router.push('/admin/litiges')} />
          <Ligne icone="people-outline" titre="Utilisateurs et KYC" valeur={String(kycEnAttente)} onPress={() => router.push('/admin/utilisateurs')} />
          <Ligne icone="document-text-outline" titre="Export DAC7" onPress={() => router.push('/admin/dac7')} />
          <Ligne icone="list-outline" titre="Journal d'administration" valeur={String(e.journalAdmin.length)} onPress={() => router.push('/admin/journal')} />
        </Groupe>
      </ScrollView>
    </Ecran>
  );
}

function Indicateur({ libelle, valeur, accent }: { libelle: string; valeur: string; accent?: boolean }) {
  return (
    <View style={[styles.carte, accent ? { backgroundColor: colors.encre } : null]}>
      <Texte variante="micro" couleur={accent ? 'rgba(255,255,255,0.7)' : colors.encre60}>
        {libelle.toUpperCase()}
      </Texte>
      <Texte variante="soustitre" couleur={accent ? colors.blanc : colors.encre}>{valeur}</Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  carte: {
    flexGrow: 1, minWidth: '46%', backgroundColor: colors.blanc,
    borderRadius: radius.lg, padding: space.lg, gap: 4,
  },
});
