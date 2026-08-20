import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, space } from '@/theme';
import { Bouton } from './Bouton';
import { Texte } from './Texte';

export function Vide({
  icone = 'sparkles-outline', titre, corps, action, onAction,
}: {
  icone?: keyof typeof Ionicons.glyphMap;
  titre: string;
  corps?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxxl, paddingHorizontal: space.xl, gap: space.md }}>
      <View
        style={{
          width: 64, height: 64, borderRadius: 32, backgroundColor: colors.corailDoux,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name={icone} size={28} color={colors.corail} />
      </View>
      <Texte variante="soustitre" centre>{titre}</Texte>
      {corps ? <Texte variante="corpsDoux" centre>{corps}</Texte> : null}
      {action ? <Bouton titre={action} onPress={onAction} taille="sm" style={{ marginTop: space.sm }} /> : null}
    </View>
  );
}
