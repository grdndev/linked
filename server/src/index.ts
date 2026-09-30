import { Database } from './database';
import { createApp } from './app';

const secret = process.env.AUTH_SECRET;
if (!secret || secret.length < 64) throw new Error('AUTH_SECRET doit contenir au moins 64 caractères aléatoires. Voir .env.example.');
const apiUrl = process.env.PUBLIC_API_URL || 'http://localhost:3001';
const app = createApp(new Database(process.env.DATABASE_PATH || './data/liked.sqlite'), {
  secret, apiUrl, returnUrl: process.env.APP_RETURN_URL || 'liked://mes-achats',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:8081', uploadDir: process.env.UPLOAD_DIR || './data/uploads',
});
app.listen(Number(process.env.PORT || 3001),process.env.HOST || '127.0.0.1',() => console.log('Liked API ready (Stripe test mode).'));
