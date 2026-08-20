import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * Icône de marque : le cœur corail du point du « i » — geste signature (§3.1).
 */
export function CoeurLiked({ taille = 24, couleur = colors.corail }: { taille?: number; couleur?: string }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 24 24">
      <Path
        d="M12 21s-7.5-4.7-9.3-9.1C1.3 8.3 3.4 4.7 7 4.7c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 5.7 3.6 4.3 7.2C19.5 16.3 12 21 12 21z"
        fill={couleur}
      />
    </Svg>
  );
}

/**
 * Logotype « liked » en bas de casse, tracé monolinéaire géométrique à
 * extrémités arrondies, point du « i » remplacé par le cœur corail (§3.1).
 * Taille minimale d'affichage : 20 px de haut.
 */
export function Logotype({ hauteur = 28, sombre = false }: { hauteur?: number; sombre?: boolean }) {
  const h = Math.max(20, hauteur);
  const largeur = h * 3.1;
  const trait = sombre ? colors.blanc : colors.encre;
  return (
    <View accessibilityRole="image" accessibilityLabel="liked">
      <Svg width={largeur} height={h} viewBox="0 0 124 40">
        <Path
          d="M8 6v26"
          stroke={trait}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Path d="M26 18v14" stroke={trait} strokeWidth={5} strokeLinecap="round" />
        <Path
          d="M12 3.6c1.6-1.1 3.4-1.1 5 0 1.6 1.1 2.1 3 1.3 4.8-.9 2-4.6 4.4-4.6 4.4S10 10.4 9.1 8.4C8.3 6.6 8.8 4.7 10.4 3.6"
          fill={colors.corail}
          transform="translate(15.6 0)"
        />
        <Path
          d="M44 6v26"
          stroke={trait}
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Path d="M44 24l12-10M46.5 22.5L58 32" stroke={trait} strokeWidth={5} strokeLinecap="round" />
        <Circle cx={78} cy={25} r={7.5} stroke={trait} strokeWidth={5} fill="none" />
        <Path d="M85.5 25h-15" stroke={trait} strokeWidth={5} strokeLinecap="round" />
        <Circle cx={106} cy={25} r={7.5} stroke={trait} strokeWidth={5} fill="none" />
        <Path d="M113.5 6v26" stroke={trait} strokeWidth={5} strokeLinecap="round" />
      </Svg>
    </View>
  );
}
