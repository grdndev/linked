import { test } from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import type { Annonce } from '../../src/types';
import { Database } from '../src/database';
import { newUser, command } from '../src/domain';
import { ANNONCES_SEED } from '../../src/data/seed';
import { boostCheckout, ownBoosts, expireBoosts } from '../src/boosts';
import { webhook } from '../src/payments';
import { boostActif } from '../../src/lib/boost';
function fixture(t:any){
 const db=new Database(':memory:');t.after(()=>db.sql.close());const s=db.read();const u=newUser('seller@example.test',{pseudo:'Vendeur',commune:'Saint-Denis',majeur:true});s.utilisateurs.push(u);const a:Annonce={...ANNONCES_SEED[0],id:'listing',vendeurId:u.id,statut:'en_ligne' as const};s.annonces.push(a);
 let created=0;let payment:any;let request:any;let refundCount=0;
 const stripe={checkout:{sessions:{create:async(x:any)=>{request=x;created++;return {id:'cs_boost',url:'https://checkout.stripe.com/test'};},retrieve:async()=>({status:'open',url:'https://checkout.stripe.com/test'})}},paymentIntents:{retrieve:async()=>payment},refunds:{create:async()=>{refundCount++;return {id:'re_test',status:'succeeded'};},retrieve:async()=>({status:'succeeded',amount:299,currency:'eur',payment_intent:'pi_boost'})}} as unknown as Stripe;
 const buy=async()=>{const result=await boostCheckout(db,s,u.id,{annonceId:a.id,plan:'3j',amount:1},stripe,'https://api.example.test');payment={id:'pi_boost',status:'succeeded',amount_received:299,currency:'eur',livemode:false,metadata:{boostId:result.boostId}};return {id:'evt_boost',type:'checkout.session.completed',data:{object:{id:'cs_boost',client_reference_id:result.boostId,metadata:{boostId:result.boostId},payment_status:'paid',amount_total:299,currency:'eur',livemode:false,payment_intent:'pi_boost'}}} as unknown as Stripe.Event;};
 return {db,s,u,a,stripe,buy,created:()=>created,refundCount:()=>refundCount,request:()=>request};
}
test('boost : propriétaire uniquement, prix serveur, refus des articles indisponibles et réutilisation Checkout',async t=>{
 const f=fixture(t);const other=newUser('other@example.test',{pseudo:'Autre',commune:'Saint-Denis',majeur:true});f.s.utilisateurs.push(other);
 await assert.rejects(()=>boostCheckout(f.db,f.s,other.id,{annonceId:f.a.id,plan:'3j'},f.stripe,''));
 assert.throws(()=>ownBoosts(f.db,f.s,other.id,f.a.id));
 const event=await f.buy();assert.equal(f.request().line_items[0].price_data.unit_amount,299);assert.equal(f.a.boost,undefined);
 await boostCheckout(f.db,f.s,f.u.id,{annonceId:f.a.id,plan:'3j'},f.stripe,'');assert.equal(f.created(),1);
 await assert.rejects(()=>boostCheckout(f.db,f.s,f.u.id,{annonceId:f.a.id,plan:'7j'},f.stripe,''));
 await webhook(f.db,f.s,event,f.stripe);await assert.rejects(()=>boostCheckout(f.db,f.s,f.u.id,{annonceId:f.a.id,plan:'3j'},f.stripe,''));
});
test('boost : un webhook valide active une seule fois, expiration sans redémarrage et e-mails uniques',async t=>{
 const f=fixture(t);const event=await f.buy();await webhook(f.db,f.s,event,f.stripe);const start=f.a.boost!.debut;
 await webhook(f.db,f.s,{...event,id:'evt_duplicate'},f.stripe);assert.equal(f.a.boost!.debut,start);assert.equal(boostActif(f.a),true);
 assert.equal(f.db.sql.prepare('select count(*) as n from email_outbox').get()!.n,1);
 const end=Date.parse(f.a.boost!.fin);assert.equal(end-Date.parse(start),3*86400000);assert.equal(boostActif(f.a,end),false);
 expireBoosts(f.db,f.s,end);expireBoosts(f.db,f.s,end);assert.equal(f.db.sql.prepare('select status from boosts').get()!.status,'expired');assert.equal(f.db.sql.prepare('select count(*) as n from email_outbox').get()!.n,2);
});
test('boost : montant falsifié, absence de paiement et champs injectés n’activent rien',async t=>{
 const f=fixture(t);const event=await f.buy();const session=event.data.object as Stripe.Checkout.Session;
 session.amount_total=1;await assert.rejects(()=>webhook(f.db,f.s,event,f.stripe));session.amount_total=299;session.payment_status='unpaid';await assert.rejects(()=>webhook(f.db,f.s,event,f.stripe));assert.equal(f.a.boost,undefined);
 command(f.s,f.u.id,'modifierAnnonce',[f.a.id,{boost:{debut:new Date().toISOString(),fin:'2099-01-01'}}]);assert.equal(f.a.boost,undefined);
});
test('boost : article retiré pendant Checkout remboursé sans mise en avant',async t=>{
 const f=fixture(t);const event=await f.buy();f.a.statut='vendue' as any;await webhook(f.db,f.s,event,f.stripe);assert.equal(f.refundCount(),1);assert.equal(f.a.boost,undefined);assert.equal(f.db.sql.prepare('select status from boosts').get()!.status,'refunded');
});
test('boost : remboursement confirmé retire le badge, article réservé jamais sponsorisé',async t=>{
 const f=fixture(t);const event=await f.buy();await webhook(f.db,f.s,event,f.stripe);f.a.statut='reservee' as any;assert.equal(boostActif(f.a),false);
 await webhook(f.db,f.s,{id:'evt_refund',type:'refund.updated',data:{object:{id:'re_test',payment_intent:'pi_boost'}}} as unknown as Stripe.Event,f.stripe);assert.equal(f.a.boost,undefined);assert.equal(f.db.sql.prepare('select status from boosts').get()!.status,'refunded');
});
