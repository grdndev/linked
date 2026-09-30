import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Bouton, Ecran, EnTete, Etiquette, Texte } from '@/components';
import { colors, radius, space } from '@/theme';
import { useLiked } from '@/store/liked';
import { MODE_DEMO } from '@/services/config';
import { api } from '@/services/api';
import { orderEmail, type OrderEmail } from '@/lib/orderEmail';
import { refuserProchainPaiement } from '@/services/psp';
import { confirmer } from '@/lib/dialogues';
import { id } from '@/lib/ids';

type Mail = {id:string;subject:string;textContent:string;status:string};
export default function TestLab() {
  const state = useLiked();
  const [status,setStatus] = useState<Record<string,string>>({});
  const [emails,setEmails] = useState<Mail[]>([]);
  const [error,setError] = useState('');
  const [expanded,setExpanded] = useState<string>();
  const moi = state.utilisateurs.find(u=>u.id===state.sessionId);
  const refresh = async () => {
    if (MODE_DEMO) return;
    try { setStatus(await api('/test/status')); if (moi) setEmails(await api('/emails')); setError(''); }
    catch(e) { setError((e as Error).message); }
  };
  useEffect(()=>{ void refresh(); },[state.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps
  const orders = state.commandes.filter(c=>MODE_DEMO || c.acheteurId===moi?.id || c.vendeurId===moi?.id).slice(0,8);
  const previews: Mail[] = MODE_DEMO ? orders.flatMap(c => {
    const events: OrderEmail[] = [];
    if (c.journal.some(e=>/encaissé/.test(e.libelle))) events.push('achat');
    if (c.journal.some(e=>e.libelle==='Colis déposé')) events.push('expedition');
    if (c.mode==='colissimo' && c.livreeLe) events.push('livraison');
    if (c.statut==='finalisee') events.push('versement');
    if (c.statut==='remboursee') events.push('remboursement');
    return events.map(event=>({id:`${c.id}:${event}`,status:'preview',...orderEmail(c,state.annonces.find(a=>a.id===c.annonceId)?.titre || 'Article',event,moi?.id===c.vendeurId)}));
  }) : emails;
  const start = async (mode:'main_propre'|'colissimo',declined=false) => {
    if (!MODE_DEMO) return;
    const buyer = state.utilisateurs.find(u=>u.id==='u_demo')!;
    const template = state.annonces.find(a=>a.vendeurId!==buyer.id && a.accepteEnvoi && a.accepteMainPropre)!;
    const listing = {...template,id:id('recette'),statut:'en_ligne' as const,titre:mode==='colissimo'?'Robe en lin · test livraison':'Coup de cœur · test remise',publieeLe:new Date().toISOString()};
    useLiked.setState({annonces:[listing,...state.annonces]});
    await state.connecter(buyer.email);
    if (declined) refuserProchainPaiement();
    router.push(`/paiement/${listing.id}?mode=${mode}`);
  };
  return <Ecran><EnTete titre="L’atelier de test" sousTitre="Liked · bêta privée"/><ScrollView contentContainerStyle={styles.page}>
    <View style={styles.hero}><Ionicons name="flask-outline" size={30} color={colors.corail}/><Texte variante="titre" couleur={colors.blanc}>Tout essayer.{'\n'}En toute tranquillité.</Texte><Texte couleur="#CBD8D7">Achat, remise, livraison et remboursement : suis chaque étape et vérifie les messages reçus.</Texte><Etiquette libelle={MODE_DEMO?'Simulation sur cet appareil':'Stripe en mode test'} ton="action"/></View>
    <View style={styles.card}><Texte variante="section">Les services</Texte>{[['card-outline','Paiements',MODE_DEMO?'Simulés · aucun appel Stripe':status.stripe==='configured'?'Clé Stripe test configurée':'Stripe à connecter'],['mail-outline','E-mails',MODE_DEMO?'Aperçus · aucun e-mail envoyé':status.brevo==='configured'?'Brevo configuré':'Brevo à connecter'],['cube-outline','Livraison',MODE_DEMO || status.shipping==='simulated'?'Transport simulé · aucun colis réel':'Transport désactivé']].map(([icon,title,detail])=><View key={title} style={styles.row}><Ionicons name={icon as 'card-outline'} size={22} color={colors.corail}/><View style={{flex:1}}><Texte>{title}</Texte><Texte variante="petit">{detail}</Texte></View></View>)}
    {!MODE_DEMO && <Bouton titre="Actualiser les services et e-mails" ton="contour" onPress={refresh}/>} {error && <Texte couleur={colors.danger}>{error}</Texte>}</View>
    {MODE_DEMO && <View style={styles.card}><Texte variante="section">01 · Choisis un parcours</Texte><Texte variante="petit">Chaque parcours crée un nouvel article fictif. Les données restent dans ton navigateur et ne sont pas partagées avec un autre téléphone.</Texte><Bouton titre="Tester un achat avec remise" icone="hand-left-outline" onPress={()=>start('main_propre')}/><Bouton titre="Tester un achat avec livraison" ton="encre" icone="cube-outline" onPress={()=>start('colissimo')}/><Bouton titre="Tester une carte refusée" ton="contour" onPress={()=>start('main_propre',true)}/></View>}
    <View style={styles.card}><Texte variante="section">02 · Suis tes commandes</Texte><Texte variante="petit">{MODE_DEMO?'Bascule entre acheteur et vendeur. Pour la remise, relève le code côté acheteur, puis saisis-le côté vendeur.':'Ouvre ta commande pour effectuer la remise, simuler le transport ou demander un remboursement avant l’expédition.'}</Texte>{orders.length===0 && <Texte variante="petit">Tes commandes apparaîtront ici après un achat.</Texte>}{orders.map(c=><View key={c.id} style={styles.order}><Texte>{c.reference}</Texte><Texte variante="petit">{state.annonces.find(a=>a.id===c.annonceId)?.titre}</Texte><Etiquette libelle={c.statut.replaceAll('_',' ')} ton="neutre"/>{MODE_DEMO ? <View style={{gap:8}}>{[['Acheteur',c.acheteurId],['Vendeur',c.vendeurId]].map(([role,userId])=><Bouton key={role} titre={`Voir côté ${role.toLowerCase()}`} ton={role==='Acheteur'?'encre':'contour'} taille="sm" onPress={async()=>{const u=state.utilisateurs.find(u=>u.id===userId)!;await state.connecter(u.email);router.push(`/commande/${c.id}`);}}/>)}</View>:<Bouton titre="Ouvrir la commande" ton="contour" onPress={()=>router.push(`/commande/${c.id}`)}/>}</View>)}</View>
    <View style={styles.card}><Texte variante="section">03 · Les e-mails de commande</Texte><Texte variante="petit">{MODE_DEMO?'Aperçus des contenus prévus pour Brevo, générés depuis tes scénarios. Aucun envoi réel.':'« Accepté » signifie accepté par Brevo ; la réception finale dépend aussi du destinataire et de ses filtres antispam.'}</Texte>{previews.length===0 && <Texte variante="petit">Effectue un achat pour voir sa confirmation ici.</Texte>}{previews.map(m=><View key={m.id} style={styles.order}><Texte>{m.subject}</Texte><Etiquette libelle={{preview:'Aperçu non envoyé',accepted:'Accepté par Brevo',pending:'En attente d’envoi',failed:'Envoi échoué'}[m.status] || m.status} ton="neutre"/><Bouton titre={expanded===m.id?'Fermer l’aperçu':'Lire le message'} ton="discret" taille="sm" onPress={()=>setExpanded(expanded===m.id?undefined:m.id)}/>{expanded===m.id && <Texte variante="petit">{m.textContent}</Texte>}</View>)}</View>
    <View style={styles.card}><Texte variante="section">À garder sur ton iPhone</Texte><Texte variante="petit">Dans Safari, ouvre Partager puis « Sur l’écran d’accueil ». Tu retrouveras Liked avec tes autres applications.</Texte></View>
    {MODE_DEMO && <Bouton titre="Réinitialiser mes essais" ton="contour" onPress={async()=>{if(await confirmer('Recommencer les tests','Les essais enregistrés sur cet appareil seront effacés.','Réinitialiser',true)) await state.reinitialiser();}}/>}
  </ScrollView></Ecran>;
}
const styles = StyleSheet.create({page:{padding:space.lg,gap:space.lg,paddingBottom:60},hero:{backgroundColor:colors.encre,borderRadius:radius.lg,padding:24,gap:16},card:{backgroundColor:colors.blanc,borderRadius:radius.lg,padding:20,gap:16},row:{flexDirection:'row',gap:14,alignItems:'center'},order:{borderTopWidth:1,borderTopColor:colors.encre15,paddingTop:16,gap:10}});
