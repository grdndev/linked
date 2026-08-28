import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar, Bouton, CoeurFavori, Ecran, EnTete, Etiquette, Etoiles, Feuille, Texte,
} from '@/components';
import { LIBELLES_ETAT, categorieParSlug } from '@/data/categories';
import { FORFAITS_PORT_CENTS, LIBELLES_GABARIT, euros, fraisProtectionCents } from '@/lib/argent';
import { depuis } from '@/lib/temps';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useShallow } from 'zustand/react/shallow';
import { useAnnonce, useMoi, useUtilisateur } from '@/store/selecteurs';
import { alerter, confirmer } from '@/lib/dialogues';

const LARGEUR = Dimensions.get('window').width;

const MOTIFS_SIGNALEMENT = [
  'Article contrefait',
  'Article interdit à la vente',
  'Photos ou description trompeuses',
  'Prix ou vente hors plateforme',
  'Contenu inapproprié',
];

export default function DetailAnnonce() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const annonce = useAnnonce(id);
  const vendeur = useUtilisateur(annonce?.vendeurId);
  const moi = useMoi();
  const { incrementerVue, ouvrirConversation, signaler, supprimerAnnonce } = useLiked();
  const evaluations = useLiked(useShallow((e) => e.evaluations.filter((v) => v.cibleId === annonce?.vendeurId).slice(0, 2)));
  const insets = useSafeAreaInsets();

  const [photoActive, setPhotoActive] = useState(0);
  const [feuilleSignalement, setFeuilleSignalement] = useState(false);
  const vueComptee = useRef(false);

  // Dépendre de l'identifiant et non de l'objet : incrementerVue remplace
  // l'annonce dans le store, ce qui relancerait l'effet en boucle.
  useEffect(() => {
    if (id && !vueComptee.current) {
      vueComptee.current = true;
      incrementerVue(id);
    }
  }, [id, incrementerVue]);

  if (!annonce || !vendeur) {
    return (
      <Ecran>
        <EnTete titre="Article introuvable" />
        <View style={{ padding: space.lg }}>
          <Texte variante="corpsDoux">Cette annonce n'existe plus ou a été retirée.</Texte>
        </View>
      </Ecran>
    );
  }

  const estMonAnnonce = moi?.id === annonce.vendeurId;
  const indisponible = annonce.statut !== 'en_ligne';
  const cat = categorieParSlug(annonce.categorie);
  const protection = fraisProtectionCents(annonce.prixCents);

  const contacter = () => {
    if (!moi) return router.push('/bienvenue');
    const conversationId = ouvrirConversation(annonce.id);
    router.push(`/discussion/${conversationId}`);
  };

  return (
    <Ecran bords={[]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Galerie */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPhotoActive(Math.round(e.nativeEvent.contentOffset.x / LARGEUR))}
          >
            {annonce.photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: LARGEUR, height: LARGEUR * 1.15 }} contentFit="cover" transition={200} />
            ))}
          </ScrollView>
          <View style={[styles.barreHaute, { paddingTop: insets.top + space.sm }]}>
            <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.rond} accessibilityLabel="Retour">
              <Ionicons name="chevron-back" size={22} color={colors.encre} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <CoeurFavori annonceId={annonce.id} />
              <Pressable onPress={() => setFeuilleSignalement(true)} style={styles.rond} accessibilityLabel="Signaler">
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.encre} />
              </Pressable>
            </View>
          </View>
          {annonce.photos.length > 1 ? (
            <View style={styles.points}>
              {annonce.photos.map((_, i) => (
                <View key={i} style={[styles.point, i === photoActive ? { backgroundColor: colors.blanc, width: 18 } : null]} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ padding: space.lg, gap: space.lg }}>
          {indisponible ? (
            <Etiquette libelle={annonce.statut === 'vendue' ? 'Article vendu' : 'Article réservé'} ton="alerte" />
          ) : null}

          <View style={{ gap: space.xs }}>
            <Texte variante="titre">{euros(annonce.prixCents)}</Texte>
            <Texte variante="petit">
              {euros(annonce.prixCents + protection)} protection acheteur incluse
            </Texte>
          </View>

          <Texte variante="soustitre">{annonce.titre}</Texte>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            <Etiquette libelle={LIBELLES_ETAT[annonce.etat].nom} ton="succes" />
            <Etiquette libelle={`Taille ${annonce.taille}`} />
            <Etiquette libelle={annonce.marque} />
            <Etiquette libelle={annonce.couleur} />
          </View>

          {annonce.description ? <Texte variante="corps">{annonce.description}</Texte> : null}

          <View style={styles.bloc}>
            <Detail libelle="Catégorie" valeur={cat ? `${cat.univers.nom} · ${cat.categorie.nom}` : annonce.categorie} />
            <Detail libelle="État" valeur={LIBELLES_ETAT[annonce.etat].nom} />
            <Detail libelle="Publié" valeur={depuis(annonce.publieeLe)} />
            <Detail libelle="Vues" valeur={`${annonce.vues} · ${annonce.favoris} favori(s)`} />
          </View>

          {/* Modes de remise */}
          <View style={{ gap: space.sm }}>
            <Texte variante="micro">REMISE</Texte>
            {annonce.accepteMainPropre ? (
              <ModeLigne
                icone="hand-left-outline"
                titre={`Main propre à ${annonce.communeRemise}`}
                detail="Gratuit · code de confirmation à 4 chiffres"
              />
            ) : null}
            {annonce.accepteEnvoi ? (
              <ModeLigne
                icone="cube-outline"
                titre={`Colissimo — ${euros(FORFAITS_PORT_CENTS[annonce.gabarit])}`}
                detail={`Gabarit ${LIBELLES_GABARIT[annonce.gabarit].nom.toLowerCase()} · étiquette prépayée`}
              />
            ) : null}
          </View>

          {/* Protection acheteur */}
          <View style={styles.protection}>
            <Ionicons name="shield-checkmark" size={20} color={colors.corail} />
            <View style={{ flex: 1, gap: 2 }}>
              <Texte variante="section">Protection acheteur — {euros(protection)}</Texte>
              <Texte variante="petit">
                Ton argent est bloqué et n'est versé au vendeur qu'après ta confirmation
                de la remise ou 48 h après la livraison.
              </Texte>
            </View>
          </View>

          {/* Vendeur */}
          <Pressable onPress={() => router.push(`/profil/${vendeur.id}`)} style={styles.vendeur}>
            <Avatar uri={vendeur.photoUrl} pseudo={vendeur.pseudo} taille={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <Texte variante="section">{vendeur.pseudo}</Texte>
              <Texte variante="petit">{vendeur.commune} · {vendeur.nombreVentes} vente(s)</Texte>
              <Etoiles note={vendeur.noteMoyenne} nombre={vendeur.nombreEvaluations} />
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.encre40} />
          </Pressable>

          {evaluations.map((e) => (
            <View key={e.id} style={styles.avis}>
              <Etoiles note={e.note} afficherNombre={false} taille={12} />
              <Texte variante="petit">{e.commentaire}</Texte>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Barre d'action */}
      <View style={[styles.barreAction, { paddingBottom: insets.bottom + space.md }]}>
        {estMonAnnonce ? (
          <>
            <Bouton
              titre="Modifier" ton="contour" style={{ flex: 1 }}
              onPress={() => router.push(`/vendre/modifier?id=${annonce.id}`)}
            />
            <Bouton
              titre="Supprimer" ton="danger" style={{ flex: 1 }}
              onPress={async () => {
                const ok = await confirmer(
                  'Supprimer',
                  'Retirer définitivement cette annonce ?',
                  'Supprimer',
                  true,
                );
                if (ok) { supprimerAnnonce(annonce.id); router.back(); }
              }}
            />
          </>
        ) : (
          <>
            <Bouton titre="Discuter" ton="contour" icone="chatbubble-outline" style={{ flex: 1 }} onPress={contacter} />
            <Bouton
              titre={indisponible ? 'Indisponible' : 'Acheter'}
              style={{ flex: 1.3 }}
              desactive={indisponible}
              onPress={() => (moi ? router.push(`/paiement/${annonce.id}`) : router.push('/bienvenue'))}
            />
          </>
        )}
      </View>

      <Feuille visible={feuilleSignalement} onFermer={() => setFeuilleSignalement(false)} titre="Signaler cette annonce" hauteur={0.55}>
        {MOTIFS_SIGNALEMENT.map((motif) => (
          <Pressable
            key={motif}
            onPress={() => {
              signaler('annonce', annonce.id, motif);
              setFeuilleSignalement(false);
              alerter('Merci', "Le signalement a été transmis à l'équipe Liked.");
            }}
            style={styles.motif}
          >
            <Texte variante="corps" style={{ flex: 1 }}>{motif}</Texte>
            <Ionicons name="chevron-forward" size={18} color={colors.encre40} />
          </Pressable>
        ))}
      </Feuille>
    </Ecran>
  );
}

function Detail({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
      <Texte variante="petit">{libelle}</Texte>
      <Texte variante="petit" couleur={colors.encre}>{valeur}</Texte>
    </View>
  );
}

function ModeLigne({ icone, titre, detail }: { icone: 'hand-left-outline' | 'cube-outline'; titre: string; detail: string }) {
  return (
    <View style={styles.mode}>
      <Ionicons name={icone} size={18} color={colors.encre80} />
      <View style={{ flex: 1 }}>
        <Texte variante="corps">{titre}</Texte>
        <Texte variante="petit">{detail}</Texte>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barreHaute: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: space.lg,
  },
  rond: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blanc,
    alignItems: 'center', justifyContent: 'center',
  },
  points: { position: 'absolute', bottom: space.md, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  point: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  bloc: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  mode: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg,
  },
  protection: {
    flexDirection: 'row', gap: space.md, alignItems: 'flex-start',
    backgroundColor: colors.corailDoux, borderRadius: radius.lg, padding: space.lg,
  },
  vendeur: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg,
  },
  avis: { backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg, gap: 4 },
  barreAction: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: space.md,
    paddingHorizontal: space.lg, paddingTop: space.md,
    backgroundColor: colors.blanc, borderTopWidth: 1, borderTopColor: colors.encre15,
  },
  motif: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg,
  },
});
