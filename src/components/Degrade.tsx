import { View } from 'react-native';

/**
 * Voile encre dégradé sans dépendance native supplémentaire : superposition de
 * bandes d'opacité croissante. Suffisant pour garantir le contraste du texte.
 */
export function LinearGradientLike({ depuisLeHaut = false }: { depuisLeHaut?: boolean }) {
  const bandes = Array.from({ length: 12 }, (_, i) => i);
  return (
    <View style={{ position: 'absolute', inset: 0 }} pointerEvents="none">
      {bandes.map((i) => {
        const t = depuisLeHaut ? 1 - i / bandes.length : i / bandes.length;
        return (
          <View
            key={i}
            style={{ flex: 1, backgroundColor: `rgba(11,59,60,${0.15 + t * 0.65})` }}
          />
        );
      })}
    </View>
  );
}
