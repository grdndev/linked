import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Bouton, Champ, Ecran, Feuille, Puce, Texte } from '@/components';
import { COULEURS, LIBELLES_ETAT, UNIVERS } from '@/data/categories';
import { COMMUNES } from '@/data/communes';
import { chercherMarques } from '@/data/marques';
import { FORFAITS_PORT_CENTS, LIBELLES_GABARIT, euros, fraisProtectionCents, parseEuros } from '@/lib/argent';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { useMoi } from '@/store/selecteurs';
import type { EtatArticle, Gabarit } from '@/types';
import { alerter } from '@/lib/dialogues';

const MAX_PHOTOS = 8;

export default function Vendre() {
  const moi = useMoi();
  const publier = useLiked((e) => e.publierAnnonce);

  const [photos, setPhotos] = useState<string[]>([]);
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [universe, setUniverse] = useState<'femme' | 'homme' | 'enfant'>();
  const [categorie, setCategorie] = useState<string>();
  const [taille, setTaille] = useState<string>();
  const [marque, setMarque] = useState('');
  const [etat, setEtat] = useState<EtatArticle>();
  const [couleur, setCouleur] = useState<string>();
  const [prix, setPrix] = useState('');
  const [gabarit, setGabarit] = useState<Gabarit>('moyen');
  const [mainPropre, setMainPropre] = useState(true);
  const [communeRemise, setCommuneRemise] = useState(moi?.commune ?? 'Saint-Denis');
  const [envoi, setEnvoi] = useState(true);
  const [feuille, setFeuille] = useState<null | 'categorie' | 'commune' | 'gabarit'>(null);
  const [erreur, setErreur] = useState<string>();

  const categories = universe ? UNIVERS.find((u) => u.cle === universe)!.categories : [];
  const tailles = categorie ? categories.find((c) => c.slug === categorie)?.tailles ?? [] : [];
  const suggestionsMarques = useMemo(
    () => (marque.length > 0 && !chercherMarques(marque).includes(marque) ? chercherMarques(marque, 6) : []),
    [marque],
  );
  const prixCents = parseEuros(prix) ?? 0;

  const choisirPhotos = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      alerter('Photos', "Autorise l'accès à tes photos pour illustrer ton annonce.");
      return;
    }
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.7,
      // Recadrage carré au dépôt (§4.2) ; le redimensionnement définitif est
      // fait côté serveur pour servir des images légères (§6.2).
      allowsEditing: false,
    });
    if (resultat.canceled) return;
    setPhotos((p) => [...p, ...resultat.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
  };

  const deplacerPhoto = (index: number, sens: -1 | 1) => {
    setPhotos((p) => {
      const cible = index + sens;
      if (cible < 0 || cible >= p.length) return p;
      const copie = [...p];
      [copie[index], copie[cible]] = [copie[cible], copie[index]];
      return copie;
    });
  };

  const valider = () => {
    if (!moi) return router.push('/bienvenue');
    if (!moi.majeur) return setErreur("Les moins de 18 ans ne peuvent pas vendre sur Liked.");
    if (photos.length === 0) return setErreur('Ajoute au moins une photo.');
    if (titre.trim().length < 5) return setErreur('Donne un titre un peu plus parlant.');
    if (!universe || !categorie) return setErreur('Choisis une catégorie.');
    if (!taille) return setErreur('Indique la taille.');
    if (!marque.trim()) return setErreur('Indique la marque (ou « Sans marque »).');
    if (!etat) return setErreur("Précise l'état de l'article.");
    if (!couleur) return setErreur('Choisis une couleur.');
    if (prixCents < 100) return setErreur('Le prix minimum est de 1 €.');
    if (!mainPropre && !envoi) return setErreur('Choisis au moins un mode de remise.');

    const annonceId = publier({
      titre: titre.trim(),
      description: description.trim(),
      photos,
      universe,
      categorie,
      taille,
      marque: marque.trim(),
      couleur,
      etat,
      prixCents,
      gabarit,
      accepteMainPropre: mainPropre,
      communeRemise: mainPropre ? communeRemise : undefined,
      accepteEnvoi: envoi,
    });
    reinitialiser();
    router.push(`/annonce/${annonceId}`);
  };

  const reinitialiser = () => {
    setPhotos([]); setTitre(''); setDescription(''); setUniverse(undefined);
    setCategorie(undefined); setTaille(undefined); setMarque(''); setEtat(undefined);
    setCouleur(undefined); setPrix(''); setGabarit('moyen'); setErreur(undefined);
  };

  if (!moi) {
    return (
      <Ecran>
        <View style={{ flex: 1, justifyContent: 'center', padding: space.xl, gap: space.lg }}>
          <Texte variante="titre" centre>Vends en 3 minutes</Texte>
          <Texte variante="corpsDoux" centre>
            La vente est gratuite sur Liked. Crée ton compte pour déposer ta première annonce.
          </Texte>
          <Bouton titre="Créer mon compte" pleineLargeur onPress={() => router.push('/bienvenue')} />
        </View>
      </Ecran>
    );
  }

  return (
    <Ecran>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: space.xxxl }} keyboardShouldPersistTaps="handled">
          <Texte variante="titre">Vendre un article</Texte>

          {/* Photos */}
          <View style={{ gap: space.sm }}>
            <Texte variante="micro">PHOTOS · {photos.length}/{MAX_PHOTOS}</Texte>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {photos.map((uri, index) => (
                <View key={uri + index}>
                  <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                  {index === 0 ? (
                    <View style={styles.badgePrincipale}>
                      <Texte variante="micro" couleur={colors.blanc}>Principale</Texte>
                    </View>
                  ) : null}
                  <View style={styles.actionsPhoto}>
                    <Pressable onPress={() => deplacerPhoto(index, -1)} hitSlop={6} accessibilityLabel="Déplacer à gauche">
                      <Ionicons name="chevron-back-circle" size={22} color={colors.blanc} />
                    </Pressable>
                    <Pressable onPress={() => setPhotos((p) => p.filter((_, i) => i !== index))} hitSlop={6} accessibilityLabel="Supprimer la photo">
                      <Ionicons name="close-circle" size={22} color={colors.blanc} />
                    </Pressable>
                    <Pressable onPress={() => deplacerPhoto(index, 1)} hitSlop={6} accessibilityLabel="Déplacer à droite">
                      <Ionicons name="chevron-forward-circle" size={22} color={colors.blanc} />
                    </Pressable>
                  </View>
                </View>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <Pressable onPress={choisirPhotos} style={styles.ajoutPhoto}>
                  <Ionicons name="camera-outline" size={26} color={colors.corail} />
                  <Texte variante="micro" couleur={colors.corail}>Ajouter</Texte>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>

          <Champ label="Titre" value={titre} onChangeText={setTitre} placeholder="Ex. Robe fleurie longue Sessùn" maxLength={80} />
          <Champ
            label="Description" value={description} onChangeText={setDescription} multiline
            placeholder="Décris l'article : coupe, matière, défauts éventuels, raison de la vente…"
          />

          {/* Catégorie */}
          <Section titre="Catégorie">
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {UNIVERS.map((u) => (
                <Puce
                  key={u.cle} libelle={`${u.emoji}  ${u.nom}`} active={universe === u.cle}
                  onPress={() => { setUniverse(u.cle); setCategorie(undefined); setTaille(undefined); }}
                />
              ))}
            </View>
            {universe ? (
              <Pressable onPress={() => setFeuille('categorie')} style={styles.selecteur}>
                <Texte variante="corps" couleur={categorie ? colors.encre : colors.encre40}>
                  {categorie ? categories.find((c) => c.slug === categorie)?.nom : 'Choisir le type de vêtement'}
                </Texte>
                <Ionicons name="chevron-forward" size={18} color={colors.encre60} />
              </Pressable>
            ) : null}
          </Section>

          {tailles.length > 0 ? (
            <Section titre="Taille">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {tailles.map((t) => (
                  <Puce key={t} libelle={t} active={taille === t} onPress={() => setTaille(t)} />
                ))}
              </View>
            </Section>
          ) : null}

          {/* Marque en autocomplétion */}
          <View style={{ gap: space.sm }}>
            <Champ label="Marque" value={marque} onChangeText={setMarque} placeholder="Commence à taper…" autoCorrect={false} />
            {suggestionsMarques.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                {suggestionsMarques.map((m) => (
                  <Puce key={m} libelle={m} compact onPress={() => setMarque(m)} />
                ))}
              </View>
            ) : null}
          </View>

          <Section titre="État">
            <View style={{ gap: space.sm }}>
              {(Object.keys(LIBELLES_ETAT) as EtatArticle[]).map((cle) => (
                <Pressable key={cle} onPress={() => setEtat(cle)} style={[styles.option, etat === cle ? styles.optionActive : null]}>
                  <Ionicons
                    name={etat === cle ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={etat === cle ? colors.corail : colors.encre40}
                  />
                  <View style={{ flex: 1 }}>
                    <Texte variante="corps">{LIBELLES_ETAT[cle].nom}</Texte>
                    <Texte variante="petit">{LIBELLES_ETAT[cle].aide}</Texte>
                  </View>
                </Pressable>
              ))}
            </View>
          </Section>

          <Section titre="Couleur">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {COULEURS.map((c) => (
                <Pressable
                  key={c.nom} onPress={() => setCouleur(c.nom)}
                  style={[styles.couleur, couleur === c.nom ? { borderColor: colors.corail, borderWidth: 2 } : null]}
                >
                  <View
                    style={{
                      width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.encre15,
                      backgroundColor: c.hex === 'multi' ? colors.corail : c.hex,
                    }}
                  />
                  <Texte variante="petit">{c.nom}</Texte>
                </Pressable>
              ))}
            </View>
          </Section>

          {/* Prix */}
          <View style={{ gap: space.sm }}>
            <Champ label="Prix" value={prix} onChangeText={setPrix} keyboardType="decimal-pad" placeholder="0,00" suffixe="€" />
            {prixCents > 0 ? (
              <View style={styles.encart}>
                <Texte variante="petit">
                  Tu touches <Texte variante="petit" couleur={colors.encre}>{euros(prixCents)}</Texte> — la vente est gratuite.
                </Texte>
                <Texte variante="petit">
                  L'acheteur paiera {euros(prixCents + fraisProtectionCents(prixCents))} avec la protection acheteur,
                  hors frais de port.
                </Texte>
              </View>
            ) : null}
          </View>

          {/* Livraison */}
          <Section titre="Remise et envoi">
            <Pressable onPress={() => setFeuille('gabarit')} style={styles.selecteur}>
              <View>
                <Texte variante="corps">Gabarit : {LIBELLES_GABARIT[gabarit].nom}</Texte>
                <Texte variante="petit">
                  {LIBELLES_GABARIT[gabarit].exemples} · port {euros(FORFAITS_PORT_CENTS[gabarit])}
                </Texte>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.encre60} />
            </Pressable>

            <Interrupteur
              titre="Remise en main propre"
              sousTitre={mainPropre ? communeRemise : 'Gratuit pour l’acheteur'}
              actif={mainPropre}
              onBasculer={() => setMainPropre((v) => !v)}
            />
            {mainPropre ? (
              <Pressable onPress={() => setFeuille('commune')} style={styles.selecteur}>
                <Texte variante="corps">{communeRemise}</Texte>
                <Ionicons name="chevron-forward" size={18} color={colors.encre60} />
              </Pressable>
            ) : null}

            <Interrupteur
              titre="Envoi Colissimo"
              sousTitre="Étiquette prépayée générée par Liked"
              actif={envoi}
              onBasculer={() => setEnvoi((v) => !v)}
            />
          </Section>

          {erreur ? <Texte variante="petit" couleur={colors.danger}>{erreur}</Texte> : null}
          <Bouton titre="Publier mon annonce" pleineLargeur taille="lg" onPress={valider} />
          <Texte variante="micro" centre>
            Publication immédiate. Liked peut retirer une annonce non conforme après vérification.
          </Texte>
        </ScrollView>
      </KeyboardAvoidingView>

      <Feuille visible={feuille === 'categorie'} onFermer={() => setFeuille(null)} titre="Type de vêtement">
        <View style={{ gap: space.sm }}>
          {categories.map((c) => (
            <Pressable key={c.slug} onPress={() => { setCategorie(c.slug); setTaille(undefined); setFeuille(null); }} style={styles.option}>
              <Texte variante="corps" style={{ flex: 1 }}>{c.nom}</Texte>
              <Ionicons name="chevron-forward" size={18} color={colors.encre40} />
            </Pressable>
          ))}
        </View>
      </Feuille>

      <Feuille visible={feuille === 'commune'} onFermer={() => setFeuille(null)} titre="Commune de remise">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {COMMUNES.map((c) => (
            <Puce key={c} libelle={c} active={c === communeRemise} onPress={() => { setCommuneRemise(c); setFeuille(null); }} />
          ))}
        </View>
      </Feuille>

      <Feuille visible={feuille === 'gabarit'} onFermer={() => setFeuille(null)} titre="Gabarit du colis" hauteur={0.55}>
        {(Object.keys(LIBELLES_GABARIT) as Gabarit[]).map((g) => (
          <Pressable key={g} onPress={() => { setGabarit(g); setFeuille(null); }} style={[styles.option, gabarit === g ? styles.optionActive : null]}>
            <Ionicons name="cube-outline" size={20} color={colors.encre80} />
            <View style={{ flex: 1 }}>
              <Texte variante="corps">{LIBELLES_GABARIT[g].nom} — {euros(FORFAITS_PORT_CENTS[g])}</Texte>
              <Texte variante="petit">{LIBELLES_GABARIT[g].exemples}</Texte>
            </View>
          </Pressable>
        ))}
      </Feuille>
    </Ecran>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <Texte variante="micro">{titre.toUpperCase()}</Texte>
      {children}
    </View>
  );
}

function Interrupteur({
  titre, sousTitre, actif, onBasculer,
}: { titre: string; sousTitre?: string; actif: boolean; onBasculer: () => void }) {
  return (
    <Pressable onPress={onBasculer} style={styles.option}>
      <View style={{ flex: 1 }}>
        <Texte variante="corps">{titre}</Texte>
        {sousTitre ? <Texte variante="petit">{sousTitre}</Texte> : null}
      </View>
      <View style={[styles.piste, actif ? { backgroundColor: colors.corail } : null]}>
        <View style={[styles.pouce, actif ? { alignSelf: 'flex-end' } : null]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  photo: { width: 96, height: 120, borderRadius: radius.md, backgroundColor: colors.sableFonce },
  badgePrincipale: {
    position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(11,59,60,0.8)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  actionsPhoto: {
    position: 'absolute', top: 4, left: 4, right: 4,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  ajoutPhoto: {
    width: 96, height: 120, borderRadius: radius.md, borderWidth: 1.5,
    borderStyle: 'dashed', borderColor: colors.corail, backgroundColor: colors.corailDoux,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  selecteur: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg,
  },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: space.md,
    backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  optionActive: { borderColor: colors.corail },
  couleur: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.blanc, borderRadius: radius.pill,
    paddingHorizontal: space.md, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.encre15,
  },
  encart: { backgroundColor: colors.succesDoux, borderRadius: radius.md, padding: space.lg, gap: 4 },
  piste: {
    width: 46, height: 28, borderRadius: 14, backgroundColor: colors.encre15,
    padding: 3, justifyContent: 'center',
  },
  pouce: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.blanc },
});
