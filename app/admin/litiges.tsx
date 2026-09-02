import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Bouton, Champ, Ecran, EnTete, Etiquette, Feuille, Texte, Vide } from '@/components';
import { euros, parseEuros } from '@/lib/argent';
import { depuis } from '@/lib/temps';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import type { IssueLitige } from '@/types';

const LIBELLES_MOTIF: Record<string, string> = {
  non_recu: 'Article non reçu',
  non_conforme: 'Article non conforme',
  endommage: 'Article endommagé',
  contrefacon: 'Soupçon de contrefaçon',
  autre: 'Autre problème',
};

const ISSUES: { cle: IssueLitige; libelle: string; aide: string }[] = [
  { cle: 'remboursement_total', libelle: 'Remboursement total', aide: "L'acheteur récupère la totalité." },
  { cle: 'remboursement_partiel', libelle: 'Remboursement partiel', aide: 'Geste commercial, le reste va au vendeur.' },
  { cle: 'versement_vendeur', libelle: 'Versement au vendeur', aide: 'Litige non fondé, les fonds sont libérés.' },
  { cle: 'retour_article', libelle: 'Retour article + remboursement', aide: "L'article repart chez le vendeur." },
];

export default function AdminLitiges() {
  const litiges = useLiked((e) => e.litiges);
  const commandes = useLiked((e) => e.commandes);
  const resoudreLitige = useLiked((e) => e.resoudreLitige);

  const [cible, setCible] = useState<string | null>(null);
  const [issue, setIssue] = useState<IssueLitige>('remboursement_total');
  const [montant, setMontant] = useState('');
  const [motivation, setMotivation] = useState('');
  const [enCours, setEnCours] = useState(false);

  const litige = litiges.find((l) => l.id === cible);
  const commande = commandes.find((c) => c.id === litige?.commandeId);

  return (
    <Ecran>
      <EnTete titre="Litiges" sousTitre={`${litiges.filter((l) => l.statut !== 'resolu').length} en cours`} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: space.xxxl }}>
        {litiges.length === 0 ? (
          <Vide icone="checkmark-circle-outline" titre="Aucun litige" corps="Toutes les transactions se sont bien passées." />
        ) : (
          litiges.map((l) => {
            const c = commandes.find((x) => x.id === l.commandeId);
            return (
              <View key={l.id} style={styles.carte}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Texte variante="section" style={{ flex: 1 }}>{c?.reference ?? l.commandeId}</Texte>
                  <Etiquette
                    libelle={l.statut === 'resolu' ? 'Résolu' : l.statut === 'en_examen' ? 'En examen' : 'Ouvert'}
                    ton={l.statut === 'resolu' ? 'succes' : 'danger'}
                  />
                </View>
                <Texte variante="petit">{LIBELLES_MOTIF[l.motif] ?? l.motif} · ouvert {depuis(l.ouvertLe)}</Texte>
                <Texte variante="corps" numberOfLines={3}>{l.description}</Texte>
                {c ? <Texte variante="micro">Montant séquestré : {euros(c.totalCents)}</Texte> : null}
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Bouton titre="Ouvrir la conversation" taille="sm" ton="contour" onPress={() => router.push(`/litige/${l.id}`)} />
                  {l.statut !== 'resolu' ? (
                    <Bouton titre="Trancher" taille="sm" onPress={() => { setCible(l.id); setMontant(''); setMotivation(''); }} />
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Feuille visible={Boolean(cible)} onFermer={() => setCible(null)} titre="Décision" hauteur={0.85}>
        {commande ? (
          <Texte variante="corpsDoux">
            Commande {commande.reference} — total payé {euros(commande.totalCents)},
            dont {euros(commande.prixArticleCents)} pour le vendeur.
          </Texte>
        ) : null}

        {ISSUES.map((i) => (
          <Pressable key={i.cle} onPress={() => setIssue(i.cle)} style={[styles.option, issue === i.cle ? { borderColor: colors.corail } : null]}>
            <View style={{ flex: 1 }}>
              <Texte variante="corps">{i.libelle}</Texte>
              <Texte variante="petit">{i.aide}</Texte>
            </View>
          </Pressable>
        ))}

        {issue === 'remboursement_partiel' ? (
          <Champ label="Montant remboursé" value={montant} onChangeText={setMontant} keyboardType="decimal-pad" suffixe="€" />
        ) : null}

        <Champ label="Motivation de la décision" multiline value={motivation} onChangeText={setMotivation}
          placeholder="Éléments retenus, preuves examinées…" />

        <Bouton
          titre="Appliquer la décision" pleineLargeur chargement={enCours}
          desactive={motivation.trim().length < 10}
          onPress={async () => {
            if (!litige) return;
            setEnCours(true);
            await resoudreLitige(litige.id, issue, parseEuros(montant) ?? 0, motivation.trim());
            setEnCours(false);
            setCible(null);
          }}
        />
        <Texte variante="micro">La décision et son auteur sont enregistrés dans le journal d'administration.</Texte>
      </Feuille>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  carte: { backgroundColor: colors.blanc, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  option: {
    backgroundColor: colors.blanc, borderRadius: radius.md, padding: space.lg,
    borderWidth: 1.5, borderColor: 'transparent',
  },
});
