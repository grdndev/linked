import { Database } from '../src/database';
import { newUser } from '../src/domain';
import { TEST_SELLER_ID } from '../src/testLab';
import { ANNONCES_SEED } from '../../src/data/seed';

if (!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || !process.env.BETA_ALLOWED_EMAILS || !process.env.BREVO_SENDER_EMAIL) throw new Error('Configuration de bêta privée requise.');
const db=new Database(process.env.DATABASE_PATH || './data/liked.sqlite');
await db.run(s=>{
  if (!s.utilisateurs.some(u=>u.id===TEST_SELLER_ID)) s.utilisateurs.push({...newUser(process.env.BREVO_SENDER_EMAIL!,{pseudo:'Liked · vendeur de test',commune:'Saint-Denis',majeur:true}),id:TEST_SELLER_ID});
  for (const [i,original] of ANNONCES_SEED.entries()) {
    const id=`liked-beta-catalog-${i}`;
    if (!s.annonces.some(a=>a.id===id)) s.annonces.push({...original,id,vendeurId:TEST_SELLER_ID,statut:'en_ligne',description:`ARTICLE FICTIF DE TEST. Aucun article réel ne sera expédié.\n\n${original.description}`});
  }
  if (process.env.BETA_SELLER_STRIPE_ID) db.sql.prepare('INSERT OR IGNORE INTO accounts VALUES (?,?)').run(TEST_SELLER_ID,process.env.BETA_SELLER_STRIPE_ID);
  console.log(JSON.stringify({catalogue:s.annonces.length,sellerConnected:!!process.env.BETA_SELLER_STRIPE_ID}));
});
db.sql.close();
