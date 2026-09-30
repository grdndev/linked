import { randomInt } from 'node:crypto';
import { z } from 'zod';
import type Stripe from 'stripe';
import type { EtatPersiste } from '../../src/types/state';
import { calculerPanier } from '../../src/lib/argent';
import { Database } from './database';
import { check, HttpError, requireUser } from './security';
import { now, uid } from './domain';

type Payment = { order_id: string; checkout_id: string; payment_intent: string; charge_id: string; transfer_id: string; code_attempts: number };
export async function checkout(db: Database, s: EtatPersiste, userId: string, input: unknown, stripe: Stripe, apiUrl: string) {
  const data = z.object({ annonceId: z.string(), mode: z.literal('main_propre'), prixNegocieCents: z.number().int().positive().optional() }).parse(input);
  const buyer = requireUser(s,userId); const a = s.annonces.find(a => a.id === data.annonceId);
  check(a && a.statut === 'en_ligne', 'Cet article n’est plus disponible.', 409);
  check(a.vendeurId !== buyer.id && a.accepteMainPropre);
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
  const id = uid(); const cart = calculerPanier(price,'main_propre',a.gabarit);
  const order = { id, reference: `LK-${id.slice(0,8).toUpperCase()}`, annonceId: a.id, acheteurId: buyer.id, vendeurId: a.vendeurId,
    mode: 'main_propre' as const, ...cart, statut: 'paiement_en_attente' as const, creeeLe: now(),
    evaluationAcheteurFaite: false, evaluationVendeurFaite: false, journal: [{ le: now(), libelle: 'Paiement en attente' }] };
  const session = await stripe.checkout.sessions.create({ mode: 'payment', payment_method_types: ['card'],
    client_reference_id: id, metadata: { orderId: id }, customer_email: buyer.email,
    line_items: [{ price_data: { currency: 'eur', product_data: { name: a.titre }, unit_amount: price }, quantity: 1 },
      { price_data: { currency: 'eur', product_data: { name: 'Protection acheteur · 5 % + 0,80 €' }, unit_amount: cart.fraisProtectionCents }, quantity: 1 }],
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
        c.statut = 'sequestre'; c.codeRemise = String(randomInt(0,10000)).padStart(4,'0');
        c.journal.push({ le: now(), libelle: 'Paiement confirmé par Stripe' });
        db.sql.prepare('UPDATE payment_data SET payment_intent=?,charge_id=? WHERE order_id=?').run(pi.id,pi.latest_charge,c.id);
        let conv = s.conversations.find(v => v.annonceId === c.annonceId && v.acheteurId === c.acheteurId);
        if (!conv) { conv = { id: uid(), annonceId: c.annonceId, acheteurId: c.acheteurId, vendeurId: c.vendeurId, derniereActiviteLe: now(), filtrageLeve: true, luPar: [] }; s.conversations.push(conv); }
        conv.filtrageLeve = true;
        for (const id of [c.acheteurId,c.vendeurId]) s.notifications.unshift({ id: uid(), utilisateurId: id, canal: 'article_vendu', titre: 'Paiement confirmé', corps: 'Tu peux organiser la remise.', lien: `/commande/${c.id}`, le: now(), lue: false });
      }
    }
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
  const account = db.sql.prepare('SELECT stripe_id FROM accounts WHERE user_id=?').get(userId) as { stripe_id: string };
  check(account,'Compte Stripe indisponible.',409);
  const tr = await stripe.transfers.create({ amount: c.prixArticleCents, currency: 'eur', destination: account.stripe_id,
    source_transaction: p.charge_id, transfer_group: c.id, metadata: { orderId: c.id } }, { idempotencyKey: `handover-${c.id}` });
  db.sql.prepare('UPDATE payment_data SET transfer_id=? WHERE order_id=?').run(tr.id,c.id);
  c.statut = 'finalisee'; c.livreeLe = c.finaliseeLe = now(); c.codeRemise = undefined;
  c.journal.push({ le: now(), libelle: 'Remise confirmée, transfert vers le compte Stripe du vendeur' });
  s.annonces.find(a => a.id === c.annonceId)!.statut = 'vendue';
  const seller = s.utilisateurs.find(u => u.id === userId)!; seller.nombreVentes++;
  const year = new Date().getFullYear();
  if (seller.dac7.anneeReference !== year) seller.dac7 = { ...seller.dac7, anneeReference: year, montantAnnuelCents: 0, nombreTransactionsAnnuel: 0 };
  seller.dac7.montantAnnuelCents += c.prixArticleCents; seller.dac7.nombreTransactionsAnnuel++;
  return { ok: true };
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
