import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';

import { Bouton, Champ, Ecran, EnTete, Etiquette, Texte } from '@/components';
import { euros } from '@/lib/argent';
import { compteARebours, dateCourte, heureCourte } from '@/lib/temps';
import { colors, font, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useAnnonce, useCommande, useMoi, useUtilisateur } from '@/store/selecteurs';
import type { StatutCommande } from '@/types';
import { alerter, confirmer } from '@/lib/dialogues';

const ETIQUETTES: Record<StatutCommande, { libelle: string; ton: 'neutre' | 'succes' | 'alerte' | 'danger' | 'action' }> = {
  paiement_en_attente: { libelle: 'Paiement en attente', ton: 'alerte' },
  sequestre: { libelle: 'Payé — fonds bloqués', ton: 'action' },
  etiquette_emise: { libelle: 'Étiquette prête', ton: 'action' },
  expedie: { libelle: 'Colis en route', ton: 'action' },
  livre: { libelle: 'Livré', ton: 'succes' },
  litige: { libelle: 'Litige en cours', ton: 'danger' },
  finalisee: { libelle: 'Terminée', ton: 'succes' },
  remboursee: { libelle: 'Remboursée', ton: 'neutre' },
  annulee: { libelle: 'Annulée', ton: 'neutre' },
};

export default function DetailCommande() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const commande = useCommande(id);
  const annonce = useAnnonce(commande?.annonceId);
  const moi = useMoi();
  const acheteur = useUtilisateur(commande?.acheteurId);
  const vendeur = useUtilisateur(commande?.vendeurId);
  const { genererEtiquette, marquerExpedie, simulerLivraison, validerCodeRemise, confirmerReception, annulerCommande } = useLiked();

  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string>();
  const [enCours, setEnCours] = useState(false);

  if (!commande || !annonce || !moi) {
    return (
      <Ecran>
        <EnTete titre="Commande" />
        <View style={{ padding: space.lg }}><Texte variante="corpsDoux">Commande introuvable.</Texte></View>
      </Ecran>
    );
  }

  const jeSuisAcheteur = commande.acheteurId === moi.id;
  const etiquette = ETIQUETTES[commande.statut];
  const suivi = commande.suivi ?? [];
  const dejaEvalue = jeSuisAcheteur ? commande.evaluationAcheteurFaite : commande.evaluationVendeurFaite;

  const valider = async () => {
    setEnCours(true);
    const resultat = await validerCodeRemise(commande.id, code);
    setEnCours(false);
    if (!resultat.ok) return setErreur(resultat.erreur);
    setErreur(undefined);
    alerter('Remise confirmée 🎉', 'Les fonds viennent d\'être versés sur ton portefeuille.');
  };

  return (
    <Ecran>
      <EnTete titre={`Commande ${commande.reference}`} sousTitre={dateCourte(commande.creeeLe)} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl }}>
        <View style={styles.article}>
          <Image source={{ uri: annonce.photos[0] }} style={styles.vignette} contentFit="cover" />
          <View style={{ flex: 1, gap: 4 }}>
            <Texte variante="corps" numberOfLines={2}>{annonce.titre}</Texte>
            <Texte variante="petit">
              {jeSuisAcheteur ? `Vendu par ${vendeur?.pseudo}` : `Acheté par ${acheteur?.pseudo}`}
            </Texte>
            <Etiquette libelle={etiquette.libelle} ton={etiquette.ton} />
          </View>
        </View>

        {/* — Main propre : côté acheteur, le code — */}
        {commande.mode === 'main_propre' && commande.statut === 'sequestre' && jeSuisAcheteur ? (
          <View style={styles.blocCode}>
            <Texte variante="micro" couleur="rgba(255,255,255,0.7)">TON CODE DE REMISE</Texte>
            <Pressable
              onPress={() => { Clipboard.setStringAsync(commande.codeRemise ?? ''); }}
              style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}
            >
              {(commande.codeRemise ?? '····').split('').map((chiffre, i) => (
                <View key={i} style={styles.caseChiffre}>
                  <Texte style={{ fontFamily: font.semibold, fontSize: 28, color: colors.encre }}>{chiffre}</Texte>
                </View>
              ))}
            </Pressable>
            <Texte variante="petit" couleur="rgba(255,255,255,0.8)" centre>
              Donne ce code au vendeur seulement après avoir vérifié l'article.
              C'est lui qui débloque le paiement.
            </Texte>
          </View>
        ) : null}

        {/* — Main propre : côté vendeur, la saisie — */}
        {commande.mode === 'main_propre' && commande.statut === 'sequestre' && !jeSuisAcheteur ? (
          <View style={styles.bloc}>
            <Texte variante="section">Confirmer la remise</Texte>
            <Texte variante="petit">
              L'acheteur a payé, l'argent est bloqué chez notre prestataire.
              Saisis son code à 4 chiffres lors de la rencontre pour recevoir {euros(commande.prixArticleCents)}.
            </Texte>
            <Champ
              value={code} onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 4)); setErreur(undefined); }}
              keyboardType="number-pad" maxLength={4} placeholder="0000" erreur={erreur}
              style={{ marginTop: space.sm }}
            />
            <Bouton titre="Confirmer la remise" pleineLargeur chargement={enCours} desactive={code.length !== 4} onPress={valider} />
          </View>
        ) : null}

        {/* — Colissimo : côté vendeur — */}
        {commande.mode === 'colissimo' && !jeSuisAcheteur ? (
          <View style={styles.bloc}>
            <Texte variante="section">Expédition</Texte>
            {commande.statut === 'sequestre' ? (
              <>
                <Texte variante="petit">
                  Génère ton étiquette prépayée, imprime-la, colle-la sur le colis et dépose-le
                  dans n'importe quel bureau de poste de l'île.
                </Texte>
                <Bouton titre="Générer mon étiquette Colissimo" pleineLargeur icone="download-outline"
                  onPress={() => genererEtiquette(commande.id)} />
              </>
            ) : null}
            {commande.numeroSuivi ? (
              <>
                <View style={styles.suiviLigne}>
                  <Texte variante="petit">Numéro de suivi</Texte>
                  <Pressable onPress={() => Clipboard.setStringAsync(commande.numeroSuivi!)}>
                    <Texte variante="corps">{commande.numeroSuivi}</Texte>
                  </Pressable>
                </View>
                <Texte variante="micro">Étiquette PDF : {commande.etiquetteUrl}</Texte>
              </>
            ) : null}
            {commande.statut === 'etiquette_emise' ? (
              <Bouton titre="J'ai déposé le colis" ton="encre" pleineLargeur onPress={() => marquerExpedie(commande.id)} />
            ) : null}
            {commande.statut === 'expedie' ? (
              <Bouton titre="Simuler la livraison (recette)" ton="contour" pleineLargeur onPress={() => simulerLivraison(commande.id)} />
            ) : null}
          </View>
        ) : null}

        {/* — Colissimo : côté acheteur — */}
        {commande.mode === 'colissimo' && suivi.length > 0 ? (
          <View style={styles.bloc}>
            <Texte variante="section">Suivi du colis</Texte>
            {suivi.map((etape, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
                <Ionicons
                  name={etape.livre ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={etape.livre ? colors.succes : colors.encre40}
                />
                <View style={{ flex: 1 }}>
                  <Texte variante="corps">{etape.libelle}</Texte>
                  <Texte variante="micro">
                    {dateCourte(etape.le)} · {heureCourte(etape.le)}{etape.lieu ? ` · ${etape.lieu}` : ''}
                  </Texte>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* — Délai de libération — */}
        {commande.statut === 'livre' && commande.liberableLe ? (
          <View style={styles.blocLiberation}>
            <View style={styles.ligneAlerte}>
              <Ionicons name="time-outline" size={20} color={colors.alerte} />
              <View style={{ flex: 1 }}>
                <Texte variante="corps">Versement dans {compteARebours(commande.liberableLe)}</Texte>
                <Texte variante="petit">
                  Les fonds sont versés au vendeur 48 h après la livraison, sauf litige ouvert d'ici là.
                </Texte>
              </View>
            </View>
            {jeSuisAcheteur ? (
              <Bouton
                titre="Tout est conforme — verser au vendeur"
                pleineLargeur
                icone="checkmark-circle-outline"
                chargement={enCours}
                onPress={async () => {
                  setEnCours(true);
                  const resultat = await confirmerReception(commande.id);
                  setEnCours(false);
                  if (resultat.ok) {
                    alerter('Merci 🎉', 'Le vendeur vient d’être payé. Pense à laisser une évaluation.');
                  } else {
                    alerter('Impossible', resultat.erreur ?? '');
                  }
                }}
              />
            ) : null}
          </View>
        ) : null}

        {/* — Récapitulatif — */}
        <View style={styles.bloc}>
          <Texte variante="section">Détail du paiement</Texte>
          <Ligne libelle="Article" valeur={euros(commande.prixArticleCents)} />
          <Ligne libelle="Protection acheteur" valeur={euros(commande.fraisProtectionCents)} />
          <Ligne libelle="Frais de port" valeur={commande.fraisPortCents ? euros(commande.fraisPortCents) : 'Gratuit'} />
          <View style={styles.separateur} />
          <Ligne libelle={jeSuisAcheteur ? 'Total payé' : 'Tu reçois'} fort
            valeur={euros(jeSuisAcheteur ? commande.totalCents : commande.prixArticleCents)} />
        </View>

        {/* — Actions de fin de parcours — */}
        <View style={{ gap: space.md }}>
          {(commande.statut === 'finalisee' || commande.statut === 'livre') && !dejaEvalue ? (
            <Bouton titre="Évaluer" pleineLargeur icone="star-outline" onPress={() => router.push(`/evaluation/${commande.id}`)} />
          ) : null}

          {jeSuisAcheteur && ['livre', 'expedie', 'sequestre', 'etiquette_emise'].includes(commande.statut) ? (
            <Bouton titre="Un problème ? Ouvrir un litige" ton="contour" pleineLargeur
              onPress={() => router.push(`/litige/nouveau?commandeId=${commande.id}`)} />
          ) : null}

          {commande.litigeId ? (
            <Bouton titre="Voir le litige" ton="danger" pleineLargeur onPress={() => router.push(`/litige/${commande.litigeId}`)} />
          ) : null}

          <Bouton
            titre="Contacter l'autre partie" ton="discret" pleineLargeur icone="chatbubble-outline"
            onPress={() => {
              const conversationId = useLiked.getState().ouvrirConversation(commande.annonceId);
              router.push(`/discussion/${conversationId}`);
            }}
          />

          {/* Annulation possible tant que rien n'est parti : l'article n'a été ni
              remis en main propre, ni déposé chez le transporteur. */}
          {['sequestre', 'etiquette_emise'].includes(commande.statut) ? (
            <Bouton
              titre="Annuler et rembourser"
              ton="danger"
              pleineLargeur
              chargement={enCours}
              onPress={async () => {
                const ok = await confirmer(
                  'Annuler la commande',
                  jeSuisAcheteur
                    ? "L'acheteur sera intégralement remboursé et l'article remis en vente. Confirmer ?"
                    : "L'acheteur sera intégralement remboursé et ton article remis en vente. Confirmer ?",
                  'Annuler la commande',
                  true,
                );
                if (!ok) return;
                setEnCours(true);
                await annulerCommande(
                  commande.id,
                  jeSuisAcheteur ? "Annulation à la demande de l'acheteur" : 'Annulation à la demande du vendeur',
                );
                setEnCours(false);
                alerter('Commande annulée', 'Le remboursement a été demandé au prestataire de paiement.');
              }}
            />
          ) : null}
        </View>

        {/* — Journal — */}
        <View style={styles.bloc}>
          <Texte variante="section">Historique</Texte>
          {commande.journal.map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
              <Texte variante="micro" style={{ width: 96 }}>{dateCourte(e.le)} {heureCourte(e.le)}</Texte>
              <Texte variante="petit" style={{ flex: 1 }}>{e.libelle}{e.detail ? ` — ${e.detail}` : ''}</Texte>
            </View>
          ))}
        </View>
      </ScrollView>
    </Ecran>
  );
}

function Ligne({ libelle, valeur, fort }: { libelle: string; valeur: string; fort?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Texte variante={fort ? 'section' : 'corps'}>{libelle}</Texte>
      <Texte variante={fort ? 'prix' : 'corps'}>{valeur}</Texte>
    </View>
  );
}

const styles = StyleSheet.create({
  article: {
    flexDirection: 'row', gap: space.md, alignItems: 'center',
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.md,
  },
  vignette: { width: 60, height: 76, borderRadius: radius.sm, backgroundColor: colors.sableFonce },
  bloc: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  blocCode: {
    backgroundColor: colors.encre, borderRadius: radius.lg, padding: space.xl,
    gap: space.lg, alignItems: 'center',
  },
  caseChiffre: {
    width: 54, height: 66, borderRadius: radius.md, backgroundColor: colors.blanc,
    alignItems: 'center', justifyContent: 'center',
  },
  suiviLigne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  separateur: { height: 1, backgroundColor: colors.encre15 },
  blocLiberation: {
    backgroundColor: colors.alerteDoux, borderRadius: radius.lg,
    padding: space.lg, gap: space.md,
  },
  ligneAlerte: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
});
