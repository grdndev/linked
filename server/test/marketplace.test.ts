import { test } from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import { Database } from '../src/database';
import { command, newUser } from '../src/domain';
import { snapshot, HttpError } from '../src/security';
import { checkout, handover, webhook } from '../src/payments';
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
  let transfers = 0;
  let checkoutInput: Stripe.Checkout.SessionCreateParams | undefined;
  const stripe = {
    accounts: { retrieve: async () => ({ capabilities:{transfers:'active'}, details_submitted:true }) },
    checkout: { sessions: { create: async (params: Stripe.Checkout.SessionCreateParams) => { checkoutInput = params; return { id:'cs_test',url:'https://checkout.stripe.com/test' }; } } },
    paymentIntents: { retrieve: async () => ({ id:'pi_test',status:'succeeded',amount_received:1970,currency:'eur',latest_charge:'ch_test' }) },
    transfers: { create: async () => { transfers++; return { id:'tr_test' }; } },
  } as unknown as Stripe;
  const pay = () => db.run(s => checkout(db,s,buyer.id,{annonceId:listingId,mode:'main_propre'},stripe,'https://api.liked.test'));
  const paidEvent = (orderId: string,extra = {}) => ({ id:'evt_paid',type:'checkout.session.completed',data:{object:{id:'cs_test',metadata:{orderId},client_reference_id:orderId,payment_status:'paid',currency:'eur',amount_total:1970,payment_intent:'pi_test',...extra}} }) as unknown as Stripe.Event;
  return { db,state,seller,buyer,stranger,listingId,conversationId,stripe,pay,paidEvent,transfers:()=>transfers,checkoutInput:()=>checkoutInput };
}

test('frais en centimes : main propre 19,70 €, envoi 25,20 €',() => {
  assert.equal(calculerPanier(1800,'main_propre','moyen').totalCents,1970);
  assert.equal(calculerPanier(1800,'colissimo','moyen').totalCents,2520);
  assert.equal(calculerPanier(1,'main_propre','petit').fraisProtectionCents,80);
});
test('le filtrage masque les coordonnées uniquement avant paiement',() => {
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
