import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import type {AddressInfo} from 'node:net';
import type Stripe from 'stripe';
import {Database} from '../src/database';
import {createApp} from '../src/app';
import {newUser} from '../src/domain';
import {checkout,webhook} from '../src/payments';
import {publicPurchasesReady,validateCommerceEnvironment} from '../src/commerce';
import {orderEmail} from '../../src/lib/orderEmail';
import {ANNONCES_SEED} from '../../src/data/seed';
function env(t:TestContext,values:Record<string,string|undefined>){for(const [k,v] of Object.entries(values)){const prev=process.env[k];if(v===undefined)delete process.env[k];else process.env[k]=v;t.after(()=>{if(prev===undefined)delete process.env[k];else process.env[k]=prev;});}}
function fixture(t:TestContext){const db=new Database(':memory:');t.after(()=>db.sql.close());const s=db.read();const seller=newUser('seller@example.test',{pseudo:'Vendeur',commune:'Saint-Denis',majeur:true});const buyer=newUser('buyer@example.test',{pseudo:'Acheteur',commune:'Saint-Paul',majeur:true});s.utilisateurs.push(seller,buyer);s.annonces=[{...ANNONCES_SEED[0],id:'article',vendeurId:seller.id,accepteMainPropre:true}];db.sql.prepare('UPDATE marketplace SET data=? WHERE id=1').run(JSON.stringify(s));return {db,s,seller,buyer};}
const live={PAYMENTS_MODE:'live',PUBLIC_PAYMENTS_ENABLED:'true',STRIPE_SECRET_KEY:'sk_live_fixture_not_a_key',STRIPE_WEBHOOK_SECRET:'whsec_fixture_not_a_key',PUBLIC_API_URL:'https://api.example.test',WEB_ORIGIN:'https://shop.example.test',APP_RETURN_URL:'https://shop.example.test/mes-achats',BETA_ALLOWED_EMAILS:undefined,BETA_SELLER_STRIPE_ID:undefined,SHIPPING_DRIVER:'disabled'};
test('production : configuration explicite, adresse permanente et séparation de la base',t=>{
 env(t,{...live,PAYMENTS_MODE:'test'});const {db}=fixture(t);assert.equal(publicPurchasesReady(),false);validateCommerceEnvironment(db);
 process.env.PAYMENTS_MODE='live';assert.equal(publicPurchasesReady(),true);assert.throws(()=>validateCommerceEnvironment(db),/base de paiement/);
 const fresh=new Database(':memory:');t.after(()=>fresh.sql.close());process.env.PUBLIC_API_URL='https://temporary.trycloudflare.com';assert.throws(()=>validateCommerceEnvironment(fresh),/permanente/);process.env.PUBLIC_API_URL=live.PUBLIC_API_URL;validateCommerceEnvironment(fresh);assert.equal(fresh.sql.prepare('SELECT value FROM runtime_metadata').get()!.value,'live');
});
test('production : impossible de recycler des comptes Stripe ou annonces de démonstration',t=>{
 env(t,live);const {db}=fixture(t);db.sql.prepare('INSERT INTO accounts VALUES (?,?)').run('seller','acct_test');assert.throws(()=>validateCommerceEnvironment(db),/migration/);db.sql.prepare('DELETE FROM accounts').run();const s=db.read();s.annonces[0].vendeurId='liked-beta-seller';db.sql.prepare('UPDATE marketplace SET data=? WHERE id=1').run(JSON.stringify(s));assert.throws(()=>validateCommerceEnvironment(db),/démonstration/);
});
test('boutique : le mode test ne peut pas facturer un acheteur web',async t=>{
 env(t,{PAYMENTS_MODE:'test'});const {db,buyer}=fixture(t);await assert.rejects(db.run(s=>checkout(db,s,buyer.id,{annonceId:'article',mode:'main_propre',surface:'web',returnUrl:'https://evil.test'},{} as Stripe,'')),/pas encore ouverts/);
});
test('boutique : prix serveur et retour web sans redirection libre',async t=>{
 env(t,live);const {db,buyer,seller}=fixture(t);db.sql.prepare('INSERT INTO accounts VALUES (?,?)').run(seller.id,'acct_live_fixture');let sent:any;
 const stripe={accounts:{retrieve:async()=>({details_submitted:true,capabilities:{transfers:'active'}})},checkout:{sessions:{create:async(d:any)=>{sent=d;return {id:'cs_fixture',url:'https://checkout.stripe.com/c/pay/fixture'};}}}} as unknown as Stripe;
 const result=await db.run(s=>checkout(db,s,buyer.id,{annonceId:'article',mode:'main_propre',surface:'web',amount:1,returnUrl:'https://evil.test'},stripe,'https://api.example.test'));
 assert.equal(sent.success_url,'https://api.example.test/payment-return?surface=web');assert.equal(sent.line_items[0].price_data.unit_amount,2800);assert.equal(db.read().commandes[0].statut,'paiement_en_attente');assert.equal(db.read().commandes[0].id,result.commandeId);
});
test('production : webhook du mauvais environnement refusé et e-mails cohérents',async t=>{
 env(t,live);const {db}=fixture(t);await assert.rejects(db.run(s=>webhook(db,s,{id:'evt_wrong',type:'checkout.session.completed',livemode:false} as Stripe.Event,{} as Stripe)),/environnement/);
 const c={reference:'LK-EXAMPLE',totalCents:3020,prixArticleCents:2800,mode:'main_propre'} as any;const mail=orderEmail(c,'Robe','achat',false,true);assert.ok(!mail.subject.includes('[TEST]'));assert.ok(!mail.textContent.includes('de test'));assert.ok(!mail.htmlContent.includes('Aucun mouvement'));
});
test('catalogue public : annonces visibles seulement, aucune donnée privée et retour sécurisé',async t=>{
 env(t,{PAYMENTS_MODE:'test'});const {db}=fixture(t);await db.run(s=>{s.annonces.push({...s.annonces[0],id:'hidden',statut:'masquee'});});
 const dir=mkdtempSync(tmpdir()+'/liked-shop-');const app=createApp(db,{secret:'s'.repeat(64),apiUrl:'http://localhost',returnUrl:'https://shop.example.test/mes-achats',webOrigin:'https://shop.example.test',uploadDir:dir});const server=app.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',r));t.after(()=>{server.close();rmSync(dir,{recursive:true,force:true});});const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 const data=await(await fetch(base+'/catalogue')).json();assert.equal(data.annonces.length,1);assert.equal(data.vendeurs.length,1);assert.ok(!JSON.stringify(data).includes('@'));assert.equal(data.achatsDisponibles,false);assert.ok(!('commandes' in data));
 const response=await fetch(base+'/payment-return?surface=web&returnUrl=https://evil.test',{redirect:'manual'});assert.equal(response.headers.get('location'),'https://shop.example.test/boutique/?page=compte');assert.equal((await fetch(base+'/orders/anything/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);
});
