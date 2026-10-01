import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type Stripe from 'stripe';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { AddressInfo } from 'node:net';
import { Database } from '../src/database';
import { adminAction, adminOverview } from '../src/admin';
import { newUser, command } from '../src/domain';
import { snapshot } from '../src/security';
import { checkout, reconcileRefund } from '../src/payments';
import { boostCheckout } from '../src/boosts';
import { createApp } from '../src/app';
import { REGLAGES_DEFAUT as defaults } from '../../src/lib/reglages';
import { ANNONCES_SEED } from '../../src/data/seed';
function setup(t:TestContext){
 const db=new Database(':memory:');t.after(()=>db.sql.close());const s=db.read();
 const admin={...newUser('admin@example.test',{pseudo:'Admin',commune:'Saint-Denis',majeur:true}),role:'admin' as const};
 const buyer=newUser('buyer@example.test',{pseudo:'Acheteur',commune:'Saint-Pierre',majeur:true});const seller=newUser('seller@example.test',{pseudo:'Vendeur',commune:'Saint-Paul',majeur:true});s.utilisateurs.push(admin,buyer,seller);
 const listing={...ANNONCES_SEED[0],id:'listing',vendeurId:seller.id,statut:'en_ligne' as const,prixCents:1000,accepteEnvoi:true,accepteMainPropre:true};s.annonces.push(listing);
 db.sql.prepare('UPDATE marketplace SET data=? WHERE id=1').run(JSON.stringify(s));db.sql.prepare('INSERT INTO accounts VALUES (?,?)').run(seller.id,'acct_test');
 let calls=0,transfers=0,price=0;let refundStatus='succeeded';
 const stripe={accounts:{retrieve:async()=>({capabilities:{transfers:'active'},details_submitted:true})},checkout:{sessions:{create:async(d:any)=>{calls++;price=d.line_items[0].price_data.unit_amount;return {id:'cs_test',url:'https://checkout.stripe.com/test'};},retrieve:async()=>({status:'open',url:'https://checkout.stripe.com/test'})}},refunds:{create:async()=>({id:'re_test',status:refundStatus}),retrieve:async()=>({id:'re_test',status:refundStatus,payment_intent:'pi_test',amount:1130,currency:'eur'})},transfers:{create:async()=>{transfers++;return {id:'tr_test'};}}} as unknown as Stripe;
 const act=(body:unknown,actor=admin.id)=>db.run(s=>adminAction(db,s,actor,body,stripe));
 const order=async(dispute=false)=>db.run(s=>{s.commandes.push({id:'order',reference:'LK-TEST',annonceId:listing.id,acheteurId:buyer.id,vendeurId:seller.id,mode:'main_propre',prixArticleCents:1000,fraisProtectionCents:130,fraisPortCents:0,margePortCents:0,totalCents:1130,statut:dispute?'litige':'sequestre',creeeLe:new Date().toISOString(),journal:[],evaluationAcheteurFaite:false,evaluationVendeurFaite:false,litigeId:dispute?'dispute':undefined});s.annonces[0].statut='reservee';db.sql.prepare('INSERT INTO payment_data(order_id,payment_intent,charge_id) VALUES (?,?,?)').run('order','pi_test','ch_test');if(dispute)s.litiges.push({id:'dispute',commandeId:'order',ouvertPar:buyer.id,motif:'non_recu',description:'Article non reçu',photos:[],statut:'ouvert',ouvertLe:new Date().toISOString(),messages:[]});});
 return {db,admin,buyer,seller,listing,stripe,act,order,calls:()=>calls,price:()=>price,transfers:()=>transfers,setRefund:(status:string)=>{refundStatus=status;}};
}
test('admin : accès privé et absence de secrets dans les réponses',t=>{
 const f=setup(t);assert.throws(()=>adminOverview(f.db,f.db.read(),null));assert.throws(()=>adminOverview(f.db,f.db.read(),f.buyer.id));
 const data=adminOverview(f.db,f.db.read(),f.admin.id);assert.equal(data.state.utilisateurs[1].email,f.buyer.email);assert.equal(data.reglages.colissimoActif,false);assert.ok(!JSON.stringify(data).includes('acct_test'));assert.ok(!JSON.stringify(snapshot(f.db.read(),f.buyer.id)).includes(f.seller.email));
});
test('admin : réglages persistants, pause achats/publications et validation des tarifs',async t=>{
 const f=setup(t);await assert.rejects(f.act({action:'settings',value:defaults},f.buyer.id));await assert.rejects(f.act({action:'settings',value:{...defaults,boost3Cents:-1}}));
 await f.act({action:'settings',value:{...defaults,achatsOuverts:false,publicationsOuvertes:false,boost3Cents:450}});
 assert.equal(snapshot(f.db.read(),null).reglages.boost3Cents,450);assert.equal(f.db.read().journalAdmin.length,1);
 await assert.rejects(f.db.run(s=>checkout(f.db,s,f.buyer.id,{annonceId:'listing',mode:'main_propre'},f.stripe,'')));assert.equal(f.calls(),0);assert.throws(()=>command(f.db.read(),f.seller.id,'publierAnnonce',[f.listing]));
});
test('admin : Colissimo off bloque les achats, activation contrôlée et suivi préservé',async t=>{
 const f=setup(t);const old=process.env.SHIPPING_DRIVER;t.after(()=>{if(old===undefined)delete process.env.SHIPPING_DRIVER;else process.env.SHIPPING_DRIVER=old;});
 const input={annonceId:'listing',mode:'colissimo',adresse:{nomComplet:'Acheteur Test',ligne1:'12 rue du test',codePostal:'97410',ville:'Saint-Pierre',telephone:'0692000000'}};
 process.env.SHIPPING_DRIVER='simulated';await assert.rejects(f.db.run(s=>checkout(f.db,s,f.buyer.id,input,f.stripe,'')));assert.equal(f.calls(),0);
 delete process.env.SHIPPING_DRIVER;await assert.rejects(f.act({action:'settings',value:{...defaults,colissimoActif:true}}));
 process.env.SHIPPING_DRIVER='simulated';await f.act({action:'settings',value:{...defaults,colissimoActif:true}});const result=await f.db.run(s=>checkout(f.db,s,f.buyer.id,input,f.stripe,''));assert.equal(f.calls(),1);
 await f.db.run(s=>{s.commandes[0].statut='sequestre';});await f.act({action:'settings',value:defaults});await f.act({action:'shipping',id:result.commandeId,value:'label'});assert.equal(f.db.read().commandes[0].statut,'etiquette_emise');
});
test('admin : modération et sanctions motivées sans bloquer son propre accès',async t=>{
 const f=setup(t);await f.act({action:'moderate',id:'listing',value:'masquer',reason:'Annonce non conforme'});assert.equal(f.db.read().annonces[0].statut,'masquee');await f.act({action:'moderate',id:'listing',value:'retablir',reason:'Correction vérifiée'});assert.equal(f.db.read().annonces[0].statut,'en_ligne');
 await f.act({action:'sanction',id:f.seller.id,value:'suspendu',reason:'Vérification en cours'});assert.equal(f.db.read().utilisateurs.find(u=>u.id===f.seller.id)!.statut,'suspendu');await assert.rejects(f.act({action:'sanction',id:f.admin.id,value:'banni',reason:'Tentative de blocage'}));await assert.rejects(f.act({action:'moderate',id:'listing',value:'masquer',reason:'court'}));assert.equal(f.db.read().journalAdmin.length,3);
});
test('admin : tarifs boost serveur et montant du paiement déjà ouvert conservé',async t=>{
 const f=setup(t);await f.act({action:'settings',value:{...defaults,boost3Cents:450}});await f.db.run(s=>boostCheckout(f.db,s,f.seller.id,{annonceId:'listing',plan:'3j',amount:1},f.stripe,''));assert.equal(f.price(),450);
 await f.act({action:'settings',value:{...defaults,boost3Cents:600}});await f.db.run(s=>boostCheckout(f.db,s,f.seller.id,{annonceId:'listing',plan:'3j'},f.stripe,''));assert.equal(f.calls(),1);assert.equal(f.db.sql.prepare('SELECT amount FROM boosts').get()!.amount,450);
 await f.act({action:'settings',value:{...defaults,boostsActifs:false}});await assert.rejects(f.db.run(s=>boostCheckout(f.db,s,f.seller.id,{annonceId:'listing',plan:'3j'},f.stripe,'')));
});
test('admin : remboursement confirmé, accès membre refusé',async t=>{
 const f=setup(t);await f.order();await assert.rejects(f.act({action:'refund',id:'order',reason:'Annulation de recette'},f.buyer.id));await f.act({action:'refund',id:'order',reason:'Annulation de recette'});assert.equal(f.db.read().commandes[0].statut,'remboursee');assert.equal(f.db.sql.prepare('SELECT count(*) AS n FROM email_outbox').get()!.n,2);
});
test('admin : litige ouvert jusqu’à confirmation Stripe, aucune décision contradictoire',async t=>{
 const f=setup(t);await f.order(true);f.setRefund('pending');await f.act({action:'support',id:'dispute',text:'Nous examinons votre demande.'});await f.act({action:'dispute',id:'dispute',value:'remboursement_total',reason:'Article déclaré non reçu'});assert.equal(f.db.read().litiges[0].statut,'en_examen');assert.equal(f.db.read().commandes[0].statut,'remboursement_en_cours');
 await assert.rejects(f.act({action:'dispute',id:'dispute',value:'versement_vendeur',reason:'Tentative contradictoire'}));f.setRefund('succeeded');await f.db.run(s=>reconcileRefund(f.db,s,'order',f.stripe));assert.equal(f.db.read().litiges[0].statut,'resolu');assert.equal(f.transfers(),0);
});
test('admin : versement de litige unique et traçable',async t=>{
 const f=setup(t);await f.order(true);await f.act({action:'dispute',id:'dispute',value:'versement_vendeur',reason:'Réception confirmée par le support'});assert.equal(f.db.read().commandes[0].statut,'finalisee');assert.equal(f.db.read().litiges[0].statut,'resolu');assert.equal(f.transfers(),1);await assert.rejects(f.act({action:'dispute',id:'dispute',value:'versement_vendeur',reason:'Rejeu de la décision'}));assert.equal(f.transfers(),1);
});
test('admin : relance des e-mails en échec seulement',async t=>{
 const f=setup(t);const insert=f.db.sql.prepare('INSERT INTO email_outbox(id,user_id,payload,attempts,next_attempt,sent_at) VALUES (?,?,?,?,?,?)');insert.run('failed',f.buyer.id,JSON.stringify({subject:'Test',to:f.buyer.email}),8,0,null);insert.run('sent',f.buyer.id,JSON.stringify({subject:'Test',to:f.buyer.email}),1,0,1);await assert.rejects(f.act({action:'email_retry',id:'sent'}));await f.act({action:'email_retry',id:'failed'});assert.equal(f.db.sql.prepare("SELECT attempts FROM email_outbox WHERE id='failed'").get()!.attempts,0);
});
test('admin HTTP : OTP normal, isolation des membres et options persistées',async t=>{
 const f=setup(t);const dir=mkdtempSync(tmpdir()+'/liked-admin-');let otp='';const app=createApp(f.db,{secret:'s'.repeat(64),apiUrl:'http://localhost',returnUrl:'liked://',webOrigin:'http://localhost',uploadDir:dir},async(_,v)=>{otp=v;});const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));t.after(()=>{server.close();rmSync(dir,{recursive:true,force:true});});const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 const post=(path:string,body:unknown,token?:string)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
 assert.equal((await fetch(base+'/admin/overview')).status,401);await post('/auth/code',{email:f.buyer.email});const member=await(await post('/auth/verify',{email:f.buyer.email,code:otp})).json();assert.equal((await fetch(base+'/admin/overview',{headers:{Authorization:`Bearer ${member.token}`}})).status,403);assert.equal((await post('/admin/action',{action:'settings',value:defaults},member.token)).status,403);
 await post('/auth/code',{email:f.admin.email});const login=await(await post('/auth/verify',{email:f.admin.email,code:otp})).json();assert.equal((await post('/admin/action',{action:'settings',value:{...defaults,boost7Cents:800}},login.token)).status,200);assert.equal((await(await fetch(base+'/state')).json()).reglages.boost7Cents,800);
});
test('admin : remboursement boost confirmé une seule fois, contrôle du montant Stripe',async t=>{
 const f=setup(t);let calls=0;let valid=false;let status='pending';
 const provider={refunds:{create:async()=>{calls++;return {id:'re_boost',payment_intent:'pi_boost',amount:valid?299:1,currency:'eur',status};}}} as unknown as Stripe;
 await f.db.run(s=>{s.annonces[0].boost={debut:'2026-10-01T00:00:00Z',fin:'2026-10-04T00:00:00Z'};f.db.sql.prepare('INSERT INTO boosts VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('boost','listing',f.seller.id,'3j',3,299,'cs_boost','https://checkout.stripe.com/test','pi_boost','active','2026-10-01T00:00:00Z','2026-10-04T00:00:00Z');});
 const act=()=>f.db.run(s=>adminAction(f.db,s,f.admin.id,{action:'boost_refund',id:'boost',reason:'Remboursement de recette'},provider));
 await assert.rejects(act());assert.equal(f.db.sql.prepare('SELECT status FROM boosts').get()!.status,'active');assert.equal(f.db.read().journalAdmin.length,0);
 valid=true;await act();assert.equal(f.db.sql.prepare('SELECT status FROM boosts').get()!.status,'refund_pending');assert.ok(f.db.read().annonces[0].boost);
 status='succeeded';await act();assert.equal(f.db.sql.prepare('SELECT status FROM boosts').get()!.status,'refunded');assert.equal(f.db.read().annonces[0].boost,undefined);await act();assert.equal(calls,3);assert.equal(f.db.sql.prepare('SELECT count(*) AS n FROM email_outbox').get()!.n,1);
});
