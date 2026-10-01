// Local visual QA only: memory database, fictional records, no provider credentials.
import express from 'express';
import { Database } from '../src/database';
import { createApp } from '../src/app';
import { newUser } from '../src/domain';
import { ANNONCES_SEED } from '../../src/data/seed';
import { resolve } from 'node:path';
if(process.env.STRIPE_SECRET_KEY || process.env.BREVO_API_KEY)throw new Error('Run without live environment credentials.');
process.env.SHIPPING_DRIVER='simulated';
const db=new Database(':memory:');
await db.run(s=>{
 const admin={...newUser('admin@example.test',{pseudo:'Administration de recette',commune:'Saint-Denis',majeur:true}),id:'qa-admin',role:'admin' as const};
 const seller={...newUser('vendeur@example.test',{pseudo:'Camille',commune:'Saint-Paul',majeur:true}),id:'qa-seller'};
 s.utilisateurs.push(admin,seller);s.annonces=ANNONCES_SEED.map((a,i)=>({...a,id:`qa-listing-${i}`,vendeurId:seller.id}));
 s.signalements.push({id:'qa-report',auteurId:admin.id,type:'annonce',cibleId:'qa-listing-0',motif:'Photo à vérifier',le:new Date().toISOString(),traite:false});
 s.commandes.push({id:'qa-order',reference:'LK-RECETTE',annonceId:'qa-listing-1',acheteurId:admin.id,vendeurId:seller.id,mode:'colissimo',prixArticleCents:1000,fraisProtectionCents:130,fraisPortCents:550,margePortCents:100,totalCents:1680,statut:'sequestre',creeeLe:new Date().toISOString(),journal:[{le:new Date().toISOString(),libelle:'Commande fictive pour la vérification visuelle'}],evaluationAcheteurFaite:false,evaluationVendeurFaite:false});
});
createApp(db,{secret:'local-qa-only-'.repeat(8),apiUrl:'http://localhost:3002',returnUrl:'http://localhost:8083',webOrigin:'http://localhost:8083',uploadDir:'/private/tmp/liked-dashboard-qa-uploads',betaEmails:['admin@example.test']},async(_,code)=>console.log('LOCAL QA OTP:',code)).listen(3002,'127.0.0.1',()=>console.log('QA API ready'));
const web=express();web.use(express.static(resolve('../dist')));web.use((_req,res)=>res.sendFile(resolve('../dist/index.html')));web.listen(8083,'127.0.0.1',()=>console.log('QA web ready http://localhost:8083/dashboard/'));
