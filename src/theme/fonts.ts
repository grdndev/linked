import {
  useFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from '@expo-google-fonts/outfit';
import { useEffect, useState } from 'react';

export function useMarqueFonts() {
  const [delaiDepasse, setDelaiDepasse] = useState(false);
  const [chargees, erreur] = useFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });
  useEffect(() => {
    const timer = setTimeout(() => setDelaiDepasse(true), 5000);
    return () => clearTimeout(timer);
  }, []);
  // A slow or unavailable font must never leave the app on a blank screen.
  return chargees || !!erreur || delaiDepasse;
}
