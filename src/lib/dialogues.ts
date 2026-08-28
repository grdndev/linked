import { Alert, Platform } from 'react-native';

/**
 * `Alert.alert` n'a aucun effet sur le web : les boutons ne s'affichent pas et
 * les actions de confirmation restent silencieusement inertes. On retombe donc
 * sur les boîtes natives du navigateur.
 */
export function alerter(titre: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${titre}\n\n${message}` : titre);
    return;
  }
  Alert.alert(titre, message);
}

export async function confirmer(
  titre: string,
  message: string,
  libelleConfirmation = 'Confirmer',
  destructif = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    return window.confirm(`${titre}\n\n${message}`);
  }
  return new Promise((resoudre) => {
    Alert.alert(titre, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resoudre(false) },
      {
        text: libelleConfirmation,
        style: destructif ? 'destructive' : 'default',
        onPress: () => resoudre(true),
      },
    ]);
  });
}
