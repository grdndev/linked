import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { Avatar, CarteAnnonce, Ecran, EnTete, Etiquette, Etoiles, Texte, Vide } from '@/components';
import { dateCourte, depuis } from '@/lib/temps';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useUtilisateur } from '@/store/selecteurs';

const COLONNE = (Dimensions.get('window').width - space.lg * 2 - space.md) / 2;

export default function ProfilPublic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const membre = useUtilisateur(id);
  const annonces = useLiked((e) => e.annonces.filter((a) => a.vendeurId === id && a.statut === 'en_ligne'));
  const evaluations = useLiked((e) => e.evaluations.filter((v) => v.cibleId === id));
  const utilisateurs = useLiked((e) => e.utilisateurs);

  if (!membre) {
    return (
      <Ecran>
        <EnTete titre="Profil" />
        <View style={{ padding: space.lg }}><Texte variante="corpsDoux">Profil introuvable.</Texte></View>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <EnTete titre={membre.pseudo} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxxl }}>
        <View style={styles.entete}>
          <Avatar uri={membre.photoUrl} pseudo={membre.pseudo} taille={72} />
          <View style={{ flex: 1, gap: 4 }}>
            <Texte variante="soustitre">{membre.pseudo}</Texte>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="location-outline" size={13} color={colors.encre60} />
              {/* Aucune coordonnée n'est affichée sur un profil public (§2.3). */}
              <Texte variante="petit">{membre.commune}</Texte>
            </View>
            <Etoiles note={membre.noteMoyenne} nombre={membre.nombreEvaluations} />
            <Texte variante="micro">Membre depuis {dateCourte(membre.dateInscription)}</Texte>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          {membre.kyc === 'valide' ? <Etiquette libelle="Identité vérifiée" ton="succes" /> : null}
          {membre.emailVerifie ? <Etiquette libelle="E-mail vérifié" ton="neutre" /> : null}
          {membre.telephoneVerifie ? <Etiquette libelle="Téléphone vérifié" ton="neutre" /> : null}
          <Etiquette libelle={`${membre.nombreVentes} vente(s)`} ton="neutre" />
        </View>

        {membre.bio ? <Texte variante="corps">{membre.bio}</Texte> : null}

        <View style={{ gap: space.md }}>
          <Texte variante="soustitre">Son dressing · {annonces.length}</Texte>
          {annonces.length === 0 ? (
            <Vide icone="shirt-outline" titre="Aucune annonce en ligne" />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
              {annonces.map((a) => <CarteAnnonce key={a.id} annonce={a} largeur={COLONNE} />)}
            </View>
          )}
        </View>

        <View style={{ gap: space.md }}>
          <Texte variante="soustitre">Évaluations · {evaluations.length}</Texte>
          {evaluations.length === 0 ? (
            <Texte variante="corpsDoux">Pas encore d'évaluation.</Texte>
          ) : (
            evaluations.map((e) => {
              const auteur = utilisateurs.find((u) => u.id === e.auteurId);
              return (
                <View key={e.id} style={styles.avis}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Avatar uri={auteur?.photoUrl} pseudo={auteur?.pseudo ?? '?'} taille={28} />
                    <Texte variante="corps" style={{ flex: 1 }}>{auteur?.pseudo ?? 'Membre'}</Texte>
                    <Texte variante="micro">{depuis(e.le)}</Texte>
                  </View>
                  <Etoiles note={e.note} afficherNombre={false} taille={13} />
                  <Texte variante="petit">{e.commentaire}</Texte>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row', gap: space.lg, alignItems: 'center',
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg,
  },
  avis: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
});
