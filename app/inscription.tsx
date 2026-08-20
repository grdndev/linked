import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Bouton, Champ, Ecran, EnTete, Feuille, Puce, Texte } from '@/components';
import { COMMUNES } from '@/data/communes';
import { CODE_DEMO } from '@/services/verification';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';

type Etape = 'identite' | 'verification';

export default function Inscription() {
  const { demanderCode, inscrire } = useLiked();
  const [etape, setEtape] = useState<Etape>('identite');
  const [canal, setCanal] = useState<'email' | 'sms'>('email');
  const [pseudo, setPseudo] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [commune, setCommune] = useState('Saint-Denis');
  const [majeur, setMajeur] = useState(true);
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState<string>();
  const [enCours, setEnCours] = useState(false);
  const [choixCommune, setChoixCommune] = useState(false);

  const destination = canal === 'sms' ? telephone : email;

  const envoyerCode = async () => {
    if (!pseudo.trim()) return setErreur('Choisis un pseudonyme.');
    if (!email.includes('@')) return setErreur('E-mail invalide.');
    if (canal === 'sms' && telephone.replace(/\D/g, '').length < 9) return setErreur('Numéro invalide.');
    setEnCours(true);
    await demanderCode(destination, canal);
    setEnCours(false);
    setErreur(undefined);
    setEtape('verification');
  };

  const valider = async () => {
    setEnCours(true);
    const resultat = await inscrire({ pseudo, email, telephone: telephone || undefined, commune, majeur, code });
    setEnCours(false);
    if (!resultat.ok) return setErreur(resultat.erreur);
    router.replace('/(tabs)');
  };

  return (
    <Ecran>
      <EnTete titre="Créer mon compte" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
          {etape === 'identite' ? (
            <>
              <Texte variante="titre">Bienvenue sur Liked 🌺</Texte>
              <Champ label="Pseudonyme" value={pseudo} onChangeText={setPseudo} placeholder="Ton pseudo public" />
              <Champ
                label="E-mail" value={email} onChangeText={setEmail}
                autoCapitalize="none" keyboardType="email-address" placeholder="ton@email.re"
              />
              <Champ
                label="Téléphone (optionnel)" value={telephone} onChangeText={setTelephone}
                keyboardType="phone-pad" placeholder="0692 12 34 56"
                aide="Un numéro vérifié rassure les acheteurs."
              />

              <View style={{ gap: space.sm }}>
                <Texte variante="micro">COMMUNE</Texte>
                <Pressable onPress={() => setChoixCommune(true)} style={styles.selecteur}>
                  <Texte variante="corps">{commune}</Texte>
                  <Ionicons name="chevron-down" size={18} color={colors.encre60} />
                </Pressable>
              </View>

              <View style={{ gap: space.sm }}>
                <Texte variante="micro">VÉRIFICATION PAR</Texte>
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Puce libelle="E-mail" active={canal === 'email'} onPress={() => setCanal('email')} />
                  <Puce libelle="SMS" active={canal === 'sms'} onPress={() => setCanal('sms')} />
                </View>
              </View>

              <Pressable onPress={() => setMajeur((v) => !v)} style={styles.caseACocher}>
                <Ionicons
                  name={majeur ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={majeur ? colors.corail : colors.encre40}
                />
                <Texte variante="petit" style={{ flex: 1 }}>
                  Je certifie avoir 18 ans ou plus. Les moins de 18 ans peuvent acheter mais pas vendre
                  (vérification d'identité exigée par notre prestataire de paiement).
                </Texte>
              </Pressable>

              {erreur ? <Texte variante="petit" couleur={colors.danger}>{erreur}</Texte> : null}
              <Bouton titre="Recevoir mon code" pleineLargeur chargement={enCours} onPress={envoyerCode} />
            </>
          ) : (
            <>
              <Texte variante="titre">Vérifie ton {canal === 'sms' ? 'numéro' : 'e-mail'}</Texte>
              <Texte variante="corpsDoux">
                On a envoyé un code à 6 chiffres à {destination}.
              </Texte>
              <Champ
                label="Code de vérification" value={code} onChangeText={setCode}
                keyboardType="number-pad" maxLength={6} placeholder="000000"
                erreur={erreur}
                aide={`Environnement de recette : le code est ${CODE_DEMO}.`}
              />
              <Bouton titre="Créer mon compte" pleineLargeur chargement={enCours} onPress={valider} />
              <Bouton titre="Modifier mes informations" ton="contour" pleineLargeur onPress={() => setEtape('identite')} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Feuille visible={choixCommune} onFermer={() => setChoixCommune(false)} titre="Ta commune">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {COMMUNES.map((c) => (
            <Puce
              key={c} libelle={c} active={c === commune}
              onPress={() => { setCommune(c); setChoixCommune(false); }}
            />
          ))}
        </View>
      </Feuille>
    </Ecran>
  );
}

const styles = {
  selecteur: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: colors.blanc,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.encre15,
    paddingHorizontal: space.lg,
    height: 52,
  },
  caseACocher: {
    flexDirection: 'row' as const,
    gap: space.md,
    alignItems: 'flex-start' as const,
    backgroundColor: colors.blanc,
    padding: space.lg,
    borderRadius: radius.md,
  },
};
