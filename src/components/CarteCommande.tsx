import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

import { euros } from '@/lib/argent';
import { dateCourte } from '@/lib/temps';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import type { Commande, StatutCommande } from '@/types';
import { Etiquette } from './Etiquette';
import { Texte } from './Texte';

const ETATS: Record<StatutCommande, { libelle: string; ton: 'neutre' | 'succes' | 'alerte' | 'danger' | 'action' }> = {
  paiement_en_attente: { libelle: 'Paiement en attente', ton: 'alerte' },
  sequestre: { libelle: 'Fonds bloqués', ton: 'action' },
  etiquette_emise: { libelle: 'Étiquette prête', ton: 'action' },
  expedie: { libelle: 'En route', ton: 'action' },
  livre: { libelle: 'Livré', ton: 'succes' },
  litige: { libelle: 'Litige', ton: 'danger' },
  finalisee: { libelle: 'Terminée', ton: 'succes' },
  remboursee: { libelle: 'Remboursée', ton: 'neutre' },
  annulee: { libelle: 'Annulée', ton: 'neutre' },
};

export function CarteCommande({ commande, role }: { commande: Commande; role: 'acheteur' | 'vendeur' }) {
  const annonce = useLiked((e) => e.annonces.find((a) => a.id === commande.annonceId));
  const etat = ETATS[commande.statut];

  return (
    <Pressable onPress={() => router.push(`/commande/${commande.id}`)} style={styles.carte}>
      {annonce ? <Image source={{ uri: annonce.photos[0] }} style={styles.vignette} contentFit="cover" /> : null}
      <View style={{ flex: 1, gap: 4 }}>
        <Texte variante="corps" numberOfLines={1}>{annonce?.titre ?? 'Article'}</Texte>
        <Texte variante="petit">
          {commande.reference} · {dateCourte(commande.creeeLe)} · {commande.mode === 'main_propre' ? 'Main propre' : 'Colissimo'}
        </Texte>
        <Etiquette libelle={etat.libelle} ton={etat.ton} />
      </View>
      <Texte variante="prix">
        {euros(role === 'acheteur' ? commande.totalCents : commande.prixArticleCents)}
      </Texte>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  carte: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.md,
  },
  vignette: { width: 52, height: 66, borderRadius: radius.sm, backgroundColor: colors.sableFonce },
});
