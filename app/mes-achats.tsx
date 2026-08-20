import { ScrollView } from 'react-native';
import { router } from 'expo-router';

import { Ecran, EnTete, Vide } from '@/components';
import { CarteCommande } from '@/components/CarteCommande';
import { space } from '@/theme';
import { useLiked } from '@/store/liked';

export default function MesAchats() {
  const commandes = useLiked((e) => e.commandes.filter((c) => c.acheteurId === e.sessionId));

  return (
    <Ecran>
      <EnTete titre="Mes achats" sousTitre={`${commandes.length} commande(s)`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: space.xxxl }}>
        {commandes.length === 0 ? (
          <Vide icone="bag-handle-outline" titre="Aucun achat"
            corps="Tes commandes et leurs codes de remise s'afficheront ici."
            action="Explorer le catalogue" onAction={() => router.push('/(tabs)/recherche')} />
        ) : (
          commandes.map((c) => <CarteCommande key={c.id} commande={c} role="acheteur" />)
        )}
      </ScrollView>
    </Ecran>
  );
}
