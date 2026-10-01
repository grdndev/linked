import type {Database} from './database';
import {check} from './security';
export const liveMode=()=>process.env.PAYMENTS_MODE==='live';
export const publicPurchasesReady=()=>liveMode() && process.env.PUBLIC_PAYMENTS_ENABLED==='true' && /^sk_live_/.test(process.env.STRIPE_SECRET_KEY||'') && !!process.env.STRIPE_WEBHOOK_SECRET;
/** Refuse to use a beta database or temporary callback for real-money traffic. */
export function validateCommerceEnvironment(db:Database){
 if(liveMode()){
  check(publicPurchasesReady(),'Configuration des paiements réels incomplète.',503);
  for(const name of ['PUBLIC_API_URL','WEB_ORIGIN','APP_RETURN_URL']){
   const url=new URL(process.env[name]||'http://localhost');
   check(url.protocol==='https:' && !/(^localhost$|^127\.|\.trycloudflare\.com$)/.test(url.hostname),'Les paiements réels nécessitent une adresse HTTPS permanente.',503);
  }
  check(!process.env.BETA_ALLOWED_EMAILS && !process.env.BETA_SELLER_STRIPE_ID,'Utilise un environnement distinct de la bêta pour les paiements réels.',503);
  check(process.env.SHIPPING_DRIVER!=='simulated','La livraison simulée doit être désactivée en production.',503);
  const s=db.read();check(!s.utilisateurs.some(u=>u.id==='liked-beta-seller') && !s.annonces.some(a=>a.vendeurId==='liked-beta-seller'),'Les annonces de démonstration ne peuvent pas être mises en vente réelle.',503);
 }
 db.sql.exec('CREATE TABLE IF NOT EXISTS runtime_metadata (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
 const previous=db.sql.prepare("SELECT value FROM runtime_metadata WHERE key='payments_mode'").get();
 const expected=liveMode()?'live':'test';
 check(!previous||previous.value===expected,'Une base de paiement ne peut pas changer de mode. Prépare une base séparée.',503);
 if(!previous&&liveMode())check(Number(db.sql.prepare('SELECT count(*) AS n FROM payment_data').get()!.n)===0 && Number(db.sql.prepare('SELECT count(*) AS n FROM accounts').get()!.n)===0 && Number(db.sql.prepare('SELECT count(*) AS n FROM boosts').get()!.n)===0,'Les données Stripe existantes nécessitent une migration vérifiée avant la production.',503);
 db.sql.prepare("INSERT OR IGNORE INTO runtime_metadata VALUES ('payments_mode',?)").run(expected);
}
