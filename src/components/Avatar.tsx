import { View } from 'react-native';
import { Image } from 'expo-image';
import { colors, font } from '@/theme';
import { Texte } from './Texte';

export function Avatar({ uri, pseudo, taille = 40 }: { uri?: string; pseudo: string; taille?: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: colors.sableFonce }}
        contentFit="cover"
        transition={150}
      />
    );
  }
  return (
    <View
      style={{
        width: taille, height: taille, borderRadius: taille / 2,
        backgroundColor: colors.encre15, alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Texte style={{ fontFamily: font.semibold, fontSize: taille * 0.4, color: colors.encre }}>
        {pseudo.slice(0, 1).toUpperCase()}
      </Texte>
    </View>
  );
}
