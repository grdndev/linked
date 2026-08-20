import { Text as TexteRN, type TextProps, type TextStyle } from 'react-native';
import { type } from '@/theme';

type Variante = keyof typeof type;

interface Props extends TextProps {
  variante?: Variante;
  couleur?: string;
  centre?: boolean;
  style?: TextStyle | TextStyle[];
}

export function Texte({ variante = 'corps', couleur, centre, style, ...reste }: Props) {
  return (
    <TexteRN
      {...reste}
      style={[
        type[variante],
        couleur ? { color: couleur } : null,
        centre ? { textAlign: 'center' } : null,
        style as TextStyle,
      ]}
    />
  );
}
