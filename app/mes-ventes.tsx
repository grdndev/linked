import { ScrollView } from 'react-native';

import { Ecran, EnTete, Vide } from '@/components';
import { CarteCommande } from '@/components/CarteCommande';
import { space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useShallow } from 'zustand/react/shallow';

export default function MesVentes() {
  const commandes = useLiked(useShallow((e) => e.commandes.filter((c) => c.vendeurId === e.sessionId)));

  return (
    <Ecran>
      <EnTete titre="Mes ventes" sousTitre={`${commandes.length} vente(s)`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.sm, paddingBottom: space.xxxl }}>
        {commandes.length === 0 ? (
          <Vide icone="cube-outline" titre="Aucune vente"
            corps="Dès qu'un article part, tu retrouveras ici l'étiquette ou le code de remise." />
        ) : (
          commandes.map((c) => <CarteCommande key={c.id} commande={c} role="vendeur" />)
        )}
      </ScrollView>
    </Ecran>
  );
}
