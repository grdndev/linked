import { useState } from 'react';
import { Switch, View } from './ui';
import { Bouton, Champ, Texte } from './ui';
import type { AdminOverview } from '../src/types/admin';
import type { ReglagesApplication } from '../src/lib/reglages';
import { colors } from './ui';
import { parseEuros } from '../src/lib/argent';
export function ReglagesAdmin({data,save}:{data:AdminOverview;save:(body:unknown)=>Promise<void>}) {
  const [draft,setDraft]=useState(data.reglages);
  const [prix3,setPrix3]=useState((draft.boost3Cents/100).toFixed(2));
  const [prix7,setPrix7]=useState((draft.boost7Cents/100).toFixed(2));
  const [saved,setSaved]=useState(false);
  const options:[keyof ReglagesApplication,string,string][]=[
    ['colissimoActif','Proposer Colissimo','Désactivé par défaut. En recette : transport simulé uniquement. Aucun colis ni affranchissement réel. Les commandes déjà payées restent suivies après désactivation.'],
    ['inscriptionsOuvertes','Accepter les inscriptions','Les membres existants peuvent toujours se connecter.'],
    ['publicationsOuvertes','Autoriser les nouvelles annonces','Suspend le dépôt de nouvelles annonces.'],
    ['achatsOuverts','Autoriser les achats','Les commandes déjà engagées restent accessibles.'],
    ['boostsActifs','Proposer les boosts','Les boosts déjà payés conservent leur période.'],
  ];
  return <View style={{gap:24}}>
    <Texte variante="soustitre">À ton rythme.</Texte><Texte>Choisis les services ouverts dans Liked. Les changements sont enregistrés sur le serveur.</Texte>
    {options.map(([key,title,detail])=><View key={key} style={{flexDirection:'row',gap:20,alignItems:'center',paddingBottom:20,borderBottomWidth:1,borderColor:colors.encre15}}><View style={{flex:1,gap:6}}><Texte variante="section">{title}</Texte><Texte variante="petit">{detail}</Texte></View><Switch accessibilityLabel={title} value={Boolean(draft[key])} onValueChange={v=>{setSaved(false);setDraft({...draft,[key]:v});}} trackColor={{true:colors.encre}}/></View>)}
    <Texte variante="section">Tarifs des prochains boosts</Texte>
    <View style={{flexDirection:'row',gap:16}}><Champ style={{flex:1}} label="3 jours" value={prix3} onChangeText={v=>{setSaved(false);setPrix3(v);}} keyboardType="decimal-pad" suffixe="€"/><Champ style={{flex:1}} label="7 jours" value={prix7} onChangeText={v=>{setSaved(false);setPrix7(v);}} keyboardType="decimal-pad" suffixe="€"/></View>
    <Texte variante="petit">Les paiements déjà ouverts gardent leur montant. Les nouveaux tarifs s’appliquent aux prochains paiements.</Texte>
    <View style={{backgroundColor:'#EEF3EF',padding:20,borderRadius:16,gap:8}}><Texte variante="section">Avant les vraies expéditions</Texte><Texte>Le contrat et les identifiants Colissimo ne sont pas raccordés. L’activation ci-dessus ouvre seulement les essais. Le raccordement et la validation des étiquettes réelles seront nécessaires avant la mise en production.</Texte></View>
    {saved && <Texte accessibilityRole="alert" couleur={colors.succes}>Réglages enregistrés.</Texte>}
    <Bouton titre="Enregistrer les réglages" onPress={async()=>{const a=parseEuros(prix3),b=parseEuros(prix7);if(a==null||b==null)throw new Error('Saisis des prix valides.');await save({action:'settings',value:{...draft,boost3Cents:a,boost7Cents:b}});setSaved(true);}}/>
  </View>;
}
