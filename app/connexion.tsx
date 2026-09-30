import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Bouton, Champ, Ecran, EnTete, Texte } from '@/components';
import { colors, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { MODE_DEMO } from '@/services/config';

export default function Connexion() {
  const { connecter, demanderCode } = useLiked();
  const [email, setEmail] = useState(MODE_DEMO ? 'demo@liked.re' : '');
  const [code, setCode] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string>();
  const [enCours, setEnCours] = useState(false);
  const valider = async () => {
    setEnCours(true); setErreur(undefined);
    try {
      if (!MODE_DEMO && !envoye) { await demanderCode(email,'email'); setEnvoye(true); return; }
      const result = await connecter(email,code);
      if (!result.ok) { setErreur(result.erreur); return; }
      router.replace('/(tabs)');
    } catch (error) { setErreur((error as Error).message); }
    finally { setEnCours(false); }
  };
  return <Ecran><EnTete titre="Connexion" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <Texte variante="titre">Ton dressing t’attend.</Texte>
        <Texte variante="corpsDoux">{MODE_DEMO ? 'Explore Liked avec un compte de démonstration.' : 'Un code dans ta boîte mail, et te voilà connecté.'}</Texte>
        <Champ label="E-mail" value={email} onChangeText={v => { setEmail(v); setEnvoye(false); setCode(''); }} autoCapitalize="none" keyboardType="email-address" placeholder="ton@email.re" />
        {envoye && <Champ label="Code reçu par e-mail" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="one-time-code" maxLength={6} placeholder="000000" />}
        {erreur && <Texte couleur={colors.danger} accessibilityRole="alert">{erreur}</Texte>}
        <Bouton titre={MODE_DEMO ? 'Ouvrir la démonstration' : envoye ? 'Vérifier et me connecter' : 'Recevoir mon code'} pleineLargeur chargement={enCours} onPress={valider} />
        {envoye && <Bouton titre="Renvoyer un code" ton="contour" desactive={enCours} onPress={async () => { setEnCours(true); try { await demanderCode(email,'email'); setErreur(undefined); } catch(e) { setErreur((e as Error).message); } finally { setEnCours(false); } }} />}
        {MODE_DEMO && <View style={{ backgroundColor: colors.blanc, padding: space.lg, borderRadius: 16, gap: 8 }}>
          <Texte variante="micro">COMPTES FICTIFS · AUCUN PAIEMENT RÉEL</Texte>
          <Texte variante="petit">demo@liked.re — membre de Saint-Pierre</Texte>
          <Texte variante="petit">admin@liked.re — visite du back-office</Texte>
        </View>}
      </ScrollView>
    </KeyboardAvoidingView>
  </Ecran>;
}
