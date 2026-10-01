import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, type ViewProps } from 'react-native';

const Mouvement = createContext<boolean | null>(null);

/** Une seule écoute du réglage système pour toutes les animations de l'app. */
export function MouvementProvider({ children }: { children: ReactNode }) {
  const [reduit, setReduit] = useState<boolean | null>(() =>
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : null);
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const change = () => setReduit(media.matches);
      change();
      media.addEventListener('change', change);
      return () => media.removeEventListener('change', change);
    }
    let actif = true;
    let modifie = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      modifie = true; setReduit(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (actif && !modifie) setReduit(value);
    }).catch(() => { if (actif) setReduit(true); });
    return () => { actif = false; subscription.remove(); };
  }, []);
  return <Mouvement.Provider value={reduit}>{children}</Mouvement.Provider>;
}

export const useMouvementReduit = () => useContext(Mouvement);

/** Entrée unique, sans boucle ni délai imposé à la navigation. */
export function Apparition({ children, style, delai = 0, ...props }: ViewProps & { delai?: number }) {
  const reduit = useMouvementReduit();
  const progression = useRef(new Animated.Value(reduit === true ? 1 : 0)).current;
  const jouee = useRef(false);
  useEffect(() => {
    if (reduit === null) return;
    if (reduit || jouee.current) { progression.setValue(1); return; }
    jouee.current = true;
    const animation = Animated.timing(progression, {
      toValue: 1, duration: 420, delay: delai,
      easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [reduit, progression, delai]);
  return <Animated.View {...props} style={[style, {
    opacity: progression,
    transform: [{ translateY: progression.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  }]}>{children}</Animated.View>;
}
