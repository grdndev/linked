import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Bouton, Ecran, EnTete, Etiquette, Texte } from '@/components';
import { useLiked } from '@/store/liked';
import { useAnnonce, useMoi } from '@/store/selecteurs';
import { api } from '@/services/api';
import { MODE_DEMO } from '@/services/config';
import { forfaitsBoost, reglagesApplication } from '@/lib/reglages';
import { euros } from '@/lib/argent';
import { colors, radius, space } from '@/theme';

type History = {id:string;plan:string;days:number;amount:number;status:string;starts_at:string|null;ends_at:string|null};
export default function Booster() {
  const config=useLiked(e=>e.reglages);
  const BOOST_PLANS=forfaitsBoost({reglages:config});
  const boostsActifs=reglagesApplication({reglages:config}).boostsActifs;
  const {id,plan:initialPlan,publication}=useLocalSearchParams<{id:string;plan?:string;publication?:string}>();const a=useAnnonce(id);const moi=useMoi();
  const [plan,setPlan]=useState<string>(initialPlan==='7j'?'7j':'3j');const [history,setHistory]=useState<History[]>([]);
  const [ready,setReady]=useState(false);const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    if(MODE_DEMO){setReady(true);return;}
    try{const rows=await api<History[]>(`/boosts/${id}`);setHistory(rows);setReady(true);setError('');await useLiked.getState().rafraichir();}catch(e){setError((e as Error).message);}
  },[id]);
  useEffect(()=>{void refresh();const t=setInterval(()=>void refresh(),15000);return()=>clearInterval(t);},[refresh]);
  const active=history.find(b=>b.status==='active' && Date.parse(b.ends_at!)>Date.now());
  const pending=history.find(b=>b.status==='pending');const current=BOOST_PLANS.find(p=>p.id===(pending?.plan || plan))!;const selected=pending?{...current,prixCents:pending.amount}:current;
  if(!a || !moi || a.vendeurId!==moi.id)return <Ecran><EnTete titre="Booster un article"/><View style={styles.card}><Texte>Connecte-toi au compte vendeur pour retrouver ton annonce.</Texte><Bouton titre="Mes annonces" onPress={()=>router.replace('/mes-annonces')}/></View></Ecran>;
  const pay=async()=>{
    setError('');
    try{const result=await api<{checkoutUrl:string}>('/boost/checkout',{annonceId:a.id,plan:selected.id});
      if(Platform.OS==='web')window.location.assign(result.checkoutUrl);else {await Linking.openURL(result.checkoutUrl);await refresh();}
    }catch(e){setError((e as Error).message);}
  };
  return <Ecran><EnTete titre="Un peu plus de lumière" sousTitre="Booster mon article"/><ScrollView contentContainerStyle={styles.page}>
    <View style={styles.hero}><Ionicons name="sparkles-outline" size={32} color={colors.corail}/><Texte variante="titre" couleur={colors.blanc}>Ta pépite mérite{'\n'}d’être vue.</Texte><Texte couleur="#CBD8D7">Une place dans « À la une », pour donner plus de visibilité à ton article.</Texte><Etiquette libelle="Stripe test · aucun argent réel" ton="action"/></View>
    <View style={[styles.card,{flexDirection:'row',alignItems:'center'}]}><Image source={{uri:a.photos[0]}} style={{width:62,height:78,borderRadius:12}}/><View style={{flex:1,gap:4}}><Texte variante="section">{a.titre}</Texte><Texte>{euros(a.prixCents)}</Texte></View></View>
    {publication==='1' && <View style={styles.card}><Texte variante="section">Ton annonce est en ligne.</Texte><Texte>Confirme le paiement pour activer le boost choisi. Tu peux aussi revenir à tes annonces sans payer : la publication reste gratuite.</Texte></View>}
    {!boostsActifs && <Texte>Les nouveaux boosts sont momentanément suspendus.</Texte>}
    {error ? <View accessibilityRole="alert"><Texte couleur={colors.danger}>{error}</Texte></View>:null}
    {MODE_DEMO?<View style={styles.card}><Texte>Le boost payant est disponible dans la bêta connectée à Stripe test.</Texte></View>:!ready?<Texte>Vérification de ton boost…</Texte>:active?<View style={styles.card}><Etiquette libelle="Boost actif" ton="succes"/><Texte variante="soustitre">Ton article est à la une.</Texte><Texte>Jusqu’au {new Date(active.ends_at!).toLocaleString('fr-FR')}.</Texte>{a.statut!=='en_ligne' && <Texte>La mise en avant est masquée pendant que ton article n’est plus disponible. La date de fin reste inchangée.</Texte>}<Bouton titre="Voir À la une" icone="sparkles-outline" onPress={()=>router.push('/(tabs)')}/></View>:<>
      <View style={styles.card}><Texte variante="section">Choisis ton coup de pouce</Texte>{BOOST_PLANS.map(p=><Pressable key={p.id} accessibilityRole="radio" accessibilityState={{checked:selected.id===p.id,disabled:!!pending}} accessibilityLabel={`${p.jours} jours, ${euros(p.prixCents)}`} disabled={!!pending} onPress={()=>setPlan(p.id)} style={[styles.plan,selected.id===p.id && styles.selected]}><View style={{flex:1,gap:4}}><Texte variante="section">{p.jours} jours</Texte><Texte variante="petit">{p.nom}</Texte></View><Texte variante="prix">{euros(p.prixCents)}</Texte><Ionicons name={selected.id===p.id?'radio-button-on':'radio-button-off'} size={22} color={colors.corail}/></Pressable>)}</View>
      <View style={styles.card}><Texte variante="section">Simple, et sans abonnement.</Texte><Texte>Le boost démarre après confirmation du paiement. Ton annonce porte le badge « Sponsorisé » et apparaît dans « À la une » tant qu’elle reste disponible.</Texte><Texte variante="petit">Expiration automatique. Aucun renouvellement automatique et aucune vente garantie. Masquer, réserver ou vendre l’article retire sa mise en avant sans prolonger la période.</Texte>{pending && <Texte>Un paiement attend ta confirmation. Tu peux le reprendre ; il expire après 30 minutes. Une carte refusée ou un retour sans paiement n’active pas le boost.</Texte>}<Bouton titre={pending?'Reprendre le paiement Stripe':`Booster ${selected.jours} jours · ${euros(selected.prixCents)}`} icone="flash-outline" onPress={pay} desactive={a.statut!=='en_ligne' || !boostsActifs}/>{a.statut!=='en_ligne' && <Texte couleur={colors.danger}>Remets ton article en ligne pour le booster.</Texte>}</View>
    </>}
    <Bouton titre="Actualiser le statut" ton="contour" onPress={refresh}/>
    {history.length>0 && <View style={styles.card}><Texte variante="section">Mes boosts</Texte>{history.map(b=><View key={b.id} style={{gap:4,paddingVertical:8}}><Texte>{b.days} jours · {euros(b.amount)}</Texte><Texte variante="petit">{{active:'Activé',pending:'Paiement en attente',expired:'Terminé',canceled:'Paiement expiré',refunded:'Remboursé',refund_pending:'Remboursement en cours'}[b.status] || b.status}{b.ends_at?` · fin le ${new Date(b.ends_at).toLocaleDateString('fr-FR')}`:''}</Texte></View>)}</View>}
    <Bouton titre="Revenir à mes annonces" ton="discret" onPress={()=>router.replace('/mes-annonces')}/>
  </ScrollView></Ecran>;
}
const styles=StyleSheet.create({page:{padding:space.lg,gap:space.lg,paddingBottom:60},hero:{backgroundColor:colors.encre,borderRadius:24,padding:24,gap:16},card:{backgroundColor:colors.blanc,borderRadius:radius.lg,padding:20,gap:16},plan:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1.5,borderColor:colors.encre15,borderRadius:18,padding:16},selected:{borderColor:colors.corail,backgroundColor:'#FFF3EE'}});
