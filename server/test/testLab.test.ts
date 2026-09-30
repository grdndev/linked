import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Database } from '../src/database';
import { newUser } from '../src/domain';
import { testListing, testOrder, TEST_SELLER_ID } from '../src/testLab';

test('atelier privé : interdit hors sandbox, sans invitation et sur les commandes des autres', async t=>{
  const before={...process.env};
  t.after(()=>{for(const k of ['STRIPE_SECRET_KEY','BETA_SELLER_STRIPE_ID','BREVO_SENDER_EMAIL']){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}});
  const db=new Database(':memory:');t.after(()=>db.sql.close());
  const s=db.read();const buyer=newUser('buyer@example.test',{pseudo:'Acheteur',commune:'Saint-Denis',majeur:true});s.utilisateurs.push(buyer);
  const allowed=[buyer.email];
  process.env.STRIPE_SECRET_KEY='sk_live_rejected';process.env.BETA_SELLER_STRIPE_ID='acct_fixture';
  assert.throws(()=>testListing(db,s,buyer.id,allowed));
  process.env.STRIPE_SECRET_KEY='sk_test_fixture';process.env.BREVO_SENDER_EMAIL='seller@example.test';
  assert.throws(()=>testListing(db,s,buyer.id,[]));
  const listing=testListing(db,s,buyer.id,allowed);
  assert.equal(testListing(db,s,buyer.id,allowed),listing);
  assert.equal(s.annonces[0].vendeurId,TEST_SELLER_ID);
  assert.throws(()=>testOrder(s,buyer.id,'unknown',allowed));
  const order={id:'order',acheteurId:'other',vendeurId:TEST_SELLER_ID} as typeof s.commandes[number];s.commandes.push(order);
  assert.throws(()=>testOrder(s,buyer.id,order.id,allowed));
  order.acheteurId=buyer.id;order.vendeurId='real-seller';assert.throws(()=>testOrder(s,buyer.id,order.id,allowed));
  order.vendeurId=TEST_SELLER_ID;assert.equal(testOrder(s,buyer.id,order.id,allowed),order);
});
