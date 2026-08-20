import { useMemo } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Avatar, CarteAnnonce, Ecran, Logotype, Puce, Texte, Vide } from '@/components';
import { UNIVERS } from '@/data/categories';
import { microRegion } from '@/data/communes';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useMoi, useNotificationsNonLues } from '@/store/selecteurs';
import type { Annonce } from '@/types';

const LARGEUR = Dimensions.get('window').width;
const COLONNE = (LARGEUR - space.lg * 2 - space.md) / 2;

export default function Accueil() {
  const annonces = useLiked((e) => e.annonces);
  const favoris = useLiked((e) => (e.sessionId ? e.favoris[e.sessionId] ?? [] : []));
  const moi = useMoi();
  const nonLues = useNotificationsNonLues();

  const enLigne = useMemo(
    () => annonces.filter((a) => a.statut === 'en_ligne'),
    [annonces],
  );

  /** Fil d'accueil personnalisé (§4.3) : priorité à la micro-région du membre,
   *  puis aux marques déjà mises en favori, puis à la récence. */
  const fil = useMemo(() => {
    const region = moi ? microRegion(moi.commune) : null;
    const marquesAimees = new Set(
      favoris.map((id) => annonces.find((a) => a.id === id)?.marque).filter(Boolean) as string[],
    );
    return [...enLigne].sort((a, b) => score(b) - score(a));

    function score(a: Annonce) {
      let s = 0;
      if (moi && a.vendeurId === moi.id) s -= 100;
      if (region && a.communeRemise && microRegion(a.communeRemise) === region) s += 30;
      if (moi && a.communeRemise === moi.commune) s += 20;
      if (marquesAimees.has(a.marque)) s += 15;
      s += Math.max(0, 10 - (Date.now() - +new Date(a.publieeLe)) / 86400000);
      return s;
    }
  }, [enLigne, favoris, annonces, moi]);

  const pres = useMemo(() => {
    if (!moi) return [];
    return enLigne.filter((a) => a.communeRemise && microRegion(a.communeRemise) === microRegion(moi.commune)).slice(0, 6);
  }, [enLigne, moi]);

  return (
    <Ecran>
      <View style={styles.entete}>
        <Logotype hauteur={26} />
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <Pressable onPress={() => router.push('/favoris')} style={styles.rond} accessibilityLabel="Favoris">
            <Ionicons name="heart-outline" size={20} color={colors.encre} />
          </Pressable>
          <Pressable onPress={() => router.push('/notifications')} style={styles.rond} accessibilityLabel="Notifications">
            <Ionicons name="notifications-outline" size={20} color={colors.encre} />
            {nonLues > 0 ? <View style={styles.pastille} /> : null}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.push('/(tabs)/recherche')} style={styles.barreRecherche}>
          <Ionicons name="search" size={18} color={colors.encre60} />
          <Texte variante="corpsDoux">Robe, sneakers, Zara…</Texte>
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangeeUnivers}
        >
          {UNIVERS.map((u) => (
            <Pressable
              key={u.cle}
              onPress={() => router.push({ pathname: '/(tabs)/recherche', params: { universe: u.cle } })}
              style={styles.carteUnivers}
            >
              <Texte style={{ fontSize: 26 }}>{u.emoji}</Texte>
              <Texte variante="section">{u.nom}</Texte>
            </Pressable>
          ))}
        </ScrollView>

        {moi && pres.length > 0 ? (
          <View style={{ gap: space.md }}>
            <View style={styles.titreSection}>
              <Texte variante="soustitre">Près de chez toi</Texte>
              <Texte variante="petit">{microRegion(moi.commune)}</Texte>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}>
              {pres.map((a) => (
                <CarteAnnonce key={a.id} annonce={a} largeur={COLONNE * 0.86} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={[styles.titreSection, { marginTop: space.xl }]}>
          <Texte variante="soustitre">Pour toi</Texte>
          <Pressable onPress={() => router.push('/(tabs)/recherche')}>
            <Texte variante="petit" couleur={colors.corail}>Tout voir</Texte>
          </Pressable>
        </View>

        {fil.length === 0 ? (
          <Vide
            titre="Le fil est encore vide"
            corps="Sois la première personne à déposer une annonce sur l'île."
            action="Vendre un article"
            onAction={() => router.push('/(tabs)/vendre')}
          />
        ) : (
          <View style={styles.grille}>
            {fil.map((a) => (
              <CarteAnnonce key={a.id} annonce={a} largeur={COLONNE} />
            ))}
          </View>
        )}
      </ScrollView>

      {moi ? null : (
        <Pressable onPress={() => router.push('/bienvenue')} style={styles.bandeau}>
          <Avatar pseudo="?" taille={28} />
          <Texte variante="petit" couleur={colors.blanc} style={{ flex: 1 }}>
            Crée ton compte pour acheter, vendre et discuter.
          </Texte>
          <Ionicons name="chevron-forward" size={18} color={colors.blanc} />
        </Pressable>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  entete: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.lg, paddingBottom: space.md,
  },
  rond: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.blanc,
    alignItems: 'center', justifyContent: 'center',
  },
  pastille: {
    position: 'absolute', top: 9, right: 10, width: 8, height: 8,
    borderRadius: 4, backgroundColor: colors.corail,
  },
  barreRecherche: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    marginHorizontal: space.lg, marginBottom: space.lg,
    backgroundColor: colors.blanc, borderRadius: radius.pill,
    paddingHorizontal: space.lg, height: 46,
  },
  rangeeUnivers: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.lg },
  carteUnivers: {
    backgroundColor: colors.blanc, borderRadius: radius.lg,
    paddingHorizontal: space.xl, paddingVertical: space.lg,
    alignItems: 'center', gap: 4, minWidth: 104,
  },
  titreSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.lg, marginBottom: space.sm,
  },
  grille: {
    flexDirection: 'row', flexWrap: 'wrap', gap: space.md,
    paddingHorizontal: space.lg,
  },
  bandeau: {
    position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg,
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.encre, borderRadius: radius.pill,
    paddingHorizontal: space.lg, paddingVertical: space.md,
  },
});
