import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Ecran, EnTete, Texte, Vide } from '@/components';
import { depuis } from '@/lib/temps';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useShallow } from 'zustand/react/shallow';
import type { CanalEvenement } from '@/types';

const ICONES: Record<CanalEvenement, keyof typeof Ionicons.glyphMap> = {
  nouveau_message: 'chatbubble-outline',
  offre_recue: 'pricetag-outline',
  article_vendu: 'cash-outline',
  etiquette_disponible: 'document-text-outline',
  colis_livre: 'cube-outline',
  code_remise: 'key-outline',
  fonds_verses: 'wallet-outline',
  evaluation_recue: 'star-outline',
  alerte_recherche: 'search-outline',
};

export default function Notifications() {
  const notifications = useLiked(useShallow((e) => e.notifications.filter((n) => n.utilisateurId === e.sessionId)));
  const { marquerNotificationLue, toutMarquerLu } = useLiked();

  return (
    <Ecran>
      <EnTete
        titre="Notifications"
        action={
          notifications.some((n) => !n.lue) ? (
            <Pressable onPress={toutMarquerLu} hitSlop={8}>
              <Texte variante="petit" couleur={colors.corail}>Tout lire</Texte>
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: space.xxxl }}>
        {notifications.length === 0 ? (
          <Vide icone="notifications-outline" titre="Rien de neuf" corps="Tes alertes apparaîtront ici." />
        ) : (
          notifications.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => { marquerNotificationLue(n.id); if (n.lien) router.push(n.lien as never); }}
              style={[styles.carte, !n.lue ? { borderColor: colors.corail } : null]}
            >
              <View style={styles.icone}>
                <Ionicons name={ICONES[n.canal]} size={18} color={colors.encre} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Texte variante="corps">{n.titre}</Texte>
                {n.corps ? <Texte variante="petit" numberOfLines={2}>{n.corps}</Texte> : null}
                <Texte variante="micro">{depuis(n.le)}</Texte>
              </View>
              {!n.lue ? <View style={styles.pastille} /> : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  icone: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sable,
    alignItems: 'center', justifyContent: 'center',
  },
  pastille: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.corail },
});
