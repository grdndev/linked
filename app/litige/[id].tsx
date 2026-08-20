import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Ecran, EnTete, Etiquette, Texte } from '@/components';
import { euros } from '@/lib/argent';
import { depuis } from '@/lib/temps';
import { colors, font, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useMoi } from '@/store/selecteurs';

const LIBELLES_MOTIF: Record<string, string> = {
  non_recu: 'Article non reçu',
  non_conforme: 'Article non conforme',
  endommage: 'Article endommagé',
  contrefacon: 'Soupçon de contrefaçon',
  autre: 'Autre problème',
};

export default function DetailLitige() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const litige = useLiked((e) => e.litiges.find((l) => l.id === id));
  const commande = useLiked((e) => e.commandes.find((c) => c.id === litige?.commandeId));
  const utilisateurs = useLiked((e) => e.utilisateurs);
  const repondreLitige = useLiked((e) => e.repondreLitige);
  const moi = useMoi();
  const [saisie, setSaisie] = useState('');

  if (!litige || !commande) return null;

  return (
    <Ecran>
      <EnTete
        titre="Litige"
        sousTitre={`Commande ${commande.reference}`}
        action={
          <Pressable onPress={() => router.push(`/commande/${commande.id}`)} hitSlop={8} accessibilityLabel="Voir la commande">
            <Ionicons name="receipt-outline" size={20} color={colors.encre60} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }}>
        <View style={styles.bloc}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Texte variante="section" style={{ flex: 1 }}>{LIBELLES_MOTIF[litige.motif]}</Texte>
            <Etiquette
              libelle={litige.statut === 'resolu' ? 'Résolu' : litige.statut === 'en_examen' ? 'En examen' : 'Ouvert'}
              ton={litige.statut === 'resolu' ? 'succes' : 'alerte'}
            />
          </View>
          <Texte variante="petit">Ouvert {depuis(litige.ouvertLe)}</Texte>
          <Texte variante="corps">{litige.description}</Texte>
          {litige.photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {litige.photos.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
              ))}
            </ScrollView>
          ) : null}
        </View>

        {litige.statut === 'resolu' ? (
          <View style={styles.decision}>
            <Texte variante="section">Décision de l'équipe Liked</Texte>
            <Texte variante="corps">{litige.decisionMotivee}</Texte>
            {litige.montantRembourseCents ? (
              <Texte variante="petit">Montant remboursé : {euros(litige.montantRembourseCents)}</Texte>
            ) : null}
          </View>
        ) : (
          <View style={styles.encart}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.alerte} />
            <Texte variante="petit" style={{ flex: 1 }}>
              Les fonds restent bloqués jusqu'à la résolution. L'équipe support participe à cette
              conversation à trois.
            </Texte>
          </View>
        )}

        <View style={{ gap: space.md }}>
          <Texte variante="micro">ÉCHANGES</Texte>
          {litige.messages.map((m) => {
            const auteur = utilisateurs.find((u) => u.id === m.auteurId);
            const aMoi = m.auteurId === moi?.id;
            return (
              <View key={m.id} style={[styles.message, m.role === 'support' ? styles.messageSupport : null]}>
                <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                  <Texte variante="micro">
                    {m.role === 'support' ? 'SUPPORT LIKED' : `${auteur?.pseudo ?? 'Membre'} · ${m.role.toUpperCase()}`}
                  </Texte>
                  <Texte variante="micro" style={{ marginLeft: 'auto' }}>{depuis(m.le)}</Texte>
                </View>
                <Texte variante="corps" couleur={aMoi ? colors.encre : colors.encre}>{m.texte}</Texte>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {litige.statut !== 'resolu' ? (
        <View style={styles.barre}>
          <TextInput
            value={saisie}
            onChangeText={setSaisie}
            placeholder="Ajouter un élément…"
            placeholderTextColor={colors.encre40}
            style={styles.saisie}
            multiline
          />
          <Pressable
            onPress={() => { if (saisie.trim()) { repondreLitige(litige.id, saisie.trim()); setSaisie(''); } }}
            style={styles.envoyer}
            accessibilityLabel="Envoyer"
          >
            <Ionicons name="arrow-up" size={20} color={colors.blanc} />
          </Pressable>
        </View>
      ) : null}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bloc: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  photo: { width: 90, height: 90, borderRadius: radius.md, backgroundColor: colors.sableFonce },
  encart: {
    flexDirection: 'row', gap: space.md, alignItems: 'flex-start',
    backgroundColor: colors.alerteDoux, borderRadius: radius.lg, padding: space.lg,
  },
  decision: { backgroundColor: colors.succesDoux, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  message: { backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg, gap: 4 },
  messageSupport: { backgroundColor: colors.encre15 },
  barre: {
    flexDirection: 'row', alignItems: 'flex-end', gap: space.sm,
    padding: space.lg, backgroundColor: colors.blanc,
    borderTopWidth: 1, borderTopColor: colors.encre15,
  },
  saisie: {
    flex: 1, minHeight: 42, maxHeight: 110, backgroundColor: colors.sable,
    borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: 11,
    fontFamily: font.regular, fontSize: 15, color: colors.encre,
  },
  envoyer: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.corail,
    alignItems: 'center', justifyContent: 'center',
  },
});
