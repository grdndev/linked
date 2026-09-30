import { Database } from './database';
import { createApp } from './app';
import { flushEmails } from './emails';
import { settleDueOrders } from './payments';
import { stripeClient } from './providers';

const secret = process.env.AUTH_SECRET;
if (!secret || secret.length < 64) throw new Error('AUTH_SECRET doit contenir au moins 64 caractères aléatoires. Voir .env.example.');
const apiUrl = process.env.PUBLIC_API_URL || 'http://localhost:3001';
const db = new Database(process.env.DATABASE_PATH || './data/liked.sqlite');
const app = createApp(db, {
  secret, apiUrl, returnUrl: process.env.APP_RETURN_URL || 'liked://mes-achats',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:8081', uploadDir: process.env.UPLOAD_DIR || './data/uploads',
});
app.listen(Number(process.env.PORT || 3001),process.env.HOST || '127.0.0.1',() => console.log('Liked API ready (Stripe test mode).'));

let working = false;
const timer = setInterval(async () => {
  if (working) return;
  working = true;
  try {
    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) await settleDueOrders(db,stripeClient());
  } catch { console.error('Order settlement will retry.'); }
  try { if (process.env.BREVO_API_KEY) await flushEmails(db); }
  catch { console.error('Email worker will retry.'); }
  finally { working = false; }
},15_000);
timer.unref();
