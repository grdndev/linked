import { useEffect, useRef, useState } from 'react';
import { alerter } from '@/lib/dialogues';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, space } from '@/theme';
import { Texte } from './Texte';
import { useMouvementReduit } from './Mouvement';

const PressableAnime = Animated.createAnimatedComponent(Pressable);

type Ton = 'action' | 'encre' | 'contour' | 'contourClair' | 'discret' | 'danger';
type Taille = 'md' | 'lg' | 'sm';

interface Props {
  titre: string;
  onPress?: () => unknown;
  ton?: Ton;
  taille?: Taille;
  icone?: keyof typeof Ionicons.glyphMap;
  pleineLargeur?: boolean;
  chargement?: boolean;
  desactive?: boolean;
  style?: ViewStyle;
}

/** Le corail est la couleur d'action unique (§3.2) : `ton="action"`. */
export function Bouton({
  titre, onPress, ton = 'action', taille = 'md', icone,
  pleineLargeur, chargement, desactive, style,
}: Props) {
  const verrou = useRef(false);
  const [occupe, setOccupe] = useState(false);
  const inactif = desactive || chargement || occupe;
  const mouvementReduit = useMouvementReduit();
  const echelle = useRef(new Animated.Value(1)).current;
  const [appuye, setAppuye] = useState(false);
  const animer = (toValue: number) => {
    echelle.stopAnimation();
    if (mouvementReduit !== false) { echelle.setValue(1); return; }
    Animated.spring(echelle, { toValue, speed: 32, bounciness: 3, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  useEffect(() => {
    if (inactif || mouvementReduit !== false) { echelle.stopAnimation(); echelle.setValue(1); setAppuye(false); }
    return () => echelle.stopAnimation();
  }, [inactif, mouvementReduit, echelle]);
  const fonds: Record<Ton, ViewStyle> = {
    action: { backgroundColor: colors.corail },
    encre: { backgroundColor: colors.encre },
    contour: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.encre15 },
    // Sur photo ou fond encre : bordure et texte blancs pour rester lisible.
    contourClair: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.65)' },
    discret: { backgroundColor: colors.sableFonce },
    danger: { backgroundColor: colors.dangerDoux, borderWidth: 1.5, borderColor: colors.danger },
  };
  const textes: Record<Ton, string> = {
    action: colors.blanc,
    encre: colors.blanc,
    contour: colors.encre,
    contourClair: colors.blanc,
    discret: colors.encre,
    danger: colors.danger,
  };
  const hauteurs: Record<Taille, number> = { sm: 38, md: 48, lg: 56 };

  return (
    <PressableAnime
      disabled={!!inactif}
      onPressIn={() => { setAppuye(true); animer(0.975); }}
      onPressOut={() => { setAppuye(false); animer(1); }}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactif }}
      onPress={async () => {
        if (inactif || verrou.current || !onPress) return;
        verrou.current = true; setOccupe(true);
        try { await onPress(); } catch(e) { alerter('Action impossible', (e as Error).message); }
        finally { verrou.current = false; setOccupe(false); }
      }}
      style={[
        styles.base,
        fonds[ton],
        { height: hauteurs[taille] },
        pleineLargeur ? { alignSelf: 'stretch' } : null,
        appuye && !inactif ? { opacity: 0.88 } : null,
        inactif ? { opacity: 0.45 } : null,
        style,
        { transform: [{ scale: echelle }] },
      ]}
    >
      {chargement || occupe ? (
        <ActivityIndicator color={textes[ton]} />
      ) : (
        <View style={styles.contenu}>
          {icone ? <Ionicons name={icone} size={taille === 'sm' ? 16 : 18} color={textes[ton]} /> : null}
          <Texte
            style={{
              fontFamily: font.semibold,
              fontSize: taille === 'sm' ? 14 : 16,
              color: textes[ton],
            }}
          >
            {titre}
          </Texte>
        </View>
      )}
    </PressableAnime>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  contenu: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
