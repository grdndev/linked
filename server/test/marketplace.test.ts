import { test } from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import { Database } from '../src/database';
import { command, newUser } from '../src/domain';
import { snapshot, HttpError } from '../src/security';
import { checkout, handover, webhook, refundOrder, shipping, settleDueOrders } from '../src/payments';
import { flushEmails } from '../src/emails';
import { orderEmail } from '../../src/lib/orderEmail';
import { calculerPanier, parseEuros } from '../../src/lib/argent';
import { filtrerCoordonnees } from '../../src/lib/filtreCoordonnees';

function fixture() {
  const db = new Database(':memory:'); const state = db.read();
  const seller = newUser('seller@example.test',{ pseudo: 'Vendeur',commune:'Saint-Denis',majeur:true });
  const buyer = newUser('buyer@example.test',{ pseudo: 'Acheteur',commune:'Saint-Pierre',majeur:true });
  const stranger = newUser('stranger@example.test',{ pseudo:'Tiers',commune:'Saint-Paul',majeur:true });
  state.utilisateurs.push(seller,buyer,stranger);
  const listingId = command(state,seller.id,'publierAnnonce',[{ titre:'Robe en lin',description:'Très bon état', photos:['https://liked.test/media/photo.webp'], universe:'femme',categorie:'femme-robes',taille:'38',marque:'Zara',couleur:'Bleu',etat:'tres_bon',prixCents:1800,gabarit:'moyen',accepteMainPropre:true,communeRemise:'Saint-Denis',accepteEnvoi:true }]) as string;
  const conversationId = command(state,buyer.id,'ouvrirConversation',[listingId]) as string;
  db.sql.prepare('UPDATE marketplace SET data=? WHERE id=1').run(JSON.stringify(state));
  db.sql.prepare('INSERT INTO accounts VALUES (?,?)').run(seller.id,'acct_test');
  let transfers = 0; let refunds = 0; let refundStatus = 'succeeded'; let amount = 1970;
  let checkoutInput: Stripe.Checkout.SessionCreateParams | undefined;
  const stripe = {
    accounts: { retrieve: async () => ({ capabilities:{transfers:'active'}, details_submitted:true }) },
    checkout: { sessions: { create: async (params: Stripe.Checkout.SessionCreateParams) => { checkoutInput = params; return { id:'cs_test',url:'https://checkout.stripe.com/test' }; } } },
    paymentIntents: { retrieve: async () => ({ id:'pi_test',status:'succeeded',amount_received:amount,currency:'eur',latest_charge:'ch_test' }) },
    refunds: { create: async () => { refunds++; return {id:'re_test',status:refundStatus}; }, retrieve: async () => ({id:'re_test',status:refundStatus,payment_intent:'pi_test',currency:'eur',amount}) },
    transfers: { create: async () => { transfers++; return { id:'tr_test' }; } },
  } as unknown as Stripe;
  const pay = () => db.run(s => checkout(db,s,buyer.id,{annonceId:listingId,mode:'main_propre'},stripe,'https://api.liked.test'));
  const paidEvent = (orderId: string,extra = {}) => ({ id:'evt_paid',type:'checkout.session.completed',data:{object:{id:'cs_test',metadata:{orderId},client_reference_id:orderId,payment_status:'paid',currency:'eur',amount_total:1970,payment_intent:'pi_test',...extra}} }) as unknown as Stripe.Event;
  return { db,state,seller,buyer,stranger,listingId,conversationId,stripe,pay,paidEvent,transfers:()=>transfers,checkoutInput:()=>checkoutInput,refunds:()=>refunds,setRefundStatus:(v:string)=>{refundStatus=v;},setAmount:(v:number)=>{amount=v;} };
}

test('frais en centimes : main propre 19,70 €, envoi 25,20 €',() => {
  assert.equal(calculerPanier(1800,'main_propre','moyen').totalCents,1970);
  assert.equal(calculerPanier(1800,'colissimo','moyen').totalCents,2520);
  assert.equal(calculerPanier(1,'main_propre','petit').fraisProtectionCents,80);
});
test('le filtre détecte téléphones et e-mails quand il est actif',() => {
  const raw = 'Contacte moi au 0692 12 34 56 ou moi@example.com';
  const filtered = filtrerCoordonnees(raw,true); assert.equal(filtered.filtre,true); assert.ok(!filtered.texte.includes('0692')); assert.ok(!filtered.texte.includes('@'));
  assert.equal(filtrerCoordonnees(raw,false).texte,raw);
});
test('les visiteurs ne reçoivent pas les données privées ni les conversations',() => {
  const f=fixture(); const data=snapshot(f.state,null);
  assert.equal(data.messages.length,0); assert.equal(data.conversations.length,0);
  assert.ok(!JSON.stringify(data).includes('seller@example.test'));
  assert.ok(!('dac7' in data.utilisateurs[0])); assert.ok(!('soldePortefeuilleCents' in data.utilisateurs[0]));
});
test('un membre ne peut pas usurper le rôle admin ni changer son solde',() => {
  const f=fixture(); command(f.state,f.buyer.id,'majProfil',[{role:'admin',soldePortefeuilleCents:999999,pseudo:'Nouveau'}]);
  assert.equal(f.buyer.role,'membre'); assert.equal(f.buyer.soldePortefeuilleCents,0);
  assert.throws(()=>command(f.state,f.buyer.id,'modererAnnonce',[f.listingId,'masquer','abus']),HttpError);
});
test('un tiers ne peut pas lire ou écrire dans une conversation',() => {
  const f=fixture(); command(f.state,f.buyer.id,'envoyerMessage',[f.conversationId,'Bonjour']);
  assert.throws(()=>command(f.state,f.stranger.id,'envoyerMessage',[f.conversationId,'intrusion']),HttpError);
  assert.equal(snapshot(f.state,f.stranger.id).messages.length,0);
});
test('la majorité est requise pour publier, et les prix invalides sont refusés',() => {
  const f=fixture(); f.seller.majeur=false;
  assert.throws(()=>command(f.state,f.seller.id,'publierAnnonce',[f.state.annonces[0]]));
  f.seller.majeur=true;
  assert.throws(()=>command(f.state,f.seller.id,'modifierAnnonce',[f.listingId,{prixCents:-1}]));
});
test('les offres ne peuvent être acceptées que par le vendeur',() => {
  const f=fixture(); command(f.state,f.buyer.id,'faireOffre',[f.conversationId,1500]);
  const message=f.state.messages.at(-1)!;
  assert.throws(()=>command(f.state,f.buyer.id,'repondreOffre',[message.id,'acceptee']));
  command(f.state,f.seller.id,'repondreOffre',[message.id,'acceptee']); assert.equal(message.offre?.statut,'acceptee');
});
test('le serveur recalcule le prix et réserve un article une seule fois',async () => {
  const f=fixture(); const results=await Promise.allSettled([f.pay(),f.pay()]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(f.db.read().commandes.length,1); assert.equal(f.db.read().commandes[0].totalCents,1970);
  assert.equal(f.checkoutInput()?.line_items?.[1].price_data?.unit_amount,170);
});
test('un prix négocié injecté sans offre acceptée est refusé',async () => {
  const f=fixture(); await assert.rejects(f.db.run(s=>checkout(f.db,s,f.buyer.id,{annonceId:f.listingId,mode:'main_propre',prixNegocieCents:1},f.stripe,'https://api.test')));
  assert.equal(f.db.read().commandes.length,0);
});
test('retour Checkout ≠ paiement : le webhook valide le montant puis crée le code',async () => {
  const f=fixture(); const result=await f.pay(); assert.equal(f.db.read().commandes[0].codeRemise,undefined);
  await assert.rejects(f.db.run(s=>webhook(f.db,s,f.paidEvent(result.commandeId,{amount_total:1}),f.stripe)));
  assert.equal(f.db.read().commandes[0].statut,'paiement_en_attente');
  await f.db.run(s=>webhook(f.db,s,f.paidEvent(result.commandeId),f.stripe));
  assert.match(f.db.read().commandes[0].codeRemise!,/^\d{4}$/);
  assert.equal(snapshot(f.db.read(),f.seller.id).commandes[0].codeRemise,undefined);
  assert.equal(snapshot(f.db.read(),f.stranger.id).commandes.length,0);
});
test('le rejeu du webhook conserve le code et ne duplique pas les notifications',async () => {
  const f=fixture(); const result=await f.pay(); const evt=f.paidEvent(result.commandeId);
  await f.db.run(s=>webhook(f.db,s,evt,f.stripe)); const first=f.db.read();
  await f.db.run(s=>webhook(f.db,s,evt,f.stripe)); assert.deepEqual(f.db.read(),first);
});
test('seul le vendeur peut valider une remise, un seul transfert est créé',async () => {
  const f=fixture(); const result=await f.pay(); await f.db.run(s=>webhook(f.db,s,f.paidEvent(result.commandeId),f.stripe));
  const code=f.db.read().commandes[0].codeRemise!;
  await assert.rejects(f.db.run(s=>handover(f.db,s,f.buyer.id,result.commandeId,code,f.stripe)));
  const results=await Promise.allSettled([1,2].map(()=>f.db.run(s=>handover(f.db,s,f.seller.id,result.commandeId,code,f.stripe))));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1); assert.equal(f.transfers(),1);
  assert.equal(f.db.read().commandes[0].statut,'finalisee');
});
test('cinq codes erronés bloquent la remise et sont persistés',async () => {
  const f=fixture(); const result=await f.pay(); await f.db.run(s=>webhook(f.db,s,f.paidEvent(result.commandeId),f.stripe));
  for(let i=0;i<5;i++) await f.db.run(s=>handover(f.db,s,f.seller.id,result.commandeId,'xxxx',f.stripe));
  const last=await f.db.run(s=>handover(f.db,s,f.seller.id,result.commandeId,s.commandes[0].codeRemise!,f.stripe));
  assert.equal(last.ok,false); assert.equal(f.transfers(),0);
});
test('un litige suspend le transfert et un tiers ne peut pas l’ouvrir',async () => {
  const f=fixture(); const result=await f.pay(); await f.db.run(s=>webhook(f.db,s,f.paidEvent(result.commandeId),f.stripe));
  await assert.rejects(f.db.run(s=>command(s,f.stranger.id,'ouvrirLitige',[result.commandeId,'non_conforme','Problème',[]])));
  await f.db.run(s=>command(s,f.buyer.id,'ouvrirLitige',[result.commandeId,'non_conforme','Problème',[]]));
  await assert.rejects(f.db.run(s=>handover(f.db,s,f.seller.id,result.commandeId,'1234',f.stripe))); assert.equal(f.transfers(),0);
});
test('une évaluation exige une transaction terminée et ne peut être dupliquée',async () => {
  const f=fixture(); const result=await f.pay();
  await assert.rejects(f.db.run(s=>command(s,f.buyer.id,'evaluer',[result.commandeId,5,'Super'])));
  await f.db.run(s=>webhook(f.db,s,f.paidEvent(result.commandeId),f.stripe));
  await f.db.run(s=>handover(f.db,s,f.seller.id,result.commandeId,s.commandes[0].codeRemise!,f.stripe));
  await f.db.run(s=>command(s,f.buyer.id,'evaluer',[result.commandeId,5,'Super']));
  await assert.rejects(f.db.run(s=>command(s,f.buyer.id,'evaluer',[result.commandeId,5,'Encore'])));
});

test('les prix négatifs, ambigus et non finis sont refusés',() => {
  assert.equal(parseEuros('-12'),null); assert.equal(parseEuros('1,2,3'),null);
  assert.equal(parseEuros('Infinity'),null); assert.equal(parseEuros('12,50 €'),1250);
  assert.equal(parseEuros('12.345'),null);
});


test('le remboursement intégral est idempotent et interdit aux tiers',async()=>{
  const f=fixture();const {commandeId:id}=await f.pay();await f.db.run(s=>webhook(f.db,s,f.paidEvent(id),f.stripe));
  await assert.rejects(f.db.run(s=>refundOrder(f.db,s,f.stranger.id,id,f.stripe)));
  await Promise.all([1,2].map(()=>f.db.run(s=>refundOrder(f.db,s,f.buyer.id,id,f.stripe))));
  assert.equal(f.refunds(),1);assert.equal(f.db.read().commandes[0].statut,'remboursee');
  assert.equal(f.db.read().annonces[0].statut,'en_ligne');
  assert.equal(f.db.sql.prepare('SELECT count(*) as n FROM email_outbox').get()!.n,4);
});
test('un remboursement en attente bloque remise et revente puis se réconcilie',async()=>{
  const f=fixture();const {commandeId:id}=await f.pay();await f.db.run(s=>webhook(f.db,s,f.paidEvent(id),f.stripe));
  f.setRefundStatus('pending');await f.db.run(s=>refundOrder(f.db,s,f.buyer.id,id,f.stripe));
  assert.equal(f.db.read().commandes[0].statut,'remboursement_en_cours');assert.equal(f.db.read().annonces[0].statut,'reservee');
  await assert.rejects(f.db.run(s=>handover(f.db,s,f.seller.id,id,'0000',f.stripe)));
  f.setRefundStatus('succeeded');await settleDueOrders(f.db,f.stripe);
  assert.equal(f.db.read().commandes[0].statut,'remboursee');assert.equal(f.refunds(),1);
});
test('un remboursement échoué reste bloqué sans faux e-mail de réussite',async()=>{
  const f=fixture();const {commandeId:id}=await f.pay();await f.db.run(s=>webhook(f.db,s,f.paidEvent(id),f.stripe));
  f.setRefundStatus('failed');await f.db.run(s=>refundOrder(f.db,s,f.seller.id,id,f.stripe));
  assert.equal(f.db.read().commandes[0].statut,'remboursement_en_cours');
  assert.equal(f.db.sql.prepare('SELECT count(*) as n FROM email_outbox').get()!.n,2);
});
test('livraison simulée : droits, ordre des étapes, gel du litige et versement',async()=>{
  process.env.SHIPPING_DRIVER='simulated';const f=fixture();f.setAmount(2520);
  const {commandeId:id}=await f.db.run(s=>checkout(f.db,s,f.buyer.id,{annonceId:f.listingId,mode:'colissimo',adresse:{nomComplet:'Test Acheteur',ligne1:'12 rue de Test',codePostal:'97410',ville:'Saint-Pierre',telephone:'0692000000'}},f.stripe,'https://api.test'));
  await f.db.run(s=>webhook(f.db,s,f.paidEvent(id,{amount_total:2520}),f.stripe));
  assert.equal(f.db.read().commandes[0].codeRemise,undefined);
  await assert.rejects(f.db.run(s=>shipping(f.db,s,f.buyer.id,id,'label')));
  await assert.rejects(f.db.run(s=>shipping(f.db,s,f.seller.id,id,'deliver')));
  for(const action of ['label','ship','deliver']) await f.db.run(s=>shipping(f.db,s,f.seller.id,id,action));
  await assert.rejects(f.db.run(s=>refundOrder(f.db,s,f.buyer.id,id,f.stripe)));
  await assert.rejects(f.db.run(s=>shipping(f.db,s,f.seller.id,id,'receive',f.stripe)));
  await f.db.run(s=>shipping(f.db,s,f.buyer.id,id,'receive',f.stripe));
  assert.equal(f.transfers(),1);assert.equal(f.db.read().commandes[0].statut,'finalisee');
  assert.equal(f.db.sql.prepare('SELECT count(*) as n FROM email_outbox').get()!.n,8);
  delete process.env.SHIPPING_DRIVER;
});
test('les e-mails échoués sont conservés puis envoyés une seule fois après succès',async()=>{
  const f=fixture();const {commandeId:id}=await f.pay();await f.db.run(s=>webhook(f.db,s,f.paidEvent(id),f.stripe));
  await flushEmails(f.db,async()=>{throw new Error('Brevo unavailable');});
  assert.equal(f.db.read().commandes[0].statut,'sequestre');
  assert.equal(f.db.sql.prepare('SELECT attempts FROM email_outbox LIMIT 1').get()!.attempts,1);
  f.db.sql.prepare('UPDATE email_outbox SET next_attempt=0').run();let count=0;
  await flushEmails(f.db,async message=>{assert.match(message.subject,/TEST/);count++;});
  await flushEmails(f.db,async()=>{count++;});assert.equal(count,2);
});
test('les modèles HTML échappent les titres non fiables',async()=>{
  const f=fixture();await f.pay();const mail=orderEmail(f.db.read().commandes[0],'<img src=x onerror=alert(1)>','achat',false);
  assert.ok(!mail.htmlContent.includes('<img'));assert.match(mail.htmlContent,/&lt;img/);
});

test('le worker attend 48 h et ne verse jamais une commande en litige',async()=>{
  const f=fixture();const {commandeId:id}=await f.pay();await f.db.run(s=>webhook(f.db,s,f.paidEvent(id),f.stripe));
  await f.db.run(s=>{const c=s.commandes[0];c.mode='colissimo';c.statut='livre';c.liberableLe=new Date(Date.now()+3600_000).toISOString();});
  await settleDueOrders(f.db,f.stripe);assert.equal(f.transfers(),0);
  await f.db.run(s=>{s.commandes[0].liberableLe=new Date(Date.now()-1).toISOString();s.commandes[0].litigeId='litige-test';});
  await settleDueOrders(f.db,f.stripe);assert.equal(f.transfers(),0);
  await f.db.run(s=>{s.commandes[0].litigeId=undefined;});
  await settleDueOrders(f.db,f.stripe);await settleDueOrders(f.db,f.stripe);assert.equal(f.transfers(),1);
});
test('une livraison sans activation explicite ou avec code postal hors Réunion est refusée',async()=>{
  const f=fixture();const input={annonceId:f.listingId,mode:'colissimo',adresse:{nomComplet:'Test Acheteur',ligne1:'12 rue de Test',codePostal:'75001',ville:'Paris',telephone:'0600000000'}};
  process.env.SHIPPING_DRIVER='simulated';await assert.rejects(f.db.run(s=>checkout(f.db,s,f.buyer.id,input,f.stripe,'https://api.test')));
  delete process.env.SHIPPING_DRIVER;input.adresse.codePostal='97410';await assert.rejects(f.db.run(s=>checkout(f.db,s,f.buyer.id,input,f.stripe,'https://api.test')));
  assert.equal(f.db.read().commandes.length,0);
});

test('coordonnées : masquées après paiement et dans les anciens messages renvoyés par API',()=>{
  const f=fixture();const c=f.state.conversations.find(c=>c.id===f.conversationId)!;c.filtrageLeve=true;
  command(f.state,f.buyer.id,'envoyerMessage',[c.id,'Écris à test@example.com ou au 06 92 12 34 56']);
  assert.equal(f.state.messages.at(-1)!.filtre,true);
  assert.ok(!f.state.messages.at(-1)!.texte.includes('example.com'));
  f.state.messages.push({id:'legacy',conversationId:c.id,auteurId:f.seller.id,texte:'https://wa.me/33612345678',envoyeLe:new Date().toISOString(),filtre:false});
  const data=snapshot(f.state,f.buyer.id);
  assert.equal(data.messages.find(m=>m.id==='legacy')!.texte,'•••');
  assert.equal(data.conversations[0].filtrageLeve,false);
});
test('coordonnées : e-mails obfusqués, liens, réseaux, téléphones dictés et caractères invisibles',()=>{
  for(const input of ['test (arobase) exemple point fr','test [at] exemple [dot] com','contacte-moi sur https://t.me/exemple','wa.me/33612345678','instagram: mon_compte','@pseudo_test','+33 (0)6 12 34 56 78','zéro six neuf deux un deux trois quatre cinq six','０６９２１２３４５６','test@exa\u200bmple.com']) assert.equal(filtrerCoordonnees(input,true).filtre,true,input);
  for(const input of ['Rendez-vous demain à 14 h place de la mairie.','La robe coûte 28,50 € et la taille est 38.','Commande LK-45E3E64B','Trois boutons et deux poches.']) assert.equal(filtrerCoordonnees(input,true).texte,input);
});
