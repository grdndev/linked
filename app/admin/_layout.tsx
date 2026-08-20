import { Stack } from 'expo-router';
import { View } from 'react-native';

import { Ecran, EnTete, Texte } from '@/components';
import { space } from '@/theme';
import { useMoi } from '@/store/selecteurs';

/** Interface réservée à l'équipe Liked (§4.9). */
export default function DispositionAdmin() {
  const moi = useMoi();

  if (moi?.role !== 'admin') {
    return (
      <Ecran>
        <EnTete titre="Back-office" />
        <View style={{ padding: space.lg }}>
          <Texte variante="corpsDoux">
            Accès réservé à l'équipe Liked. Connecte-toi avec un compte administrateur.
          </Texte>
        </View>
      </Ecran>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
