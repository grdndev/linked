import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Avatar, Bouton, Ecran, Etiquette, Etoiles, Groupe, Ligne, Texte, Vide } from '@/components';
import { euros } from '@/lib/argent';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useShallow } from 'zustand/react/shallow';
import { useMoi } from '@/store/selecteurs';
import type { StatutKyc } from '@/types';
import { confirmer } from '@/lib/dialogues';

const LIBELLES_KYC: Record<StatutKyc, { libelle: string; ton: 'neutre' | 'succes' | 'alerte' | 'danger' }> = {
  non_requis: { libelle: 'Identité non requise', ton: 'neutre' },
  a_fournir: { libelle: 'Identité à vérifier', ton: 'alerte' },
  en_examen: { libelle: 'Vérification en cours', ton: 'alerte' },
  valide: { libelle: 'Identité vérifiée', ton: 'succes' },
  refuse: { libelle: 'Vérification refusée', ton: 'danger' },
};

export default function Profil() {
  const moi = useMoi();
  const deconnecter = useLiked((e) => e.deconnecter);
  const annonces = useLiked(useShallow((e) => e.annonces.filter((a) => a.vendeurId === moi?.id && a.statut !== 'supprimee')));
  const achats = useLiked(useShallow((e) => e.commandes.filter((c) => c.acheteurId === moi?.id)));
  const ventes = useLiked(useShallow((e) => e.commandes.filter((c) => c.vendeurId === moi?.id)));
  const favoris = useLiked((e) => (moi ? (e.favoris[moi.id] ?? []).length : 0));
  const recherches = useLiked((e) => e.recherchesSauvegardees.filter((r) => r.utilisateurId === moi?.id).length);

  if (!moi) {
    return (
      <Ecran>
        <Vide icone="person-outline" titre="Ton profil" corps="Connecte-toi pour gérer tes annonces, tes achats et ton portefeuille."
          action="Se connecter" onAction={() => router.push('/bienvenue')} />
      </Ecran>
    );
  }

  const kyc = LIBELLES_KYC[moi.kyc];

  return (
    <Ecran>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxxl }}>
        <View style={styles.carteProfil}>
          <Avatar uri={moi.photoUrl} pseudo={moi.pseudo} taille={64} />
          <View style={{ flex: 1, gap: 4 }}>
            <Texte variante="soustitre">{moi.pseudo}</Texte>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="location-outline" size={13} color={colors.encre60} />
              <Texte variante="petit">{moi.commune}</Texte>
            </View>
            <Etoiles note={moi.noteMoyenne} nombre={moi.nombreEvaluations} />
          </View>
          <Pressable onPress={() => router.push(`/profil/${moi.id}`)} hitSlop={8} accessibilityLabel="Voir mon profil public">
            <Ionicons name="open-outline" size={20} color={colors.encre60} />
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/portefeuille')} style={styles.portefeuille}>
          <View style={{ flex: 1, gap: 2 }}>
            <Texte variante="micro" couleur="rgba(255,255,255,0.7)">MON PORTEFEUILLE</Texte>
            <Texte variante="titre" couleur={colors.blanc}>{euros(moi.soldePortefeuilleCents)}</Texte>
          </View>
          <Etiquette libelle={kyc.libelle} ton={kyc.ton} />
        </Pressable>

        <Groupe titre="Vendre">
          <Ligne icone="pricetags-outline" titre="Mes annonces" valeur={String(annonces.length)} onPress={() => router.push('/mes-annonces')} />
          <Ligne icone="cube-outline" titre="Mes ventes" valeur={String(ventes.length)} onPress={() => router.push('/mes-ventes')} />
          <Ligne
            icone="shield-checkmark-outline"
            titre="Vérification d'identité"
            valeur={kyc.libelle}
            onPress={() => router.push('/kyc')}
          />
        </Groupe>

        <Groupe titre="Acheter">
          <Ligne icone="bag-handle-outline" titre="Mes achats" valeur={String(achats.length)} onPress={() => router.push('/mes-achats')} />
          <Ligne icone="heart-outline" titre="Mes favoris" valeur={String(favoris)} onPress={() => router.push('/favoris')} />
          <Ligne icone="notifications-outline" titre="Recherches enregistrées" valeur={String(recherches)} onPress={() => router.push('/recherches')} />
        </Groupe>

        <Groupe titre="Compte">
          <Ligne icone="options-outline" titre="Notifications" onPress={() => router.push('/reglages/notifications')} />
          <Ligne icone="lock-closed-outline" titre="Confidentialité et données" onPress={() => router.push('/reglages/confidentialite')} />
          <Ligne icone="help-circle-outline" titre="Aide et conditions" onPress={() => router.push('/reglages')} />
          {moi.role === 'admin' ? (
            <Ligne icone="construct-outline" titre="Back-office Liked" onPress={() => router.push('/admin')} />
          ) : null}
        </Groupe>

        <Bouton
          titre="Se déconnecter"
          ton="contour"
          pleineLargeur
          onPress={async () => {
            const ok = await confirmer(
              'Se déconnecter',
              'Tu veux vraiment quitter ta session ?',
              'Se déconnecter',
              true,
            );
            if (ok) { deconnecter(); router.replace('/bienvenue'); }
          }}
        />
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carteProfil: {
    flexDirection: 'row', alignItems: 'center', gap: space.lg,
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg,
  },
  portefeuille: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.encre, borderRadius: radius.lg, padding: space.lg,
  },
});
