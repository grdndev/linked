import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { Bouton, Ecran, EnTete, Etiquette, Texte, Vide } from '@/components';
import { euros } from '@/lib/argent';
import { depuis } from '@/lib/temps';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';

export default function Moderation() {
  const signalements = useLiked((e) => e.signalements);
  const annonces = useLiked((e) => e.annonces);
  const utilisateurs = useLiked((e) => e.utilisateurs);
  const { modererAnnonce, traiterSignalement } = useLiked();

  const enAttente = signalements.filter((s) => !s.traite);

  return (
    <Ecran>
      <EnTete titre="Modération" sousTitre={`${enAttente.length} signalement(s) à traiter`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxxl }}>
        {enAttente.length === 0 ? (
          <Vide icone="shield-checkmark-outline" titre="Rien à modérer" corps="Aucun signalement en attente." />
        ) : (
          enAttente.map((s) => {
            const annonce = s.type === 'annonce' ? annonces.find((a) => a.id === s.cibleId) : undefined;
            const membre = s.type === 'utilisateur' ? utilisateurs.find((u) => u.id === s.cibleId) : undefined;
            const auteur = utilisateurs.find((u) => u.id === s.auteurId);
            return (
              <View key={s.id} style={styles.carte}>
                <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                  {annonce ? <Image source={{ uri: annonce.photos[0] }} style={styles.vignette} contentFit="cover" /> : null}
                  <View style={{ flex: 1, gap: 2 }}>
                    <Etiquette libelle={s.type.toUpperCase()} ton="alerte" />
                    <Texte variante="corps" numberOfLines={1}>
                      {annonce?.titre ?? membre?.pseudo ?? s.cibleId}
                    </Texte>
                    <Texte variante="petit">{s.motif}</Texte>
                    <Texte variante="micro">Signalé par {auteur?.pseudo ?? '—'} · {depuis(s.le)}</Texte>
                  </View>
                  {annonce ? <Texte variante="prix">{euros(annonce.prixCents)}</Texte> : null}
                </View>

                <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
                  {annonce ? (
                    <>
                      <Bouton titre="Voir" taille="sm" ton="contour" onPress={() => router.push(`/annonce/${annonce.id}`)} />
                      <Bouton
                        titre="Masquer" taille="sm" ton="discret"
                        onPress={() => { modererAnnonce(annonce.id, 'masquer', s.motif); traiterSignalement(s.id); }}
                      />
                      <Bouton
                        titre="Supprimer" taille="sm" ton="danger"
                        onPress={() =>
                          Alert.alert('Supprimer', 'Retirer définitivement cette annonce ?', [
                            { text: 'Annuler', style: 'cancel' },
                            {
                              text: 'Supprimer',
                              style: 'destructive',
                              onPress: () => { modererAnnonce(annonce.id, 'supprimer', s.motif); traiterSignalement(s.id); },
                            },
                          ])
                        }
                      />
                    </>
                  ) : membre ? (
                    <Bouton titre="Voir le profil" taille="sm" ton="contour" onPress={() => router.push(`/admin/utilisateurs`)} />
                  ) : null}
                  <Bouton titre="Classer sans suite" taille="sm" ton="discret" onPress={() => traiterSignalement(s.id)} />
                </View>
              </View>
            );
          })
        )}

        <Texte variante="micro" style={{ marginTop: space.lg }}>
          Toutes les actions de modération sont horodatées et journalisées.
        </Texte>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  vignette: { width: 52, height: 66, borderRadius: radius.sm, backgroundColor: colors.sableFonce },
});
