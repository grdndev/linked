import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/theme';
import { useMarqueFonts } from '@/theme/fonts';
import { useLiked } from '@/store/liked';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function DispositionRacine() {
  const policesPretes = useMarqueFonts();
  const pret = useLiked((e) => e.pret);
  const amorcer = useLiked((e) => e.amorcer);
  const libererFondsSiEchu = useLiked((e) => e.libererFondsSiEchu);

  useEffect(() => {
    amorcer();
  }, [amorcer]);

  useEffect(() => {
    if (policesPretes && pret) SplashScreen.hideAsync().catch(() => {});
  }, [policesPretes, pret]);

  // Libération automatique des fonds échus (livraison + 48 h, §4.6).
  useEffect(() => {
    const minuteur = setInterval(() => { libererFondsSiEchu(); }, 30000);
    return () => clearInterval(minuteur);
  }, [libererFondsSiEchu]);

  if (!policesPretes || !pret) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.sable },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="paiement/[id]" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="vendre/publier" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
