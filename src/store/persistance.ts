import AsyncStorage from '@react-native-async-storage/async-storage';

const CLE = 'liked:etat:v1';

export async function lireEtat<T>(): Promise<T | null> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    return brut ? (JSON.parse(brut) as T) : null;
  } catch {
    return null;
  }
}

let minuteur: ReturnType<typeof setTimeout> | null = null;

export function ecrireEtat(etat: unknown) {
  if (minuteur) clearTimeout(minuteur);
  minuteur = setTimeout(() => {
    AsyncStorage.setItem(CLE, JSON.stringify(etat)).catch(() => {});
  }, 250);
}

export async function effacerEtat() {
  await AsyncStorage.removeItem(CLE);
}
