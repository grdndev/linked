import { View } from 'react-native';
import { colors, font, radius } from '@/theme';
import { Texte } from './Texte';

type Ton = 'neutre' | 'succes' | 'alerte' | 'danger' | 'action';

const palettes: Record<Ton, { fond: string; texte: string }> = {
  neutre: { fond: colors.encre15, texte: colors.encre },
  succes: { fond: colors.succesDoux, texte: colors.succes },
  alerte: { fond: colors.alerteDoux, texte: colors.alerte },
  danger: { fond: colors.dangerDoux, texte: colors.danger },
  action: { fond: colors.corailDoux, texte: colors.corailPresse },
};

export function Etiquette({ libelle, ton = 'neutre' }: { libelle: string; ton?: Ton }) {
  const p = palettes[ton];
  return (
    <View style={{ backgroundColor: p.fond, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Texte style={{ fontFamily: font.semibold, fontSize: 11, color: p.texte }}>{libelle}</Texte>
    </View>
  );
}
