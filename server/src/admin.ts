import {liveMode} from './commerce';
import { filtrerCoordonnees } from '../../src/lib/filtreCoordonnees';
import { z } from 'zod';
import type Stripe from 'stripe';
import { Database } from './database';
import type { EtatPersiste } from '../../src/types/state';
import { check, requireUser, snapshot } from './security';
import { command, now, uid } from './domain';
import { reglagesApplication } from '../../src/lib/reglages';
import { stripeClient } from './providers';
import { refundOrder, releasePayment, shipping } from './payments';
import { refundBoost, expireBoosts } from './boosts';

function administrator(s:EtatPersiste,id:string|null) { const u=requireUser(s,id);check(u.role==='admin','Accès administrateur requis.',403);return u; }
export function adminOverview(db:Database,s:EtatPersiste,id:string|null) {
  administrator(s,id); expireBoosts(db,s);
  const state=snapshot(s,id);
  const boosts=db.sql.prepare('SELECT id,listing_id,user_id,plan,days,amount,status,starts_at,ends_at FROM boosts ORDER BY rowid DESC').all();
  const emails=db.sql.prepare('SELECT id,user_id,payload,attempts,sent_at FROM email_outbox ORDER BY rowid DESC LIMIT 200').all().map(r=>{
    const payload=JSON.parse(String(r.payload));return {id:r.id,userId:r.user_id,subject:payload.subject,to:payload.to,attempts:r.attempts,status:r.sent_at?'accepted':Number(r.attempts)>=8?'failed':'pending'};
  });
  const accounts=db.sql.prepare('SELECT user_id FROM accounts').all().map(r=>r.user_id);
  return {state:{...state,utilisateurs:s.utilisateurs,mouvements:s.mouvements,messages:s.messages.filter(m=>s.signalements.some(r=>r.type==='message'&&r.cibleId===m.id)).map(m=>({...m,texte:filtrerCoordonnees(m.texte,true).texte}))},boosts,emails,accounts,reglages:reglagesApplication(s),
    services:{stripe:process.env.STRIPE_SECRET_KEY?(liveMode()?'live':'test'):'missing',brevo:!!(process.env.BREVO_API_KEY&&process.env.BREVO_SENDER_EMAIL),colissimo:process.env.SHIPPING_DRIVER==='simulated'?'simulated':'unconfigured'},updatedAt:now()};
}
const key=z.string().min(1).max(200);
const reason=z.string().trim().min(10,'Explique le motif en au moins 10 caractères.').max(1000);
const settings=z.object({colissimoActif:z.boolean(),inscriptionsOuvertes:z.boolean(),publicationsOuvertes:z.boolean(),achatsOuverts:z.boolean(),boostsActifs:z.boolean(),boost3Cents:z.number().int().min(50).max(10000),boost7Cents:z.number().int().min(50).max(10000)}).strict();
const schema=z.discriminatedUnion('action',[
  z.object({action:z.literal('settings'),value:settings}),
  z.object({action:z.literal('moderate'),id:key,value:z.enum(['masquer','retablir','supprimer']),reason}),
  z.object({action:z.literal('sanction'),id:key,value:z.enum(['actif','averti','suspendu','banni']),reason}),
  z.object({action:z.literal('report'),id:key}),
  z.object({action:z.literal('refund'),id:key,reason}),
  z.object({action:z.literal('shipping'),id:key,value:z.enum(['label','ship','deliver'])}),
  z.object({action:z.literal('support'),id:key,text:z.string().trim().min(1).max(2000)}),
  z.object({action:z.literal('dispute'),id:key,value:z.enum(['remboursement_total','versement_vendeur']),reason}),
  z.object({action:z.literal('boost_refund'),id:key,reason}),
  z.object({action:z.literal('email_retry'),id:key}),
  z.object({action:z.literal('stripe_status'),id:key}),
]);
export async function adminAction(db:Database,s:EtatPersiste,id:string|null,input:unknown,provider?:Stripe) {
  const u=administrator(s,id);const d=schema.parse(input);
  const audit=(action:string,cible:string,detail?:string)=>s.journalAdmin.unshift({id:uid(),adminId:u.id,action,cible,detail,le:now()});
  const stripe=()=>provider || stripeClient();
  switch(d.action) {
    case 'settings': {
      check(!d.value.colissimoActif || process.env.SHIPPING_DRIVER==='simulated','Connecte le transporteur avant d’activer Colissimo.',409);
      const before=reglagesApplication(s);s.reglages=d.value;
      audit('Réglages mis à jour','application',Object.keys(d.value).filter(k=>before[k as keyof typeof before]!==d.value[k as keyof typeof before]).map(k=>`${k} : ${String(d.value[k as keyof typeof before])}`).join(' · '));return;
    }
    case 'moderate': command(s,u.id,'modererAnnonce',[d.id,d.value,d.reason]);return;
    case 'sanction': command(s,u.id,'sanctionner',[d.id,d.value,d.reason]);return;
    case 'report': command(s,u.id,'traiterSignalement',[d.id]);return;
    case 'refund': await refundOrder(db,s,u.id,d.id,stripe());audit('Remboursement demandé',d.id,d.reason);return;
    case 'shipping': await shipping(db,s,u.id,d.id,d.value);audit('Transport simulé',d.id,d.value);return;
    case 'support': command(s,u.id,'repondreLitige',[d.id,d.text]);audit('Réponse du support',d.id);return;
    case 'dispute': {
      const l=s.litiges.find(l=>l.id===d.id);check(l && ['ouvert','en_examen'].includes(l.statut),'Litige déjà traité ou introuvable.',409);
      const c=s.commandes.find(c=>c.id===l.commandeId);check(c && c.litigeId===l.id && c.statut==='litige','Paiement non disponible pour cette décision.',409);
      l.decisionMotivee=d.reason;l.issue=d.value;l.statut='en_examen';
      if(d.value==='remboursement_total') await refundOrder(db,s,u.id,c.id,stripe());
      else {
        c.litigeId=undefined;c.statut=c.mode==='colissimo'?'livre':'sequestre';
        await releasePayment(db,s,c.id,stripe());c.litigeId=l.id;l.statut='resolu';
      }
      l.messages.push({id:uid(),auteurId:u.id,role:'support',texte:d.reason,le:now()});
      audit('Décision de litige',l.id,`${d.value} · ${d.reason}`);return;
    }
    case 'boost_refund': await refundBoost(db,s,d.id,stripe());audit('Remboursement de boost demandé',d.id,d.reason);return;
    case 'email_retry': {
      const row=db.sql.prepare('SELECT sent_at,attempts FROM email_outbox WHERE id=?').get(d.id);
      check(row && !row.sent_at && Number(row.attempts)>=8,'Seuls les e-mails en échec peuvent être relancés.',409);
      db.sql.prepare('UPDATE email_outbox SET attempts=0,next_attempt=?,last_error=NULL WHERE id=?').run(Date.now(),d.id);audit('E-mail remis en file',d.id);return;
    }
    case 'stripe_status': {
      const target=s.utilisateurs.find(v=>v.id===d.id);check(target,'Membre introuvable.',404);
      const account=db.sql.prepare('SELECT stripe_id FROM accounts WHERE user_id=?').get(d.id);check(account,'Aucun compte vendeur Stripe associé.',409);
      const a=await stripe().accounts.retrieve(String(account.stripe_id));
      target.kyc=a.details_submitted && a.capabilities?.transfers==='active'?'valide':a.requirements?.disabled_reason?'a_fournir':'en_examen';
      audit('Statut vendeur synchronisé depuis Stripe',d.id,target.kyc);return;
    }
  }
}
