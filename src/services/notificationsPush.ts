import { Platform } from 'react-native';

/**
 * Notifications système (§4.8). Sur mobile, chaque événement déclenche une
 * notification locale immédiate, et le jeton Expo Push est récupéré pour que
 * l'API puisse pousser depuis le serveur. Sur le web, tout est neutralisé.
 */

let configure = false;

async function module_() {
  if (Platform.OS === 'web') return null;
  return import('expo-notifications');
}

async function configurer() {
  if (configure) return;
  const Notifications = await module_();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Liked',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#FF5E5B',
    });
  }
  configure = true;
}

/** Demande l'autorisation et renvoie le jeton à transmettre à l'API. */
export async function enregistrerPourLesPush(): Promise<string | null> {
  const Notifications = await module_();
  if (!Notifications) return null;
  await configurer();
  const { status } = await Notifications.getPermissionsAsync();
  let accorde = status === 'granted';
  if (!accorde) {
    const demande = await Notifications.requestPermissionsAsync();
    accorde = demande.status === 'granted';
  }
  if (!accorde) return null;
  try {
    const jeton = await Notifications.getExpoPushTokenAsync();
    return jeton.data;
  } catch {
    // Sans identifiant de projet EAS ou hors build natif, le jeton n'est pas
    // disponible : les notifications locales continuent de fonctionner.
    return null;
  }
}

/** Affiche immédiatement une notification système. */
export async function notifierLocalement(titre: string, corps: string, lien?: string) {
  const Notifications = await module_();
  if (!Notifications) return;
  await configurer();
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    content: { title: titre, body: corps, data: lien ? { lien } : undefined },
    trigger: null,
  });
}
