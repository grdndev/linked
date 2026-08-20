import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Bouton, Champ, Ecran, EnTete, Etiquette, Texte, Vide } from '@/components';
import { euros, parseEuros } from '@/lib/argent';
import { dateCourte } from '@/lib/temps';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useMoi } from '@/store/selecteurs';

export default function Portefeuille() {
  const moi = useMoi();
  const mouvements = useLiked((e) => e.mouvements.filter((m) => m.utilisateurId === moi?.id));
  const demanderVirement = useLiked((e) => e.demanderVirement);
  const [montant, setMontant] = useState('');
  const [erreur, setErreur] = useState<string>();
  const [enCours, setEnCours] = useState(false);

  if (!moi) return null;

  const virer = async () => {
    const cents = parseEuros(montant);
    if (!cents) return setErreur('Montant invalide.');
    setEnCours(true);
    const resultat = await demanderVirement(cents);
    setEnCours(false);
    if (!resultat.ok) return setErreur(resultat.erreur);
    setErreur(undefined);
    setMontant('');
    Alert.alert('Virement demandé', 'Les fonds arriveront sur ton compte sous 1 à 3 jours ouvrés.');
  };

  return (
    <Ecran>
      <EnTete titre="Mon portefeuille" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }}>
        <View style={styles.solde}>
          <Texte variante="micro" couleur="rgba(255,255,255,0.7)">SOLDE DISPONIBLE</Texte>
          <Texte variante="titre" couleur={colors.blanc}>{euros(moi.soldePortefeuilleCents)}</Texte>
          <Texte variante="petit" couleur="rgba(255,255,255,0.75)">
            Détenu sur un portefeuille de monnaie électronique chez notre prestataire agréé.
          </Texte>
        </View>

        {moi.kyc !== 'valide' ? (
          <View style={styles.alerte}>
            <Ionicons name="shield-outline" size={20} color={colors.alerte} />
            <View style={{ flex: 1, gap: space.sm }}>
              <Texte variante="corps">Vérification d'identité requise</Texte>
              <Texte variante="petit">
                Avant ton premier retrait, notre prestataire de paiement doit vérifier ton identité.
              </Texte>
              <Bouton titre="Vérifier mon identité" taille="sm" onPress={() => router.push('/kyc')} />
            </View>
          </View>
        ) : (
          <View style={styles.bloc}>
            <Texte variante="section">Virer vers mon compte bancaire</Texte>
            <Texte variante="petit">{moi.ibanMasque ?? 'Aucun IBAN enregistré'}</Texte>
            <Champ label="Montant" value={montant} onChangeText={setMontant} keyboardType="decimal-pad" placeholder="0,00" suffixe="€" erreur={erreur} />
            <Bouton titre="Demander le virement" pleineLargeur chargement={enCours} onPress={virer} />
          </View>
        )}

        <View style={{ gap: space.md }}>
          <Texte variante="soustitre">Mouvements</Texte>
          {mouvements.length === 0 ? (
            <Vide icone="wallet-outline" titre="Aucun mouvement" corps="Tes ventes créditeront ce portefeuille." />
          ) : (
            mouvements.map((m) => (
              <View key={m.id} style={styles.mouvement}>
                <View style={{ flex: 1 }}>
                  <Texte variante="corps">{m.libelle}</Texte>
                  <Texte variante="micro">{dateCourte(m.le)}</Texte>
                </View>
                <Texte
                  variante="prix"
                  couleur={m.sens === 'credit' ? colors.succes : colors.encre}
                >
                  {m.sens === 'credit' ? '+' : '−'}{euros(m.montantCents)}
                </Texte>
              </View>
            ))
          )}
        </View>

        <Etiquette libelle={`DAC7 · ${(moi.dac7.montantAnnuelCents / 100).toFixed(2)} € sur ${moi.dac7.nombreTransactionsAnnuel} vente(s) en ${moi.dac7.anneeReference}`} />
        <Texte variante="micro">
          Au-delà de 30 ventes ou 2 000 € par an, la plateforme est tenue de déclarer tes revenus
          à l'administration fiscale (directive DAC7). Tu recevras un récapitulatif annuel.
        </Texte>
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  solde: { backgroundColor: colors.encre, borderRadius: radius.lg, padding: space.xl, gap: 4 },
  bloc: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  alerte: {
    flexDirection: 'row', gap: space.md, alignItems: 'flex-start',
    backgroundColor: colors.alerteDoux, borderRadius: radius.lg, padding: space.lg,
  },
  mouvement: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg,
  },
});
