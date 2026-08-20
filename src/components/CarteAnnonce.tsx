import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { euros } from '@/lib/argent';
import { colors, radius, shadow, space, type } from '@/theme';
import type { Annonce } from '@/types';
import { CoeurFavori } from './CoeurFavori';
import { Etiquette } from './Etiquette';
import { Texte } from './Texte';

export function CarteAnnonce({ annonce, largeur }: { annonce: Annonce; largeur: number }) {
  const vendue = annonce.statut === 'vendue';
  const reservee = annonce.statut === 'reservee';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/annonce/${annonce.id}`)}
      style={[styles.carte, { width: largeur }, shadow.carte]}
    >
      <View>
        <Image
          source={{ uri: annonce.photos[0] }}
          style={{ width: '100%', height: largeur * 1.25, backgroundColor: colors.sableFonce }}
          contentFit="cover"
          transition={180}
        />
        <View style={styles.coeur}>
          <CoeurFavori annonceId={annonce.id} taille={17} />
        </View>
        {vendue || reservee ? (
          <View style={styles.voile}>
            <Etiquette libelle={vendue ? 'Vendu' : 'Réservé'} ton={vendue ? 'neutre' : 'alerte'} />
          </View>
        ) : null}
      </View>
      <View style={{ padding: space.md, gap: 3 }}>
        <Texte style={type.prix}>{euros(annonce.prixCents)}</Texte>
        <Texte variante="petit" numberOfLines={1}>
          {annonce.marque} · {annonce.taille}
        </Texte>
        <View style={styles.pied}>
          <Ionicons name="location-outline" size={12} color={colors.encre60} />
          <Texte variante="micro" numberOfLines={1} style={{ flex: 1 }}>
            {annonce.communeRemise ?? 'Envoi uniquement'}
          </Texte>
          {annonce.favoris > 0 ? (
            <>
              <Ionicons name="heart" size={11} color={colors.corail} />
              <Texte variante="micro">{annonce.favoris}</Texte>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: colors.blanc, borderRadius: radius.lg, overflow: 'hidden' },
  coeur: { position: 'absolute', top: space.sm, right: space.sm },
  voile: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(11,59,60,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  pied: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
});
