import type { EtatPersiste } from '../../src/types/state';
import { ANNONCES_SEED } from '../../src/data/seed';
import { Database } from './database';
import { newUser, now, uid } from './domain';
import { check, requireUser } from './security';

export const TEST_SELLER_ID = 'liked-beta-seller';

/** Explicitly configured sandbox only. No actor switch is available in normal routes. */
export function requireTestLab(s: EtatPersiste, userId: string, emails?: string[]) {
  const user = requireUser(s,userId);
  check(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && process.env.BETA_SELLER_STRIPE_ID && emails?.includes(user.email), 'Atelier serveur désactivé.',403);
  return user;
}

export function testListing(db: Database,s: EtatPersiste,userId: string,emails?: string[]) {
  requireTestLab(s,userId,emails);
  let seller = s.utilisateurs.find(u=>u.id===TEST_SELLER_ID);
  if (!seller) {
    check(process.env.BREVO_SENDER_EMAIL,'Expéditeur manquant.',503);
    seller = {...newUser(process.env.BREVO_SENDER_EMAIL,{pseudo:'Liked · vendeur de test',commune:'Saint-Denis',majeur:true}),id:TEST_SELLER_ID};
    s.utilisateurs.push(seller);
  }
  db.sql.prepare('INSERT OR IGNORE INTO accounts VALUES (?,?)').run(seller.id,process.env.BETA_SELLER_STRIPE_ID!);
  // A private fixture per buyer, reused until purchased to limit duplicate listings.
  const marker = `Article fictif de recette · ${userId}`;
  let listing = s.annonces.find(a=>a.vendeurId===seller.id && a.description===marker && a.statut==='en_ligne');
  if (!listing) {
    check(s.commandes.filter(c=>c.acheteurId===userId && c.statut==='paiement_en_attente').length<3,'Termine ou attends l’expiration des paiements en cours.',409);
    listing = {...ANNONCES_SEED[0],id:uid(),vendeurId:seller.id,titre:'Robe fleurie · article de test',description:marker,publieeLe:now(),statut:'en_ligne',favoris:0,vues:0};
    s.annonces.unshift(listing);
  }
  return listing.id;
}

export function testOrder(s: EtatPersiste,userId: string,orderId: string,emails?: string[]) {
  requireTestLab(s,userId,emails);
  const order=s.commandes.find(c=>c.id===orderId);
  check(order && order.acheteurId===userId && order.vendeurId===TEST_SELLER_ID,'Commande de recette non autorisée.',403);
  return order;
}
