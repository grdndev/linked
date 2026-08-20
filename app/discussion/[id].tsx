import { useMemo, useRef, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Bouton, Champ, Ecran, EnTete, Etiquette, Feuille, Texte } from '@/components';
import { euros, parseEuros } from '@/lib/argent';
import { heureCourte } from '@/lib/temps';
import { colors, font, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useAnnonce, useConversation, useMoi, useUtilisateur } from '@/store/selecteurs';

export default function Discussion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversation = useConversation(id);
  const annonce = useAnnonce(conversation?.annonceId);
  const moi = useMoi();
  const autre = useUtilisateur(
    conversation ? (conversation.acheteurId === moi?.id ? conversation.vendeurId : conversation.acheteurId) : undefined,
  );
  const messages = useLiked((e) => e.messages.filter((m) => m.conversationId === id));
  const { envoyerMessage, faireOffre, repondreOffre, marquerLu, signaler } = useLiked();
  const insets = useSafeAreaInsets();

  const [saisie, setSaisie] = useState('');
  const [feuilleOffre, setFeuilleOffre] = useState(false);
  const [montantOffre, setMontantOffre] = useState('');
  const [contreOffre, setContreOffre] = useState<{ messageId: string } | null>(null);
  const defilement = useRef<ScrollView>(null);

  const jeSuisVendeur = conversation?.vendeurId === moi?.id;

  useMemo(() => {
    if (conversation && moi && !conversation.luPar.includes(moi.id)) marquerLu(conversation.id);
  }, [conversation, moi, marquerLu]);

  /** Dernière offre acceptée : permet d'acheter au prix négocié (§4.4). */
  const offreAcceptee = useMemo(
    () => [...messages].reverse().find((m) => m.offre?.statut === 'acceptee'),
    [messages],
  );

  if (!conversation || !annonce || !moi || !autre) {
    return (
      <Ecran>
        <EnTete titre="Discussion" />
        <View style={{ padding: space.lg }}><Texte variante="corpsDoux">Conversation introuvable.</Texte></View>
      </Ecran>
    );
  }

  const envoyer = () => {
    if (!saisie.trim()) return;
    envoyerMessage(conversation.id, saisie.trim());
    setSaisie('');
    setTimeout(() => defilement.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <Ecran bords={['top']}>
      <EnTete
        titre={autre.pseudo}
        sousTitre={`${autre.commune} · ${autre.nombreVentes} vente(s)`}
        action={
          <Pressable
            hitSlop={10}
            accessibilityLabel="Signaler"
            onPress={() =>
              Alert.alert('Signaler', `Signaler ${autre.pseudo} à l'équipe Liked ?`, [
                { text: 'Annuler', style: 'cancel' },
                {
                  text: 'Signaler',
                  style: 'destructive',
                  onPress: () => { signaler('utilisateur', autre.id, 'Comportement suspect'); },
                },
              ])
            }
          >
            <Ionicons name="flag-outline" size={20} color={colors.encre60} />
          </Pressable>
        }
      />

      <Pressable onPress={() => router.push(`/annonce/${annonce.id}`)} style={styles.bandeauArticle}>
        <Image source={{ uri: annonce.photos[0] }} style={styles.vignette} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Texte variante="corps" numberOfLines={1}>{annonce.titre}</Texte>
          <Texte variante="petit">{euros(annonce.prixCents)}</Texte>
        </View>
        {!jeSuisVendeur && annonce.statut === 'en_ligne' ? (
          <Bouton
            titre={offreAcceptee ? `Payer ${euros(offreAcceptee.offre!.montantCents)}` : 'Acheter'}
            taille="sm"
            onPress={() =>
              router.push(
                offreAcceptee
                  ? `/paiement/${annonce.id}?prix=${offreAcceptee.offre!.montantCents}`
                  : `/paiement/${annonce.id}`,
              )
            }
          />
        ) : null}
      </Pressable>

      {!conversation.filtrageLeve ? (
        <View style={styles.avertissement}>
          <Ionicons name="shield-outline" size={14} color={colors.alerte} />
          <Texte variante="micro" style={{ flex: 1 }}>
            Les coordonnées sont masquées tant que l'achat n'est pas payé.
          </Texte>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={defilement}
          contentContainerStyle={{ padding: space.lg, gap: space.md }}
          onContentSizeChange={() => defilement.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((m) => {
            if (m.systeme) {
              return (
                <View key={m.id} style={styles.systeme}>
                  <Texte variante="micro" centre>{m.texte}</Texte>
                </View>
              );
            }
            const aMoi = m.auteurId === moi.id;
            if (m.offre) {
              const enAttente = m.offre.statut === 'en_attente';
              return (
                <View key={m.id} style={[styles.offre, aMoi ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                  <Texte variante="micro">{aMoi ? 'TON OFFRE' : 'OFFRE REÇUE'}</Texte>
                  <Texte variante="titre">{euros(m.offre.montantCents)}</Texte>
                  {m.offre.statut !== 'en_attente' ? (
                    <Etiquette
                      libelle={
                        m.offre.statut === 'acceptee' ? 'Acceptée'
                          : m.offre.statut === 'refusee' ? 'Refusée'
                          : m.offre.statut === 'contre_proposee' ? 'Contre-proposée' : 'Expirée'
                      }
                      ton={m.offre.statut === 'acceptee' ? 'succes' : 'neutre'}
                    />
                  ) : null}
                  {enAttente && !aMoi ? (
                    <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
                      <Bouton titre="Accepter" taille="sm" onPress={() => repondreOffre(m.id, 'acceptee')} />
                      <Bouton titre="Refuser" taille="sm" ton="contour" onPress={() => repondreOffre(m.id, 'refusee')} />
                      <Bouton titre="Contre" taille="sm" ton="discret" onPress={() => { setContreOffre({ messageId: m.id }); setFeuilleOffre(true); }} />
                    </View>
                  ) : null}
                  <Texte variante="micro">{heureCourte(m.envoyeLe)}</Texte>
                </View>
              );
            }
            return (
              <View key={m.id} style={[styles.bulle, aMoi ? styles.bulleMoi : styles.bulleAutre]}>
                <Texte variante="corps" couleur={aMoi ? colors.blanc : colors.encre}>{m.texte}</Texte>
                <Texte
                  style={{
                    fontFamily: font.regular, fontSize: 10,
                    color: aMoi ? 'rgba(255,255,255,0.7)' : colors.encre60,
                    alignSelf: 'flex-end', marginTop: 2,
                  }}
                >
                  {heureCourte(m.envoyeLe)}
                </Texte>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.barreSaisie, { paddingBottom: insets.bottom + space.sm }]}>
          {!jeSuisVendeur && annonce.statut === 'en_ligne' ? (
            <Pressable onPress={() => { setContreOffre(null); setFeuilleOffre(true); }} style={styles.rondAction} accessibilityLabel="Proposer un prix">
              <Ionicons name="pricetag-outline" size={20} color={colors.corail} />
            </Pressable>
          ) : null}
          <TextInput
            value={saisie}
            onChangeText={setSaisie}
            placeholder="Écris ton message…"
            placeholderTextColor={colors.encre40}
            multiline
            style={styles.saisie}
          />
          <Pressable onPress={envoyer} style={[styles.rondAction, { backgroundColor: colors.corail }]} accessibilityLabel="Envoyer">
            <Ionicons name="arrow-up" size={20} color={colors.blanc} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Feuille
        visible={feuilleOffre}
        onFermer={() => setFeuilleOffre(false)}
        titre={contreOffre ? 'Contre-proposer' : 'Proposer un prix'}
        hauteur={0.5}
      >
        <Texte variante="corpsDoux">
          Prix affiché : {euros(annonce.prixCents)}. Une offre acceptée permet de payer directement au prix convenu.
        </Texte>
        <Champ
          label="Ton prix" value={montantOffre} onChangeText={setMontantOffre}
          keyboardType="decimal-pad" placeholder="0,00" suffixe="€"
        />
        <Bouton
          titre={contreOffre ? 'Envoyer ma contre-proposition' : 'Envoyer mon offre'}
          pleineLargeur
          onPress={() => {
            const cents = parseEuros(montantOffre);
            if (!cents || cents < 100) return;
            if (contreOffre) repondreOffre(contreOffre.messageId, 'refusee', cents);
            else faireOffre(conversation.id, cents);
            setMontantOffre('');
            setContreOffre(null);
            setFeuilleOffre(false);
          }}
        />
      </Feuille>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  bandeauArticle: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    marginHorizontal: space.lg, padding: space.sm,
    backgroundColor: colors.blanc, borderRadius: radius.md,
  },
  vignette: { width: 40, height: 50, borderRadius: radius.sm, backgroundColor: colors.sableFonce },
  avertissement: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    marginHorizontal: space.lg, marginTop: space.sm,
    backgroundColor: colors.alerteDoux, borderRadius: radius.sm, padding: space.sm,
  },
  bulle: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.md },
  bulleMoi: { alignSelf: 'flex-end', backgroundColor: colors.encre, borderBottomRightRadius: 4 },
  bulleAutre: { alignSelf: 'flex-start', backgroundColor: colors.blanc, borderBottomLeftRadius: 4 },
  systeme: {
    alignSelf: 'center', maxWidth: '90%', backgroundColor: colors.sableFonce,
    borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.sm,
  },
  offre: {
    maxWidth: '85%', backgroundColor: colors.blanc, borderRadius: radius.lg,
    padding: space.lg, gap: 4, borderWidth: 1.5, borderColor: colors.corailDoux,
  },
  barreSaisie: {
    flexDirection: 'row', alignItems: 'flex-end', gap: space.sm,
    paddingHorizontal: space.lg, paddingTop: space.sm,
    backgroundColor: colors.blanc, borderTopWidth: 1, borderTopColor: colors.encre15,
  },
  saisie: {
    flex: 1, maxHeight: 110, minHeight: 42,
    backgroundColor: colors.sable, borderRadius: radius.lg,
    paddingHorizontal: space.lg, paddingTop: 11, paddingBottom: 11,
    fontFamily: font.regular, fontSize: 15, color: colors.encre,
  },
  rondAction: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.sable,
    alignItems: 'center', justifyContent: 'center',
  },
});
