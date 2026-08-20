import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { Bouton, Champ, Ecran, EnTete, Texte } from '@/components';
import { colors, space } from '@/theme';
import { useLiked } from '@/store/liked';

export default function Connexion() {
  const connecter = useLiked((e) => e.connecter);
  const [email, setEmail] = useState('demo@liked.re');
  const [erreur, setErreur] = useState<string>();
  const [enCours, setEnCours] = useState(false);

  const valider = async () => {
    setEnCours(true);
    setErreur(undefined);
    const resultat = await connecter(email);
    setEnCours(false);
    if (!resultat.ok) return setErreur(resultat.erreur);
    router.replace('/(tabs)');
  };

  return (
    <Ecran>
      <EnTete titre="Connexion" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
          <Texte variante="titre">Content de te revoir 👋</Texte>
          <Champ
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ton@email.re"
            erreur={erreur}
          />
          <Bouton titre="Se connecter" pleineLargeur chargement={enCours} onPress={valider} />
          <View style={{ backgroundColor: colors.corailDoux, padding: space.lg, borderRadius: 16, gap: 4 }}>
            <Texte variante="micro" couleur={colors.corailPresse}>COMPTES DE DÉMONSTRATION</Texte>
            <Texte variante="petit">demo@liked.re — membre vérifié (Saint-Pierre)</Texte>
            <Texte variante="petit">admin@liked.re — accès back-office</Texte>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Ecran>
  );
}
