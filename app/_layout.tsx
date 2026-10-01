import { Ouverture } from '@/components/Ouverture';
import { MouvementProvider, useMouvementReduit } from '@/components/Mouvement';
import { Dialogues } from '@/components/Dialogues';
import { AppState, View } from 'react-native';
import { MODE_DEMO } from '@/services/config';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/theme';
import { useMarqueFonts } from '@/theme/fonts';
import { enregistrerPourLesPush } from '@/services/notificationsPush';
import { useLiked } from '@/store/liked';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function DispositionRacine() {
  return <MouvementProvider><Application /></MouvementProvider>;
}

function Application() {
  const mouvementReduit = useMouvementReduit();
  const policesPretes = useMarqueFonts();
  const pret = useLiked((e) => e.pret);
  const amorcer = useLiked((e) => e.amorcer);
  const rafraichir = useLiked((e) => e.rafraichir);
  const libererFondsSiEchu = useLiked((e) => e.libererFondsSiEchu);

  useEffect(() => {
    amorcer();
  }, [amorcer]);

  useEffect(() => {
    if (mouvementReduit !== null) SplashScreen.hideAsync().catch(() => {});
  }, [mouvementReduit]);

  useEffect(() => {
    if (MODE_DEMO) return;
    const subscription = AppState.addEventListener('change',state => { if (state === 'active') void rafraichir(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void rafraichir(); },15000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [rafraichir]);

  // Autorisation et jeton de notification, à transmettre à l'API en production.
  const sessionId = useLiked((e) => e.sessionId);
  useEffect(() => {
    if (!sessionId || !MODE_DEMO) return;
    enregistrerPourLesPush().catch(() => {});
  }, [sessionId]);

  // Libération automatique des fonds échus (livraison + 48 h, §4.6).
  useEffect(() => {
    const minuteur = setInterval(() => { libererFondsSiEchu(); }, 30000);
    return () => clearInterval(minuteur);
  }, [libererFondsSiEchu]);



  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: colors.encre }}>
        {policesPretes && pret ? <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.sable },
            animation: mouvementReduit === false ? 'slide_from_right' : 'none',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="paiement/[id]" options={{ animation: mouvementReduit === false ? 'slide_from_bottom' : 'none' }} />
        </Stack> : null}
        </View>
        <Dialogues />
        <Ouverture pret={policesPretes && pret} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
