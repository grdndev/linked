import {liveMode} from './commerce';
import { z } from 'zod';
import type Stripe from 'stripe';
import type { EtatPersiste } from '../../src/types/state';
import { forfaitsBoost, reglagesApplication } from '../../src/lib/reglages';
import { Database } from './database';
import { check, requireUser } from './security';
import { uid } from './domain';

type Boost = {id:string;listing_id:string;user_id:string;plan:string;days:number;amount:number;checkout_id:string;checkout_url:string;payment_intent:string;status:string;starts_at:string|null;ends_at:string|null};
function email(db:Database,s:EtatPersiste,b:Boost,event:'active'|'expired'|'refunded') {
  const u=s.utilisateurs.find(u=>u.id===b.user_id); if(!u)return;
  const title=s.annonces.find(a=>a.id===b.listing_id)?.titre || 'Ton article';
  const heading={active:'Ton boost est activé',expired:'Ton boost est terminé',refunded:'Ton boost a été remboursé'}[event];
  const detail=event==='active'?`Ton article est sponsorisé pendant ${b.days} jours, jusqu’au ${new Date(b.ends_at!).toLocaleString('fr-FR',{timeZone:'Indian/Reunion'})} (heure Réunion). Montant${liveMode()?'':' de test'} : ${(b.amount/100).toFixed(2)} €. La mise en avant ne garantit pas une vente.`:event==='expired'?'La période de mise en avant est terminée. Tu peux renouveler ton boost depuis Mes annonces.':'Le remboursement Stripe est confirmé. La mise en avant est désactivée.';
  const textContent=`${heading}\n${title}\n${detail}\n${liveMode()?'':'Environnement de test : aucun argent réel.'} Ouvre Liked → Mes annonces.`;
  const escaped=textContent.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const payload={to:u.email,subject:`${liveMode()?'':'[TEST] '}${heading}`,textContent,htmlContent:`<html lang="fr"><body style="background:#F6F3ED;color:#0B3B3C;font-family:Arial;padding:28px"><h1>liked<span style="color:#F27961">.</span></h1><div style="background:white;padding:24px;border-radius:20px;white-space:pre-line">${escaped}</div></body></html>`};
  db.sql.prepare('INSERT OR IGNORE INTO email_outbox(id,user_id,payload,next_attempt) VALUES (?,?,?,?)').run(`boost:${b.id}:${event}`,b.user_id,JSON.stringify(payload),Date.now());
}
export function expireBoosts(db:Database,s:EtatPersiste,now=Date.now()) {
  const rows=db.sql.prepare("SELECT * FROM boosts WHERE status='active' AND ends_at<=?").all(new Date(now).toISOString()) as Boost[];
  for(const b of rows){db.sql.prepare("UPDATE boosts SET status='expired' WHERE id=?").run(b.id);email(db,s,b,'expired');}
}
export function ownBoosts(db:Database,s:EtatPersiste,userId:string,listingId:string) {
  requireUser(s,userId);check(s.annonces.some(a=>a.id===listingId && a.vendeurId===userId),'Annonce non autorisée.',403);
  expireBoosts(db,s);
  return db.sql.prepare('SELECT id,plan,days,amount,status,starts_at,ends_at FROM boosts WHERE listing_id=? AND user_id=? ORDER BY rowid DESC LIMIT 10').all(listingId,userId);
}
export async function boostCheckout(db:Database,s:EtatPersiste,userId:string,input:unknown,stripe:Stripe,apiUrl:string) {
  check(reglagesApplication(s).boostsActifs,'Les nouveaux boosts sont momentanément suspendus.',409);
  const data=z.object({annonceId:z.string(),plan:z.enum(['3j','7j'])}).parse(input);
  const u=requireUser(s,userId);const a=s.annonces.find(a=>a.id===data.annonceId);
  check(a && a.vendeurId===u.id,'Seul le vendeur peut booster cet article.',403);
  check(a.statut==='en_ligne','Seul un article en ligne peut être boosté.',409);
  expireBoosts(db,s);
  check(!db.sql.prepare("SELECT id FROM boosts WHERE listing_id=? AND status='active'").get(a.id),'Un boost est déjà actif sur cet article.',409);
  const pending=db.sql.prepare("SELECT * FROM boosts WHERE listing_id=? AND status='pending'").get(a.id) as Boost|undefined;
  if(pending){
    const session=await stripe.checkout.sessions.retrieve(pending.checkout_id);
    if(session.status==='open') {
      check(pending.plan===data.plan,'Un paiement est déjà en cours pour cet article. Reprends-le ou attends son expiration (30 minutes).',409);
      return {checkoutUrl:session.url,boostId:pending.id};
    }
    check(session.status==='expired','Paiement reçu, confirmation en cours. Actualise dans quelques secondes.',409);
    db.sql.prepare("UPDATE boosts SET status='canceled' WHERE id=?").run(pending.id);
  }
  const plan=forfaitsBoost(s).find(p=>p.id===data.plan)!;const id=uid();
  const result=await stripe.checkout.sessions.create({mode:'payment',payment_method_types:['card'],customer_email:u.email,client_reference_id:id,
    metadata:{boostId:id},line_items:[{quantity:1,price_data:{currency:'eur',unit_amount:plan.prixCents,product_data:{name:`Boost Liked · ${plan.jours} jours · ${a.titre}`}}}],
    payment_intent_data:{metadata:{boostId:id}},success_url:`${apiUrl}/boost-return?listing=${encodeURIComponent(a.id)}`,cancel_url:`${apiUrl}/boost-return?listing=${encodeURIComponent(a.id)}`,
    expires_at:Math.floor(Date.now()/1000)+1800},{idempotencyKey:`boost-checkout-${id}`});
  db.sql.prepare('INSERT INTO boosts(id,listing_id,user_id,plan,days,amount,checkout_id,checkout_url,status) VALUES (?,?,?,?,?,?,?,?,?)').run(id,a.id,u.id,plan.id,plan.jours,plan.prixCents,result.id,result.url!,'pending');
  return {checkoutUrl:result.url,boostId:id};
}
export async function boostWebhook(db:Database,s:EtatPersiste,event:Stripe.Event,stripe:Stripe):Promise<boolean> {
  if(event.type==='checkout.session.completed' || event.type==='checkout.session.expired'){
    const session=event.data.object as Stripe.Checkout.Session;
    const b=db.sql.prepare('SELECT * FROM boosts WHERE checkout_id=?').get(session.id) as Boost|undefined;
    if(!b)return false;
    check(session.metadata?.boostId===b.id && session.client_reference_id===b.id,'Référence boost incohérente.',409);
    if(b.status!=='pending')return true;
    if(event.type==='checkout.session.expired'){db.sql.prepare("UPDATE boosts SET status='canceled' WHERE id=?").run(b.id);return true;}
    check((liveMode()?session.livemode===true:!session.livemode) && session.payment_status==='paid' && session.amount_total===b.amount && session.currency==='eur' && typeof session.payment_intent==='string','Paiement boost incohérent.',409);
    const pi=await stripe.paymentIntents.retrieve(session.payment_intent);
    check((liveMode()?pi.livemode===true:!pi.livemode) && pi.status==='succeeded' && pi.amount_received===b.amount && pi.currency==='eur' && pi.metadata.boostId===b.id,'Montant boost incohérent.',409);
    db.sql.prepare('UPDATE boosts SET payment_intent=? WHERE id=?').run(pi.id,b.id);
    b.payment_intent=pi.id;
    const a=s.annonces.find(a=>a.id===b.listing_id);
    const owner=s.utilisateurs.find(u=>u.id===b.user_id);
    if(!a || a.statut!=='en_ligne' || a.vendeurId!==b.user_id || !owner || !['actif','averti'].includes(owner.statut)){
      const refund=await stripe.refunds.create({payment_intent:pi.id,amount:b.amount,metadata:{boostId:b.id}},{idempotencyKey:`boost-unavailable-${b.id}`});
      db.sql.prepare('UPDATE boosts SET status=? WHERE id=?').run(refund.status==='succeeded'?'refunded':'refund_pending',b.id);
      if(refund.status==='succeeded')email(db,s,b,'refunded');
      return true;
    }
    b.starts_at=new Date().toISOString();b.ends_at=new Date(Date.now()+b.days*86400000).toISOString();
    db.sql.prepare("UPDATE boosts SET status='active',starts_at=?,ends_at=? WHERE id=?").run(b.starts_at,b.ends_at,b.id);
    a.boost={debut:b.starts_at,fin:b.ends_at};email(db,s,b,'active');return true;
  }
  if(['refund.created','refund.updated','refund.failed'].includes(event.type)){
    const r=event.data.object as Stripe.Refund;
    const pi=typeof r.payment_intent==='string'?r.payment_intent:r.payment_intent?.id;
    if(!pi)return false;
    const b=db.sql.prepare('SELECT * FROM boosts WHERE payment_intent=?').get(pi) as Boost|undefined;if(!b)return false;
    // Only a successful full refund revokes the paid promotion.
    const refund=await stripe.refunds.retrieve(r.id);
    if(refund.status==='succeeded' && refund.amount===b.amount && refund.currency==='eur' && refund.payment_intent===pi){
      db.sql.prepare("UPDATE boosts SET status='refunded' WHERE id=?").run(b.id);
      const a=s.annonces.find(a=>a.id===b.listing_id);if(a?.boost?.debut===b.starts_at)delete a.boost;
      email(db,s,b,'refunded');
    }return true;
  }return false;
}

export async function refundBoost(db:Database,s:EtatPersiste,id:string,stripe:Stripe) {
  const b=db.sql.prepare('SELECT * FROM boosts WHERE id=?').get(id) as Boost|undefined;
  check(b && b.payment_intent,'Boost payé introuvable.',404);
  if(b.status==='refunded')return;
  check(['active','expired','refund_pending'].includes(b.status),'Ce boost ne peut pas être remboursé.',409);
  const r=await stripe.refunds.create({payment_intent:b.payment_intent,amount:b.amount,metadata:{boostId:b.id}},{idempotencyKey:`admin-boost-refund-${b.id}`});
  check(r.payment_intent===b.payment_intent && r.amount===b.amount && r.currency==='eur','Remboursement incohérent.',409);
  db.sql.prepare('UPDATE boosts SET status=? WHERE id=?').run(r.status==='succeeded'?'refunded':'refund_pending',b.id);
  if(r.status==='succeeded') {
    const a=s.annonces.find(a=>a.id===b.listing_id);if(a?.boost?.debut===b.starts_at) delete a.boost;
    email(db,s,b,'refunded');
  }
}
