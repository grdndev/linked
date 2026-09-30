import Stripe from 'stripe';
const key=process.env.STRIPE_SECRET_KEY;
if(!key?.startsWith('sk_test_')) throw new Error('Clé de test requise');
const stripe=new Stripe(key,{timeout:15000,maxNetworkRetries:1});
try {
 const pi=await stripe.paymentIntents.create({amount:100,currency:'eur',payment_method:'pm_card_visa',payment_method_types:['card'],confirm:true,description:'Liked — vérification technique de recette, aucun débit réel',metadata:{likedTest:'connectivity-20260930'}},{idempotencyKey:'liked-test-connectivity-20260930'});
 console.log(JSON.stringify({paymentIntent:pi.id,status:pi.status,livemode:pi.livemode}));
 if(pi.status==='succeeded') {const refund=await stripe.refunds.create({payment_intent:pi.id},{idempotencyKey:'liked-test-connectivity-refund-20260930'});console.log(JSON.stringify({refund:refund.id,status:refund.status}));}
 const seller=await stripe.accounts.create({type:'express',country:'FR',email:'vendeur@liked.example',business_type:'individual',capabilities:{transfers:{requested:true}},metadata:{likedTest:'seller-fixture-20260930'}},{idempotencyKey:'liked-test-seller-20260930'});
 console.log(JSON.stringify({seller:seller.id,transfers:seller.capabilities?.transfers,requirements:seller.requirements?.currently_due}));
} catch(e) { console.log(JSON.stringify({error:e.code,type:e.type,message:e.message})); process.exitCode=1; }
