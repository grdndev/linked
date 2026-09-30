import { useState } from 'react';
import { Linking, View } from 'react-native';
import { Bouton, Ecran, EnTete, Texte } from '@/components';
import { api } from '@/services/api';
import { colors, space } from '@/theme';
export default function CompteStripe() {
  const [error,setError] = useState('');
  return <Ecran><EnTete titre="Ton compte vendeur"/><View style={{ padding: space.xl, gap: space.lg }}>
    <Texte variante="titre">Prêt à vendre ?</Texte>
    <Texte variante="corpsDoux">Stripe vérifie ton identité et gère les versements sur ton compte bancaire. Tes documents restent chez Stripe.</Texte>
    <Texte variante="petit">Cette version utilise Stripe en mode test. Les transferts ne représentent pas des fonds réels.</Texte>
    <Bouton titre="Configurer mon compte Stripe" onPress={async () => { setError(''); try { const result = await api<{url: string}>('/connect/onboarding',{}); await Linking.openURL(result.url); } catch(e) { setError((e as Error).message); } }}/>
    {!!error && <Texte couleur={colors.danger}>{error}</Texte>}
  </View></Ecran>;
}
