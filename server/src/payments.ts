import { randomInt } from 'node:crypto';
import { z } from 'zod';
import type Stripe from 'stripe';
import type { EtatPersiste } from '../../src/types/state';
import { calculerPanier } from '../../src/lib/argent';
import { Database } from './database';
import { check, HttpError, requireUser } from './security';
import { now, uid } from './domain';
import { queueOrderEmails } from './emails';

type Payment = { order_id: string; checkout_id: string; payment_intent: string; charge_id: string; transfer_id: string; code_attempts: number };
export async function checkout(db: Database, s: EtatPersiste, userId: string, input: unknown, stripe: Stripe, apiUrl: string) {
  const data = z.object({ annonceId: z.string(), mode: z.enum(['main_propre','colissimo']), adresse: z.object({ nomComplet: z.string().trim().min(2).max(120), ligne1: z.string().trim().min(3).max(200), ligne2: z.string().max(200).optional(), codePostal: z.string().regex(/^974\d{2}$/), ville: z.string().trim().min(2).max(100), telephone: z.string().regex(/^[+\d ()-]{9,20}$/) }).optional(), prixNegocieCents: z.number().int().positive().optional() }).parse(input);
  const buyer = requireUser(s,userId); const a = s.annonces.find(a => a.id === data.annonceId);
  check(a && a.statut === 'en_ligne', 'Cet article n’est plus disponible.', 409);
  check(a.vendeurId !== buyer.id && (data.mode === 'main_propre' ? a.accepteMainPropre : a.accepteEnvoi));
  if (data.mode === 'colissimo') check(process.env.SHIPPING_DRIVER === 'simulated' && data.adresse,'La livraison de test doit être activée et son adresse complétée.',422);
  const seller = requireUser(s, a.vendeurId);
  const account = db.sql.prepare('SELECT stripe_id FROM accounts WHERE user_id=?').get(seller.id) as { stripe_id: string } | undefined;
  check(account, 'Le vendeur doit activer son compte Stripe avant de recevoir un paiement.', 409);
  const connected = await stripe.accounts.retrieve(account.stripe_id);
  check(connected.capabilities?.transfers === 'active' && connected.details_submitted, 'La vérification Stripe du vendeur n’est pas terminée.', 409);
  let price = a.prixCents;
  if (data.prixNegocieCents != null) {
    const conversation = s.conversations.find(c => c.annonceId === a.id && c.acheteurId === buyer.id);
    const offer = s.messages.find(m => m.conversationId === conversation?.id && m.offre?.statut === 'acceptee' && m.offre.montantCents === data.prixNegocieCents);
    check(offer, 'Ce prix n’a pas été accepté par le vendeur.', 409); price = offer.offre!.montantCents;
  }
  const id = uid(); const cart = calculerPanier(price,data.mode,a.gabarit);
  const order = { id, reference: `LK-${id.slice(0,8).toUpperCase()}`, annonceId: a.id, acheteurId: buyer.id, vendeurId: a.vendeurId,
    mode: data.mode, adresseLivraison: data.adresse, ...cart, statut: 'paiement_en_attente' as const, creeeLe: now(),
    evaluationAcheteurFaite: false, evaluationVendeurFaite: false, journal: [{ le: now(), libelle: 'Paiement en attente' }] };
  const session = await stripe.checkout.sessions.create({ mode: 'payment', payment_method_types: ['card'],
    client_reference_id: id, metadata: { orderId: id }, customer_email: buyer.email,
    line_items: [{ price_data: { currency: 'eur', product_data: { name: a.titre }, unit_amount: price }, quantity: 1 },
      { price_data: { currency: 'eur', product_data: { name: 'Protection acheteur · 5 % + 0,80 €' }, unit_amount: cart.fraisProtectionCents }, quantity: 1 },
      ...(cart.fraisPortCents ? [{ price_data: { currency: 'eur', product_data: { name: 'Livraison simulée — test' }, unit_amount: cart.fraisPortCents }, quantity: 1 }] : [])],
    payment_intent_data: { transfer_group: id, metadata: { orderId: id } },
    success_url: `${apiUrl}/payment-return`, cancel_url: `${apiUrl}/payment-return`,
    expires_at: Math.floor(Date.now()/1000)+1800,
  }, { idempotencyKey: `checkout-${id}` });
  s.commandes.unshift(order); a.statut = 'reservee';
  db.sql.prepare('INSERT INTO payment_data(order_id, checkout_id) VALUES (?,?)').run(id,session.id);
  return { ok: true, commandeId: id, checkoutUrl: session.url };
}

/** Signature validation happens before this handler. Checkout return URLs never mark an order as paid. */
export async function webhook(db: Database, s: EtatPersiste, event: Stripe.Event, stripe: Stripe) {
  if (db.sql.prepare('SELECT id FROM events WHERE id=?').get(event.id)) return;
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const payment = db.sql.prepare('SELECT * FROM payment_data WHERE checkout_id=?').get(session.id) as Payment | undefined;
    if (!payment) { db.sql.prepare('INSERT INTO events VALUES (?)').run(event.id); return; }
    const c = s.commandes.find(c => c.id === payment.order_id); check(c, 'Commande introuvable.', 409);
    check(session.metadata?.orderId === c.id && session.client_reference_id === c.id, 'Référence Stripe incohérente.', 409);
    if (c.statut === 'paiement_en_attente') {
      const a = s.annonces.find(a => a.id === c.annonceId)!;
      if (event.type === 'checkout.session.expired') { c.statut = 'annulee'; a.statut = 'en_ligne'; }
      else {
        check(session.payment_status === 'paid' && session.currency === 'eur' && session.amount_total === c.totalCents, 'Montant Stripe incohérent.', 409);
        check(typeof session.payment_intent === 'string');
        const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
        check(pi.status === 'succeeded' && pi.amount_received === c.totalCents && pi.currency === 'eur' && typeof pi.latest_charge === 'string');
        c.statut = 'sequestre'; if (c.mode === 'main_propre') c.codeRemise = String(randomInt(0,10000)).padStart(4,'0');
        c.journal.push({ le: now(), libelle: 'Paiement confirmé par Stripe' });
        db.sql.prepare('UPDATE payment_data SET payment_intent=?,charge_id=? WHERE order_id=?').run(pi.id,pi.latest_charge,c.id);
        let conv = s.conversations.find(v => v.annonceId === c.annonceId && v.acheteurId === c.acheteurId);
        if (!conv) { conv = { id: uid(), annonceId: c.annonceId, acheteurId: c.acheteurId, vendeurId: c.vendeurId, derniereActiviteLe: now(), filtrageLeve: true, luPar: [] }; s.conversations.push(conv); }
        conv.filtrageLeve = true;
        queueOrderEmails(db,s,c,'achat');
        for (const id of [c.acheteurId,c.vendeurId]) s.notifications.unshift({ id: uid(), utilisateurId: id, canal: 'article_vendu', titre: 'Paiement confirmé', corps: 'Tu peux organiser la remise.', lien: `/commande/${c.id}`, le: now(), lue: false });
      }
    }
  }
  if (event.type === 'refund.updated' || event.type === 'refund.created' || event.type === 'refund.failed') {
    const refund = event.data.object as Stripe.Refund;
    const known = db.sql.prepare('SELECT order_id FROM refunds WHERE stripe_id=?').get(refund.id) as {order_id:string}|undefined;
    if (known) await reconcileRefund(db,s,known.order_id,stripe);
  }
  db.sql.prepare('INSERT INTO events VALUES (?)').run(event.id);
}

export async function handover(db: Database,s: EtatPersiste,userId: string,orderId: string,code: string,stripe: Stripe) {
  requireUser(s,userId);
  const c = s.commandes.find(c => c.id === orderId);
  check(c && c.vendeurId === userId && c.mode === 'main_propre');
  check(c.statut === 'sequestre' && !c.litigeId,'La commande n’attend pas de remise.',409);
  const p = db.sql.prepare('SELECT * FROM payment_data WHERE order_id=?').get(c.id) as Payment;
  check(p && p.charge_id && !p.transfer_id);
  if (p.code_attempts >= 5) return { ok: false, erreur: 'Code bloqué après cinq tentatives. Contacte le support.' };
  if (!/^\d{4}$/.test(code) || code !== c.codeRemise) {
    db.sql.prepare('UPDATE payment_data SET code_attempts=code_attempts+1 WHERE order_id=?').run(c.id);
    return { ok: false, erreur: 'Code incorrect.' }; // Commit attempts even on failure.
  }
  await releasePayment(db,s,c.id,stripe);
  return { ok: true };
}

async function releasePayment(db: Database,s: EtatPersiste,orderId: string,stripe: Stripe) {
  const c = s.commandes.find(c=>c.id===orderId)!;
  check(!c.litigeId && ['sequestre','livre'].includes(c.statut),'Versement impossible.',409);
  const p = db.sql.prepare('SELECT * FROM payment_data WHERE order_id=?').get(c.id) as Payment;
  check(p?.charge_id && !p.transfer_id);
  const account = db.sql.prepare('SELECT stripe_id FROM accounts WHERE user_id=?').get(c.vendeurId) as {stripe_id:string};
  check(account,'Compte Stripe indisponible.',409);
  const tr = await stripe.transfers.create({ amount: c.prixArticleCents, currency: 'eur', destination: account.stripe_id,
    source_transaction: p.charge_id, transfer_group: c.id, metadata: { orderId: c.id } }, { idempotencyKey: `release-${c.id}` });
  db.sql.prepare('UPDATE payment_data SET transfer_id=? WHERE order_id=?').run(tr.id,c.id);
  c.statut = 'finalisee'; c.livreeLe ??= now(); c.finaliseeLe = now(); c.codeRemise = undefined;
  c.journal.push({ le: now(), libelle: 'Transaction terminée, transfert Stripe de test confirmé' });
  s.annonces.find(a => a.id === c.annonceId)!.statut = 'vendue';
  const seller = s.utilisateurs.find(u => u.id === c.vendeurId)!; seller.nombreVentes++;
  const year = new Date().getFullYear();
  if (seller.dac7.anneeReference !== year) seller.dac7 = { ...seller.dac7, anneeReference: year, montantAnnuelCents: 0, nombreTransactionsAnnuel: 0 };
  seller.dac7.montantAnnuelCents += c.prixArticleCents; seller.dac7.nombreTransactionsAnnuel++;
  queueOrderEmails(db,s,c,'versement');
}

export async function refundOrder(db: Database,s: EtatPersiste,userId: string,orderId: string,stripe: Stripe) {
  requireUser(s,userId);
  const c = s.commandes.find(c=>c.id===orderId);
  check(c && [c.acheteurId,c.vendeurId].includes(userId),'Commande non autorisée.',403);
  if (c.statut === 'remboursee') return { ok: true };
  check(['sequestre','etiquette_emise','remboursement_en_cours'].includes(c.statut) && !c.litigeId,'Annulation possible uniquement avant expédition ou remise.',409);
  const p = db.sql.prepare('SELECT * FROM payment_data WHERE order_id=?').get(c.id) as Payment;
  check(p?.payment_intent && !p.transfer_id,'Le paiement a déjà été versé au vendeur.',409);
  const existing = db.sql.prepare('SELECT stripe_id FROM refunds WHERE order_id=?').get(c.id);
  if (!existing) {
    const r = await stripe.refunds.create({ payment_intent: p.payment_intent, amount: c.totalCents, metadata: { orderId: c.id } },{ idempotencyKey: `refund-${c.id}` });
    db.sql.prepare('INSERT INTO refunds VALUES (?,?,?)').run(c.id,r.id,r.status || 'pending');
  }
  c.statut = 'remboursement_en_cours'; c.codeRemise = undefined;
  await reconcileRefund(db,s,c.id,stripe);
  return { ok: true };
}

export async function reconcileRefund(db: Database,s: EtatPersiste,orderId: string,stripe: Stripe) {
  const c = s.commandes.find(c=>c.id===orderId)!;
  if (c.statut === 'remboursee') return;
  const row = db.sql.prepare('SELECT stripe_id FROM refunds WHERE order_id=?').get(c.id) as {stripe_id:string};
  const p = db.sql.prepare('SELECT * FROM payment_data WHERE order_id=?').get(c.id) as Payment;
  const r = await stripe.refunds.retrieve(row.stripe_id);
  check(r.payment_intent === p.payment_intent && r.amount === c.totalCents && r.currency === 'eur','Remboursement incohérent.',409);
  db.sql.prepare('UPDATE refunds SET status=? WHERE order_id=?').run(r.status || 'pending',c.id);
  if (r.status === 'succeeded') {
    c.statut = 'remboursee'; c.journal.push({le:now(),libelle:'Remboursement intégral confirmé par Stripe'});
    s.annonces.find(a=>a.id===c.annonceId)!.statut = 'en_ligne';
    queueOrderEmails(db,s,c,'remboursement');
  } else if (r.status === 'failed' || r.status === 'canceled') {
    // Keep the article reserved and the transfer blocked until support intervenes.
    if (!c.journal.some(e=>e.libelle==='Remboursement à vérifier par le support')) c.journal.push({le:now(),libelle:'Remboursement à vérifier par le support'});
  }
}

export async function shipping(db: Database,s: EtatPersiste,userId: string,orderId: string,action: string,stripe?: Stripe) {
  const u = requireUser(s,userId); const c = s.commandes.find(c=>c.id===orderId);
  check(c && c.mode === 'colissimo','Commande introuvable.',404);
  check(!c.litigeId,'Un litige bloque cette commande.',409);
  if (action === 'receive') {
    check(u.id === c.acheteurId && c.statut === 'livre','Seul l’acheteur peut confirmer la réception.',403);
    check(stripe); await releasePayment(db,s,c.id,stripe); return {ok:true};
  }
  check(process.env.SHIPPING_DRIVER === 'simulated','Le transporteur de test est désactivé.',503);
  check(u.id === c.vendeurId,'Seul le vendeur peut simuler le transport.',403);
  const transitions: Record<string,{from:string;to:typeof c.statut;label:string}> = {
    label: {from:'sequestre',to:'etiquette_emise',label:'Étiquette de test générée — non affranchie'},
    ship: {from:'etiquette_emise',to:'expedie',label:'Prise en charge simulée'},
    deliver: {from:'expedie',to:'livre',label:'Livraison simulée'},
  };
  const next = transitions[action]; check(next && c.statut === next.from,'Étape de transport invalide.',409);
  c.statut = next.to;
  if (action === 'label') { c.numeroSuivi = `TEST-${c.id.slice(0,12).toUpperCase()}`; c.etiquetteUrl = undefined; }
  if (action === 'deliver') { c.livreeLe = now(); c.liberableLe = new Date(Date.now()+48*3600_000).toISOString(); }
  (c.suivi ??= []).push({le:now(),libelle:next.label,livre:action==='deliver'});
  c.journal.push({le:now(),libelle:next.label});
  if (action === 'ship' || action === 'deliver') queueOrderEmails(db,s,c,action==='ship'?'expedition':'livraison');
  return {ok:true};
}

export async function settleDueOrders(db: Database,stripe: Stripe) {
  await db.run(async s => {
    for (const c of s.commandes) {
      if (c.statut === 'remboursement_en_cours') await reconcileRefund(db,s,c.id,stripe);
      if (c.statut === 'livre' && !c.litigeId && c.liberableLe && Date.parse(c.liberableLe)<=Date.now()) await releasePayment(db,s,c.id,stripe);
    }
  });
}

export async function onboarding(db: Database,s: EtatPersiste,userId: string,stripe: Stripe,apiUrl: string) {
  const u = requireUser(s,userId); check(u.majeur,'La vente est réservée aux personnes majeures.');
  let account = db.sql.prepare('SELECT stripe_id FROM accounts WHERE user_id=?').get(u.id) as { stripe_id: string } | undefined;
  if (!account) {
    const created = await stripe.accounts.create({ type: 'express', country: 'FR', email: u.email, business_type: 'individual', capabilities: { transfers: { requested: true } }, metadata: { likedUserId: u.id } }, { idempotencyKey: `account-${u.id}` });
    account = { stripe_id: created.id }; db.sql.prepare('INSERT INTO accounts VALUES (?,?)').run(u.id,created.id);
  }
  const link = await stripe.accountLinks.create({ account: account.stripe_id, type: 'account_onboarding', refresh_url: `${apiUrl}/payment-return`, return_url: `${apiUrl}/payment-return` });
  return { url: link.url };
}
