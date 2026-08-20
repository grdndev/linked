import { useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, font, radius, space } from '@/theme';
import { Texte } from './Texte';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  aide?: string;
  erreur?: string;
  suffixe?: string;
  /** Style du conteneur, pas du champ de saisie. */
  style?: StyleProp<ViewStyle>;
}

export function Champ({ label, aide, erreur, suffixe, style, multiline, ...reste }: Props) {
  const [actif, setActif] = useState(false);
  return (
    <View style={[{ gap: space.xs }, style]}>
      {label ? <Texte variante="micro">{label.toUpperCase()}</Texte> : null}
      <View
        style={[
          styles.cadre,
          multiline ? { height: 120, alignItems: 'flex-start', paddingTop: space.md } : null,
          actif ? { borderColor: colors.corail } : null,
          erreur ? { borderColor: colors.danger } : null,
        ]}
      >
        <TextInput
          {...reste}
          multiline={multiline}
          onFocus={(e) => { setActif(true); reste.onFocus?.(e); }}
          onBlur={(e) => { setActif(false); reste.onBlur?.(e); }}
          placeholderTextColor={colors.encre40}
          style={styles.saisie}
        />
        {suffixe ? <Texte variante="corpsDoux">{suffixe}</Texte> : null}
      </View>
      {erreur ? (
        <Texte variante="petit" couleur={colors.danger}>{erreur}</Texte>
      ) : aide ? (
        <Texte variante="petit">{aide}</Texte>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cadre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.blanc,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.encre15,
    paddingHorizontal: space.lg,
    height: 52,
  },
  saisie: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.encre,
    height: '100%',
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
});
