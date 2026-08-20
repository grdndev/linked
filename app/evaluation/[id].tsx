import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Avatar, Bouton, Champ, Ecran, EnTete, Texte } from '@/components';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useCommande, useMoi, useUtilisateur } from '@/store/selecteurs';

export default function Evaluation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commande = useCommande(id);
  const moi = useMoi();
  const evaluer = useLiked((e) => e.evaluer);
  const jeSuisAcheteur = commande?.acheteurId === moi?.id;
  const cible = useUtilisateur(jeSuisAcheteur ? commande?.vendeurId : commande?.acheteurId);

  const [note, setNote] = useState(5);
  const [commentaire, setCommentaire] = useState('');

  if (!commande || !cible) return null;

  return (
    <Ecran>
      <EnTete titre="Évaluer" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: space.md }}>
          <Avatar uri={cible.photoUrl} pseudo={cible.pseudo} taille={72} />
          <Texte variante="soustitre" centre>
            Comment s'est passée la transaction avec {cible.pseudo} ?
          </Texte>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} onPress={() => setNote(n)} hitSlop={6} accessibilityLabel={`${n} étoile(s)`}>
              <Ionicons name={note >= n ? 'star' : 'star-outline'} size={38} color={note >= n ? colors.corail : colors.encre40} />
            </Pressable>
          ))}
        </View>

        <Champ
          label="Commentaire" multiline value={commentaire} onChangeText={setCommentaire}
          placeholder="Article conforme, échange sympa, ponctualité…"
        />

        <View style={{ backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg }}>
          <Texte variante="petit">
            Ton évaluation est publique et visible sur le profil de {cible.pseudo}.
            Reste factuel et courtois : les commentaires injurieux sont supprimés.
          </Texte>
        </View>

        <Bouton
          titre="Publier mon évaluation" pleineLargeur
          onPress={() => { evaluer(commande.id, note, commentaire.trim()); router.back(); }}
        />
      </ScrollView>
    </Ecran>
  );
}
