import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { Texte } from './Texte';

export function Etoiles({
  note, nombre, taille = 14, afficherNombre = true,
}: { note: number; nombre?: number; taille?: number; afficherNombre?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={note >= i ? 'star' : note >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={taille}
          color={note >= i - 0.5 ? colors.corail : colors.encre40}
        />
      ))}
      {afficherNombre ? (
        <Texte variante="petit" style={{ marginLeft: 4 }}>
          {note > 0 ? note.toFixed(1) : '—'}
          {nombre != null ? ` (${nombre})` : ''}
        </Texte>
      ) : null}
    </View>
  );
}
