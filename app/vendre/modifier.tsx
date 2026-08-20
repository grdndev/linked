import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Bouton, Champ, Ecran, EnTete, Puce, Texte } from '@/components';
import { COMMUNES } from '@/data/communes';
import { euros, fraisProtectionCents, parseEuros } from '@/lib/argent';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useAnnonce } from '@/store/selecteurs';

export default function ModifierAnnonce() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const annonce = useAnnonce(id);
  const modifierAnnonce = useLiked((e) => e.modifierAnnonce);

  const [titre, setTitre] = useState(annonce?.titre ?? '');
  const [description, setDescription] = useState(annonce?.description ?? '');
  const [prix, setPrix] = useState(annonce ? (annonce.prixCents / 100).toFixed(2).replace('.', ',') : '');
  const [commune, setCommune] = useState(annonce?.communeRemise);
  const [erreur, setErreur] = useState<string>();

  if (!annonce) return null;

  const prixCents = parseEuros(prix) ?? 0;

  return (
    <Ecran>
      <EnTete titre="Modifier l'annonce" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
        <Champ label="Titre" value={titre} onChangeText={setTitre} maxLength={80} />
        <Champ label="Description" value={description} onChangeText={setDescription} multiline />
        <Champ label="Prix" value={prix} onChangeText={setPrix} keyboardType="decimal-pad" suffixe="€" />
        {prixCents > 0 ? (
          <View style={{ backgroundColor: colors.succesDoux, borderRadius: radius.md, padding: space.lg }}>
            <Texte variante="petit">
              L'acheteur paiera {euros(prixCents + fraisProtectionCents(prixCents))} protection incluse.
            </Texte>
          </View>
        ) : null}

        {annonce.accepteMainPropre ? (
          <View style={{ gap: space.sm }}>
            <Texte variante="micro">COMMUNE DE REMISE</Texte>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {COMMUNES.map((c) => (
                <Puce key={c} libelle={c} compact active={c === commune} onPress={() => setCommune(c)} />
              ))}
            </View>
          </View>
        ) : null}

        {erreur ? <Texte variante="petit" couleur={colors.danger}>{erreur}</Texte> : null}

        <Bouton
          titre="Enregistrer" pleineLargeur
          onPress={() => {
            if (prixCents < 100) return setErreur('Le prix minimum est de 1 €.');
            modifierAnnonce(annonce.id, { titre: titre.trim(), description: description.trim(), prixCents, communeRemise: commune });
            router.back();
          }}
        />
        <Bouton
          titre={annonce.statut === 'masquee' ? 'Remettre en ligne' : 'Masquer temporairement'}
          ton="contour" pleineLargeur
          onPress={() => {
            modifierAnnonce(annonce.id, { statut: annonce.statut === 'masquee' ? 'en_ligne' : 'masquee' });
            router.back();
          }}
        />
      </ScrollView>
    </Ecran>
  );
}
