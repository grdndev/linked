import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, Bouton, Ecran, EnTete, Etiquette, Feuille, Texte } from '@/components';
import { euros } from '@/lib/argent';
import { dateCourte } from '@/lib/temps';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import type { StatutKyc, Utilisateur } from '@/types';

const KYC: Record<StatutKyc, { libelle: string; ton: 'neutre' | 'succes' | 'alerte' | 'danger' }> = {
  non_requis: { libelle: 'Non requis', ton: 'neutre' },
  a_fournir: { libelle: 'À fournir', ton: 'alerte' },
  en_examen: { libelle: 'En examen', ton: 'alerte' },
  valide: { libelle: 'Validé', ton: 'succes' },
  refuse: { libelle: 'Refusé', ton: 'danger' },
};

export default function AdminUtilisateurs() {
  const utilisateurs = useLiked((e) => e.utilisateurs);
  const { sanctionner, majStatutKyc } = useLiked();
  const [cible, setCible] = useState<Utilisateur | null>(null);

  return (
    <Ecran>
      <EnTete titre="Utilisateurs" sousTitre={`${utilisateurs.length} compte(s)`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: space.xxxl }}>
        {utilisateurs.map((u) => (
          <Pressable key={u.id} onPress={() => setCible(u)} style={styles.carte}>
            <Avatar uri={u.photoUrl} pseudo={u.pseudo} taille={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <Texte variante="corps">{u.pseudo}{u.role === 'admin' ? ' · admin' : ''}</Texte>
              <Texte variante="petit">{u.commune} · inscrit le {dateCourte(u.dateInscription)}</Texte>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Etiquette libelle={KYC[u.kyc].libelle} ton={KYC[u.kyc].ton} />
                {u.statut !== 'actif' ? <Etiquette libelle={u.statut} ton="danger" /> : null}
              </View>
            </View>
            <Texte variante="petit">{u.nombreVentes} vente(s)</Texte>
          </Pressable>
        ))}
      </ScrollView>

      <Feuille visible={Boolean(cible)} onFermer={() => setCible(null)} titre={cible?.pseudo} hauteur={0.8}>
        {cible ? (
          <>
            <View style={styles.bloc}>
              <Texte variante="petit">Identifiant : {cible.id}</Texte>
              <Texte variante="petit">E-mail : {cible.email}</Texte>
              <Texte variante="petit">Portefeuille : {euros(cible.soldePortefeuilleCents)}</Texte>
              <Texte variante="petit">
                DAC7 {cible.dac7.anneeReference} : {(cible.dac7.montantAnnuelCents / 100).toFixed(2)} € ·
                {' '}{cible.dac7.nombreTransactionsAnnuel} transaction(s)
              </Texte>
              <Texte variante="petit">NIF : {cible.dac7.nif ?? '—'}</Texte>
            </View>

            <Texte variante="micro">STATUT KYC</Texte>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              {(Object.keys(KYC) as StatutKyc[]).map((k) => (
                <Bouton
                  key={k} titre={KYC[k].libelle} taille="sm"
                  ton={cible.kyc === k ? 'encre' : 'contour'}
                  onPress={() => { majStatutKyc(cible.id, k); setCible({ ...cible, kyc: k }); }}
                />
              ))}
            </View>

            <Texte variante="micro">SANCTIONS</Texte>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Bouton titre="Lever" taille="sm" ton="contour" onPress={() => { sanctionner(cible.id, 'actif', 'Levée de sanction'); setCible(null); }} />
              <Bouton titre="Avertir" taille="sm" ton="discret" onPress={() => { sanctionner(cible.id, 'averti', 'Avertissement'); setCible(null); }} />
              <Bouton titre="Suspendre" taille="sm" ton="discret" onPress={() => { sanctionner(cible.id, 'suspendu', 'Suspension temporaire'); setCible(null); }} />
              <Bouton titre="Bannir" taille="sm" ton="danger" onPress={() => { sanctionner(cible.id, 'banni', 'Bannissement définitif'); setCible(null); }} />
            </View>
          </>
        ) : null}
      </Feuille>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.md,
  },
  bloc: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: 4 },
});
