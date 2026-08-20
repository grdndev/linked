import { Linking, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { Ecran, EnTete, Groupe, Ligne, Texte } from '@/components';
import { CONFIG } from '@/services/config';
import { space } from '@/theme';

export default function Reglages() {
  return (
    <Ecran>
      <EnTete titre="Aide et informations" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxxl }}>
        <Groupe titre="Comment ça marche">
          <Ligne icone="shield-checkmark-outline" titre="La protection acheteur"
            sousTitre="5 % + 0,80 € — l'argent est bloqué jusqu'à confirmation" />
          <Ligne icone="hand-left-outline" titre="La remise en main propre"
            sousTitre="Gratuite, sécurisée par un code à 4 chiffres" />
          <Ligne icone="cube-outline" titre="L'envoi Colissimo"
            sousTitre="Étiquette prépayée, fonds versés 48 h après livraison" />
          <Ligne icone="alert-circle-outline" titre="Ouvrir un litige"
            sousTitre="48 h après la livraison pour signaler un problème" />
        </Groupe>

        <Groupe titre="Nous contacter">
          <Ligne icone="mail-outline" titre="Écrire au support"
            onPress={() => Linking.openURL('mailto:support@liked.re')} />
          <Ligne icone="chatbubbles-outline" titre="Signaler un problème technique"
            onPress={() => Linking.openURL('mailto:support@liked.re?subject=Probl%C3%A8me%20technique')} />
        </Groupe>

        <Groupe titre="Documents">
          <Ligne icone="document-text-outline" titre="Conditions générales" valeur={CONFIG.versionCgu}
            onPress={() => Linking.openURL('https://liked.re/cgu')} />
          <Ligne icone="lock-closed-outline" titre="Politique de confidentialité"
            onPress={() => Linking.openURL('https://liked.re/confidentialite')} />
          <Ligne icone="settings-outline" titre="Mes données personnelles"
            onPress={() => router.push('/reglages/confidentialite')} />
        </Groupe>

        <View style={{ gap: 4 }}>
          <Texte variante="micro" centre>Liked · version 1.0.0</Texte>
          <Texte variante="micro" centre>
            Service exclusivement disponible à La Réunion (974). Données hébergées dans l'Union européenne.
          </Texte>
        </View>
      </ScrollView>
    </Ecran>
  );
}
