import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bouton, Champ, Ecran, EnTete, Texte } from '@/components';
import { LIBELLES_GABARIT, calculerPanier, euros } from '@/lib/argent';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useAnnonce, useMoi } from '@/store/selecteurs';
import type { ModeRemise } from '@/types';

export default function Paiement() {
  const { id, prix } = useLocalSearchParams<{ id: string; prix?: string }>();
  const annonce = useAnnonce(id);
  const moi = useMoi();
  const passerCommande = useLiked((e) => e.passerCommande);
  const insets = useSafeAreaInsets();

  const prixNegocieCents = prix ? Number(prix) : undefined;
  const prixCents = prixNegocieCents ?? annonce?.prixCents ?? 0;

  const [mode, setMode] = useState<ModeRemise>(annonce?.accepteMainPropre ? 'main_propre' : 'colissimo');
  const [nomComplet, setNomComplet] = useState(moi?.pseudo ?? '');
  const [ligne1, setLigne1] = useState('');
  const [codePostal, setCodePostal] = useState('974');
  const [ville, setVille] = useState(moi?.commune ?? '');
  const [telephone, setTelephone] = useState(moi?.telephone ?? '');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string>();

  if (!annonce || !moi) {
    return (
      <Ecran>
        <EnTete titre="Paiement" />
        <View style={{ padding: space.lg }}>
          <Texte variante="corpsDoux">Article indisponible.</Texte>
        </View>
      </Ecran>
    );
  }

  const panier = calculerPanier(prixCents, mode, annonce.gabarit);

  const payer = async () => {
    setErreur(undefined);
    if (mode === 'colissimo' && (!ligne1.trim() || !ville.trim() || telephone.replace(/\D/g, '').length < 9)) {
      return setErreur('Complète ton adresse de livraison et ton numéro.');
    }
    setEnCours(true);
    const resultat = await passerCommande({
      annonceId: annonce.id,
      mode,
      prixNegocieCents,
      adresse:
        mode === 'colissimo'
          ? { nomComplet, ligne1, codePostal, ville, telephone }
          : undefined,
    });
    setEnCours(false);
    if (!resultat.ok) return setErreur(resultat.erreur);
    router.replace(`/commande/${resultat.commandeId}`);
  };

  return (
    <Ecran>
      <EnTete titre="Paiement sécurisé" sousTitre={annonce.titre} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: 160 }} keyboardShouldPersistTaps="handled">
          <View style={styles.article}>
            <Image source={{ uri: annonce.photos[0] }} style={styles.vignette} contentFit="cover" />
            <View style={{ flex: 1, gap: 2 }}>
              <Texte variante="corps" numberOfLines={2}>{annonce.titre}</Texte>
              <Texte variante="petit">{annonce.marque} · {annonce.taille}</Texte>
              {prixNegocieCents ? (
                <Texte variante="petit" couleur={colors.succes}>Prix négocié accepté</Texte>
              ) : null}
            </View>
            <Texte variante="prix">{euros(prixCents)}</Texte>
          </View>

          {/* Mode de remise */}
          <View style={{ gap: space.sm }}>
            <Texte variante="micro">COMMENT RÉCUPÉRER L'ARTICLE</Texte>
            {annonce.accepteMainPropre ? (
              <OptionRemise
                actif={mode === 'main_propre'}
                onPress={() => setMode('main_propre')}
                icone="hand-left-outline"
                titre="Remise en main propre"
                detail={`À ${annonce.communeRemise} · gratuit`}
                prix="Gratuit"
              />
            ) : null}
            {annonce.accepteEnvoi ? (
              <OptionRemise
                actif={mode === 'colissimo'}
                onPress={() => setMode('colissimo')}
                icone="cube-outline"
                titre="Envoi Colissimo"
                detail={`Gabarit ${LIBELLES_GABARIT[annonce.gabarit].nom.toLowerCase()} · suivi inclus`}
                prix={euros(panier.fraisPortCents)}
              />
            ) : null}
          </View>

          {mode === 'colissimo' ? (
            <View style={{ gap: space.md }}>
              <Texte variante="micro">ADRESSE DE LIVRAISON</Texte>
              <Champ label="Nom complet" value={nomComplet} onChangeText={setNomComplet} />
              <Champ label="Adresse" value={ligne1} onChangeText={setLigne1} placeholder="12 rue des Bougainvilliers" />
              <View style={{ flexDirection: 'row', gap: space.md }}>
                <Champ style={{ width: 120 }} label="Code postal" value={codePostal} onChangeText={setCodePostal} keyboardType="number-pad" maxLength={5} />
                <Champ style={{ flex: 1 }} label="Ville" value={ville} onChangeText={setVille} />
              </View>
              <Champ label="Téléphone" value={telephone} onChangeText={setTelephone} keyboardType="phone-pad" aide="Utilisé uniquement par le transporteur." />
            </View>
          ) : (
            <View style={styles.encart}>
              <Ionicons name="key-outline" size={20} color={colors.corail} />
              <Texte variante="petit" style={{ flex: 1 }}>
                Après paiement tu reçois un code à 4 chiffres. Vérifie l'article lors de la rencontre,
                puis donne le code au vendeur : c'est ce qui débloque son paiement.
              </Texte>
            </View>
          )}

          {/* Récapitulatif */}
          <View style={styles.recap}>
            <LigneRecap libelle="Article" valeur={euros(panier.prixArticleCents)} />
            <LigneRecap libelle="Protection acheteur" valeur={euros(panier.fraisProtectionCents)} aide="5 % + 0,80 €" />
            <LigneRecap
              libelle="Frais de port"
              valeur={panier.fraisPortCents > 0 ? euros(panier.fraisPortCents) : 'Gratuit'}
            />
            <View style={styles.separateur} />
            <LigneRecap libelle="Total à payer" valeur={euros(panier.totalCents)} fort />
          </View>

          <View style={styles.carteBancaire}>
            <Ionicons name="card-outline" size={20} color={colors.encre80} />
            <View style={{ flex: 1 }}>
              <Texte variante="corps">Carte bancaire</Texte>
              <Texte variante="petit">
                Paiement traité par notre prestataire agréé. Liked ne conserve aucune donnée de carte.
              </Texte>
            </View>
          </View>

          {erreur ? <Texte variante="petit" couleur={colors.danger}>{erreur}</Texte> : null}
        </ScrollView>

        <View style={[styles.barre, { paddingBottom: insets.bottom + space.md }]}>
          <View style={{ flex: 1 }}>
            <Texte variante="micro">TOTAL</Texte>
            <Texte variante="soustitre">{euros(panier.totalCents)}</Texte>
          </View>
          <Bouton titre="Payer" taille="lg" chargement={enCours} onPress={payer} style={{ flex: 1.2 }} />
        </View>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

function OptionRemise({
  actif, onPress, icone, titre, detail, prix,
}: {
  actif: boolean; onPress: () => void;
  icone: 'hand-left-outline' | 'cube-outline';
  titre: string; detail: string; prix: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.option, actif ? { borderColor: colors.corail } : null]}>
      <Ionicons name={actif ? 'radio-button-on' : 'radio-button-off'} size={20} color={actif ? colors.corail : colors.encre40} />
      <Ionicons name={icone} size={18} color={colors.encre80} />
      <View style={{ flex: 1 }}>
        <Texte variante="corps">{titre}</Texte>
        <Texte variante="petit">{detail}</Texte>
      </View>
      <Texte variante="petit" couleur={colors.encre}>{prix}</Texte>
    </Pressable>
  );
}

function LigneRecap({ libelle, valeur, aide, fort }: { libelle: string; valeur: string; aide?: string; fort?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1 }}>
        <Texte variante={fort ? 'section' : 'corps'}>{libelle}</Texte>
        {aide ? <Texte variante="micro">{aide}</Texte> : null}
      </View>
      <Texte variante={fort ? 'prix' : 'corps'}>{valeur}</Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  article: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.md,
  },
  vignette: { width: 56, height: 70, borderRadius: radius.sm, backgroundColor: colors.sableFonce },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  encart: {
    flexDirection: 'row', gap: space.md, alignItems: 'flex-start',
    backgroundColor: colors.corailDoux, borderRadius: radius.lg, padding: space.lg,
  },
  recap: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  separateur: { height: 1, backgroundColor: colors.encre15 },
  carteBancaire: {
    flexDirection: 'row', gap: space.md, alignItems: 'flex-start',
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg,
  },
  barre: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    paddingHorizontal: space.lg, paddingTop: space.md,
    backgroundColor: colors.blanc, borderTopWidth: 1, borderTopColor: colors.encre15,
  },
});
