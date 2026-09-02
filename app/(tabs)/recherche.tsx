import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Bouton, CarteAnnonce, Champ, Ecran, Feuille, Puce, Texte, Vide } from '@/components';
import { LIBELLES_ETAT, UNIVERS } from '@/data/categories';
import { COMMUNES } from '@/data/communes';
import { euros, parseEuros } from '@/lib/argent';
import { colors, font, radius, space } from '@/theme';
import { correspond, trier, useLiked } from '@/store/liked';
import type { EtatArticle, FiltresRecherche } from '@/types';
import { useGrille } from '@/lib/grille';

const TRIS: { cle: NonNullable<FiltresRecherche['tri']>; libelle: string }[] = [
  { cle: 'recent', libelle: 'Plus récent' },
  { cle: 'prix_croissant', libelle: 'Prix croissant' },
  { cle: 'prix_decroissant', libelle: 'Prix décroissant' },
  { cle: 'commune', libelle: 'Par commune' },
];

export default function Recherche() {
  const { largeurColonne } = useGrille();
  const params = useLocalSearchParams<{ universe?: string; texte?: string }>();
  const annonces = useLiked((e) => e.annonces);
  const sauvegarderRecherche = useLiked((e) => e.sauvegarderRecherche);
  const connecte = useLiked((e) => Boolean(e.sessionId));

  const [filtres, setFiltres] = useState<FiltresRecherche>({
    texte: params.texte ?? '',
    universe: (params.universe as FiltresRecherche['universe']) ?? undefined,
    tri: 'recent',
  });
  const [feuilleFiltres, setFeuilleFiltres] = useState(false);
  const [feuilleTri, setFeuilleTri] = useState(false);
  const [prixMin, setPrixMin] = useState('');
  const [prixMax, setPrixMax] = useState('');
  const [nomRecherche, setNomRecherche] = useState('');
  const [feuilleSauvegarde, setFeuilleSauvegarde] = useState(false);

  const resultats = useMemo(
    () => trier(annonces.filter((a) => correspond(a, filtres)), filtres.tri),
    [annonces, filtres],
  );

  const categories = filtres.universe
    ? UNIVERS.find((u) => u.cle === filtres.universe)?.categories ?? []
    : [];
  const tailles = filtres.categorie
    ? categories.find((c) => c.slug === filtres.categorie)?.tailles ?? []
    : [];

  const nbFiltresActifs =
    (filtres.universe ? 1 : 0) + (filtres.categorie ? 1 : 0) + (filtres.tailles?.length ?? 0) +
    (filtres.etats?.length ?? 0) + (filtres.communes?.length ?? 0) +
    (filtres.prixMinCents != null || filtres.prixMaxCents != null ? 1 : 0) + (filtres.mode ? 1 : 0);

  const basculer = <T,>(liste: T[] | undefined, valeur: T): T[] => {
    const actuelle = liste ?? [];
    return actuelle.includes(valeur) ? actuelle.filter((v) => v !== valeur) : [...actuelle, valeur];
  };

  return (
    <Ecran>
      <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
        <View style={styles.barre}>
          <Ionicons name="search" size={18} color={colors.encre60} />
          <TextInput
            value={filtres.texte}
            onChangeText={(texte) => setFiltres((f) => ({ ...f, texte }))}
            placeholder="Robe, sneakers, Zara…"
            placeholderTextColor={colors.encre40}
            returnKeyType="search"
            style={styles.saisie}
          />
          {filtres.texte ? (
            <Pressable onPress={() => setFiltres((f) => ({ ...f, texte: '' }))} hitSlop={8} accessibilityLabel="Effacer">
              <Ionicons name="close-circle" size={18} color={colors.encre40} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingBottom: space.sm }}>
          <Puce
            libelle={nbFiltresActifs > 0 ? `Filtres · ${nbFiltresActifs}` : 'Filtres'}
            icone="options-outline"
            active={nbFiltresActifs > 0}
            onPress={() => setFeuilleFiltres(true)}
          />
          <Puce
            libelle={TRIS.find((t) => t.cle === filtres.tri)?.libelle ?? 'Trier'}
            icone="swap-vertical-outline"
            onPress={() => setFeuilleTri(true)}
          />
          {UNIVERS.map((u) => (
            <Puce
              key={u.cle}
              libelle={u.nom}
              active={filtres.universe === u.cle}
              onPress={() =>
                setFiltres((f) => ({
                  ...f,
                  universe: f.universe === u.cle ? undefined : u.cle,
                  categorie: undefined,
                  tailles: undefined,
                }))
              }
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.ligneResultats}>
        <Texte variante="petit">
          {resultats.length} article{resultats.length > 1 ? 's' : ''}
        </Texte>
        {connecte ? (
          <Pressable onPress={() => setFeuilleSauvegarde(true)} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            <Ionicons name="notifications-outline" size={14} color={colors.corail} />
            <Texte variante="petit" couleur={colors.corail}>Enregistrer cette recherche</Texte>
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl }} showsVerticalScrollIndicator={false}>
        {resultats.length === 0 ? (
          <Vide
            icone="search-outline"
            titre="Aucun article ne correspond"
            corps="Essaie d'élargir tes filtres ou enregistre la recherche pour être alerté des nouveautés."
          />
        ) : (
          <View style={styles.grille}>
            {resultats.map((a) => (
              <CarteAnnonce key={a.id} annonce={a} largeur={largeurColonne} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* — Feuille filtres — */}
      <Feuille visible={feuilleFiltres} onFermer={() => setFeuilleFiltres(false)} titre="Filtrer" hauteur={0.88}>
        {filtres.universe ? (
          <Bloc titre="Catégorie">
            {categories.map((c) => (
              <Puce
                key={c.slug} libelle={c.nom} active={filtres.categorie === c.slug}
                onPress={() => setFiltres((f) => ({ ...f, categorie: f.categorie === c.slug ? undefined : c.slug, tailles: undefined }))}
              />
            ))}
          </Bloc>
        ) : (
          <Texte variante="petit">Choisis un univers pour affiner par catégorie.</Texte>
        )}

        {tailles.length > 0 ? (
          <Bloc titre="Taille">
            {tailles.map((t) => (
              <Puce
                key={t} libelle={t} active={filtres.tailles?.includes(t)}
                onPress={() => setFiltres((f) => ({ ...f, tailles: basculer(f.tailles, t) }))}
              />
            ))}
          </Bloc>
        ) : null}

        <Bloc titre="État">
          {(Object.keys(LIBELLES_ETAT) as EtatArticle[]).map((e) => (
            <Puce
              key={e} libelle={LIBELLES_ETAT[e].nom} active={filtres.etats?.includes(e)}
              onPress={() => setFiltres((f) => ({ ...f, etats: basculer(f.etats, e) }))}
            />
          ))}
        </Bloc>

        <Bloc titre="Mode de remise">
          <Puce libelle="Main propre" icone="hand-left-outline" active={filtres.mode === 'main_propre'}
            onPress={() => setFiltres((f) => ({ ...f, mode: f.mode === 'main_propre' ? undefined : 'main_propre' }))} />
          <Puce libelle="Colissimo" icone="cube-outline" active={filtres.mode === 'colissimo'}
            onPress={() => setFiltres((f) => ({ ...f, mode: f.mode === 'colissimo' ? undefined : 'colissimo' }))} />
        </Bloc>

        <View style={{ gap: space.sm }}>
          <Texte variante="micro">PRIX</Texte>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Champ style={{ flex: 1 }} placeholder="Min" value={prixMin} onChangeText={setPrixMin} keyboardType="decimal-pad" suffixe="€" />
            <Champ style={{ flex: 1 }} placeholder="Max" value={prixMax} onChangeText={setPrixMax} keyboardType="decimal-pad" suffixe="€" />
          </View>
        </View>

        <Bloc titre="Commune">
          {COMMUNES.map((c) => (
            <Puce
              key={c} libelle={c} compact active={filtres.communes?.includes(c)}
              onPress={() => setFiltres((f) => ({ ...f, communes: basculer(f.communes, c) }))}
            />
          ))}
        </Bloc>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Bouton
            titre="Tout effacer" ton="contour" style={{ flex: 1 }}
            onPress={() => { setFiltres({ tri: filtres.tri, texte: filtres.texte }); setPrixMin(''); setPrixMax(''); }}
          />
          <Bouton
            titre="Voir les résultats" style={{ flex: 1.4 }}
            onPress={() => {
              setFiltres((f) => ({
                ...f,
                prixMinCents: parseEuros(prixMin) ?? undefined,
                prixMaxCents: parseEuros(prixMax) ?? undefined,
              }));
              setFeuilleFiltres(false);
            }}
          />
        </View>
      </Feuille>

      {/* — Feuille tri — */}
      <Feuille visible={feuilleTri} onFermer={() => setFeuilleTri(false)} titre="Trier par" hauteur={0.45}>
        {TRIS.map((t) => (
          <Pressable
            key={t.cle}
            onPress={() => { setFiltres((f) => ({ ...f, tri: t.cle })); setFeuilleTri(false); }}
            style={styles.ligneTri}
          >
            <Texte variante="corps">{t.libelle}</Texte>
            {filtres.tri === t.cle ? <Ionicons name="checkmark" size={20} color={colors.corail} /> : null}
          </Pressable>
        ))}
      </Feuille>

      {/* — Feuille enregistrement de recherche — */}
      <Feuille visible={feuilleSauvegarde} onFermer={() => setFeuilleSauvegarde(false)} titre="Enregistrer la recherche" hauteur={0.5}>
        <Texte variante="corpsDoux">
          On te préviendra dès qu'un article correspondant est mis en ligne.
        </Texte>
        <Champ
          label="Nom de la recherche" value={nomRecherche} onChangeText={setNomRecherche}
          placeholder={filtres.texte || 'Ma recherche'}
        />
        <Bouton
          titre="Enregistrer et m'alerter" pleineLargeur
          onPress={() => {
            sauvegarderRecherche(nomRecherche || filtres.texte || 'Ma recherche', filtres, true);
            setNomRecherche('');
            setFeuilleSauvegarde(false);
            router.push('/recherches');
          }}
        />
      </Feuille>
    </Ecran>
  );
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Texte variante="micro">{titre.toUpperCase()}</Texte>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  barre: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    backgroundColor: colors.blanc, borderRadius: radius.pill,
    paddingHorizontal: space.lg, height: 46,
  },
  saisie: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.encre, height: '100%' },
  ligneResultats: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.lg, paddingVertical: space.sm,
  },
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg },
  ligneTri: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.blanc, padding: space.lg, borderRadius: radius.md,
  },
});
