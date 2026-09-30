import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { Database } from './database';
import { check, code, digest, equal, HttpError, requireUser, snapshot, token } from './security';
import { command, newUser, registration, uid } from './domain';
import { sendCode, stripeClient } from './providers';
import { checkout, handover, onboarding, webhook, refundOrder, shipping } from './payments';
import { boostCheckout, ownBoosts } from './boosts';
import { BOOST_PLANS } from '../../src/lib/boost';
import { testListing, testOrder, testBoostListing } from './testLab';

export function createApp(db: Database, config: { secret: string; apiUrl: string; returnUrl: string; webOrigin: string; uploadDir: string; betaEmails?: string[] }, mailer = sendCode) {
  const app = express(); app.disable('x-powered-by');
  // Only the local reverse proxy may supply client forwarding headers.
  app.set('trust proxy','loopback');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use((req,res,next) => {
    if (req.headers.origin === config.webOrigin) {
      res.setHeader('Access-Control-Allow-Origin',config.webOrigin);
      res.setHeader('Vary','Origin');
      res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; } next();
  });
  app.get('/health',(_req,res) => res.json({ status: 'ok', service: 'liked-api', payments: 'test-only' }));
  app.post('/webhooks/stripe', express.raw({ type: 'application/json', limit: '1mb' }), async (req,res) => {
    check(process.env.STRIPE_WEBHOOK_SECRET,'Webhook Stripe non configuré.',503);
    const stripe = stripeClient(); let event;
    try { event = stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'] as string,process.env.STRIPE_WEBHOOK_SECRET); }
    catch { throw new HttpError(400,'Signature Stripe invalide.'); }
    await db.run(s => webhook(db,s,event,stripe)); res.json({ received: true });
  });
  app.use(rateLimit({ windowMs: 60_000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false, message: { erreur: 'Trop de requêtes. Réessaie dans une minute.' } }));
  app.use(express.json({ limit: '128kb' }));
  app.use((_req,res,next) => { res.setHeader('Cache-Control','no-store'); next(); });
  const emailSchema = z.string().trim().toLowerCase().email().max(254);
  const sessionUser = (req: Request) => {
    const authorization = req.headers.authorization;
    if (!authorization) return null;
    check(/^Bearer [a-f0-9]{64}$/.test(authorization),'Session invalide.',401);
    const row = db.sql.prepare('SELECT user_id FROM sessions WHERE hash=? AND expires>?').get(digest(authorization.slice(7),config.secret),Date.now()) as { user_id: string } | undefined;
    check(row,'Session expirée. Reconnecte-toi.',401);
    if (config.betaEmails?.length) check(config.betaEmails.includes(db.read().utilisateurs.find(u=>u.id===row.user_id)?.email || ''),'Accès réservé aux testeurs invités.',403);
    return row.user_id;
  };
  app.post('/auth/code',rateLimit({ windowMs: 600_000, limit: 10, message: { erreur: 'Trop de demandes de code. Réessaie plus tard.' } }),async (req,res) => {
    const email = emailSchema.parse(req.body.email);
    check(!config.betaEmails?.length || config.betaEmails.includes(email),'Cette bêta est réservée aux adresses invitées.',403);
    await db.run(async () => {
      const old = db.sql.prepare('SELECT sent FROM codes WHERE email=?').get(email) as { sent: number } | undefined;
      check(!old || Date.now()-old.sent >= 60_000,'Attends une minute avant de demander un autre code.',429);
      const value = code(); await mailer(email,value);
      db.sql.prepare('INSERT OR REPLACE INTO codes VALUES (?,?,?,?,?)').run(email,digest(`${email}:${value}`,config.secret),Date.now()+600_000,0,Date.now());
      db.sql.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
      db.sql.prepare('DELETE FROM codes WHERE expires<?').run(Date.now());
    }); res.json({ envoye: true });
  });
  app.post('/auth/verify',rateLimit({ windowMs: 600_000, limit: 30, message: { erreur: 'Trop de tentatives. Réessaie plus tard.' } }),async (req,res) => {
    const data = z.object({ email: emailSchema, code: z.string().regex(/^\d{6}$/), profile: registration.optional() }).parse(req.body);
    check(!config.betaEmails?.length || config.betaEmails.includes(data.email),'Cette bêta est réservée aux adresses invitées.',403);
    const result = await db.run(s => {
      const stored = db.sql.prepare('SELECT * FROM codes WHERE email=?').get(data.email) as { hash: string; attempts: number; expires: number } | undefined;
      if (!stored || stored.expires < Date.now() || stored.attempts >= 5) return { erreur: 'Code expiré ou bloqué. Demande un nouveau code.' };
      db.sql.prepare('UPDATE codes SET attempts=attempts+1 WHERE email=?').run(data.email);
      if (!equal(stored.hash,digest(`${data.email}:${data.code}`,config.secret))) return { erreur: 'Code incorrect.' };
      let u = s.utilisateurs.find(u => u.email === data.email);
      if (!u) {
        if (!data.profile) return { erreur: 'Crée ton compte pour continuer.' };
        u = newUser(data.email,data.profile); s.utilisateurs.push(u);
      }
      requireUser(s,u.id);
      db.sql.prepare('DELETE FROM codes WHERE email=?').run(data.email);
      const rawToken = token();
      db.sql.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(rawToken,config.secret),u.id,Date.now()+7*86400_000);
      return { token: rawToken, state: snapshot(s,u.id) };
    }); res.status('erreur' in result ? 400 : 200).json(result);
  });
  app.post('/auth/logout',async (req,res) => {
    await db.run(() => { if (req.headers.authorization?.startsWith('Bearer ')) db.sql.prepare('DELETE FROM sessions WHERE hash=?').run(digest(req.headers.authorization.slice(7),config.secret)); });
    res.sendStatus(204);
  });
  app.get('/state',async (req,res) => res.json(await db.run(s => {
    const id = sessionUser(req); if (id) requireUser(s,id); return snapshot(s,id);
  })));
  const ownedPhoto = (url: string,id: string) => check(db.sql.prepare('SELECT url FROM uploads WHERE url=? AND user_id=?').get(url,id),'Photo non autorisée.');
  app.post('/commands/:name',async (req,res) => {
    const args = z.array(z.unknown()).max(6).parse(req.body.args);
    const name = String(req.params.name);
    const result = await db.run(s => {
      const id = sessionUser(req); const u = requireUser(s,id);
      if (name === 'publierAnnonce' || name === 'modifierAnnonce') {
        const body = args[name === 'publierAnnonce' ? 0 : 1] as { photos?: unknown } | undefined;
        if (body?.photos) z.array(z.string()).max(8).parse(body.photos).forEach(url => ownedPhoto(url,u.id));
      }
      if (name === 'majProfil' && (args[0] as { photoUrl?: string })?.photoUrl) ownedPhoto((args[0] as { photoUrl: string }).photoUrl,u.id);
      if (name === 'ouvrirLitige') z.array(z.string()).max(8).parse(args[3]).forEach(url => ownedPhoto(url,u.id));
      const value = command(s,u.id,name,args); return { result: value ?? null, state: snapshot(s,u.id) };
    }); res.json(result);
  });
  app.get('/boost/plans',(_req,res)=>res.json(BOOST_PLANS));
  app.get('/boosts/:id',async(req,res)=>res.json(await db.run(s=>ownBoosts(db,s,requireUser(s,sessionUser(req)).id,String(req.params.id)))));
  app.post('/boost/checkout',async(req,res)=>res.json(await db.run(s=>boostCheckout(db,s,requireUser(s,sessionUser(req)).id,req.body,stripeClient(),config.apiUrl))));
  app.get('/boost-return',(req,res)=>{
    const id=z.string().uuid().parse(req.query.listing);
    const destination=/^https?:\/\//.test(config.returnUrl)?new URL(`/booster/${id}`,config.returnUrl).href:`liked://booster/${id}`;
    if(destination.startsWith('https://') || destination.startsWith('http://')){res.redirect(303,destination);return;}
    res.type('html').send(`<html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><body><h1>Retour à Liked</h1><a href="${destination}">Voir mon boost</a><p>L’activation dépend de la confirmation Stripe.</p></body></html>`);
  });
  app.post('/checkout',async (req,res) => res.json(await db.run(async s => {
    const u = requireUser(s,sessionUser(req));
    const result = await checkout(db,s,u.id,req.body,stripeClient(),config.apiUrl);
    return { ...result, state: snapshot(s,u.id) };
  })));
  app.post('/orders/:id/handover',async (req,res) => res.json(await db.run(async s => {
    const u = requireUser(s,sessionUser(req));
    const result = await handover(db,s,u.id,String(req.params.id),z.string().max(4).parse(req.body.code),stripeClient());
    return { ...result, state: snapshot(s,u.id) };
  })));
  app.get('/test/status',(_req,res) => res.json({ scenarios: process.env.BETA_SELLER_STRIPE_ID && config.betaEmails?.length ? 'ready' : 'pending', stripe: process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'configured' : 'missing', brevo: process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL ? 'configured' : 'missing', shipping: process.env.SHIPPING_DRIVER === 'simulated' ? 'simulated' : 'disabled' }));
  app.post('/test/boost-listing',async(req,res)=>res.json(await db.run(s=>{
    const u=requireUser(s,sessionUser(req));return {annonceId:testBoostListing(s,u.id,config.betaEmails),state:snapshot(s,u.id)};
  })));
  app.post('/test/listing',async (req,res) => res.json(await db.run(s=>{
    const user=requireUser(s,sessionUser(req));
    return {annonceId:testListing(db,s,user.id,config.betaEmails),state:snapshot(s,user.id)};
  })));
  app.post('/test/orders/:id',async (req,res) => res.json(await db.run(async s=>{
    const user=requireUser(s,sessionUser(req));
    const order=testOrder(s,user.id,String(req.params.id),config.betaEmails);
    const action=z.enum(['label','ship','deliver','handover']).parse(req.body.action);
    const result=action==='handover'
      ? await handover(db,s,order.vendeurId,order.id,z.string().regex(/^\d{4}$/).parse(req.body.code),stripeClient())
      : await shipping(db,s,order.vendeurId,order.id,action);
    return {...result,state:snapshot(s,user.id)};
  })));
  app.get('/emails',async (req,res) => res.json(await db.run(s => {
    const u = requireUser(s,sessionUser(req));
    return db.sql.prepare('SELECT id,payload,attempts,sent_at,last_error FROM email_outbox WHERE user_id=? ORDER BY rowid DESC LIMIT 50').all(u.id).map(row => {
      const payload = JSON.parse(String(row.payload));
      return {id:row.id,subject:payload.subject,textContent:payload.textContent,status:row.sent_at?'accepted':row.attempts===8?'failed':'pending'};
    });
  })));
  app.post('/orders/:id/refund',async (req,res) => res.json(await db.run(async s => {
    const u = requireUser(s,sessionUser(req));
    const result = await refundOrder(db,s,u.id,String(req.params.id),stripeClient());
    return {...result,state:snapshot(s,u.id)};
  })));
  app.post('/orders/:id/shipping',async (req,res) => res.json(await db.run(async s => {
    const u = requireUser(s,sessionUser(req)); const action = z.enum(['label','ship','deliver','receive']).parse(req.body.action);
    const result = await shipping(db,s,u.id,String(req.params.id),action,action==='receive'?stripeClient():undefined);
    return {...result,state:snapshot(s,u.id)};
  })));
  app.post('/connect/onboarding',async (req,res) => res.json(await db.run(s => onboarding(db,s,requireUser(s,sessionUser(req)).id,stripeClient(),config.apiUrl))));
  app.get('/payment-return',(_req,res) => {
    if (/^https?:\/\//.test(config.returnUrl)) { res.redirect(303,config.returnUrl); return; }
    const url = config.returnUrl.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
    res.type('html').send(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Liked — retour</title><body><h1>Retour à Liked</h1><p>Tu peux fermer cette page. La commande sera mise à jour après confirmation de Stripe.</p><a href="${url}">Ouvrir l’application</a></body></html>`);
  });
  const uploadDir = resolve(config.uploadDir); mkdirSync(uploadDir,{ recursive: true });
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10*1024*1024, files: 1 } });
  app.post('/uploads',async (req,res,next) => {
    try { await db.run(s => { requireUser(s,sessionUser(req)); }); next(); } catch(error) { next(error); }
  },upload.single('photo'),async (req,res) => {
    check(req.file,'Photo manquante.',400);
    const name = `${uid()}.webp`; const url = `${config.apiUrl}/media/${name}`;
    // Decodes the image, strips EXIF/GPS, enforces pixel limits and re-encodes.
    try { await sharp(req.file.buffer,{ limitInputPixels: 40_000_000 }).rotate().resize(1400,1400,{ fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(resolve(uploadDir,name)); }
    catch { throw new HttpError(422,'Image illisible ou trop volumineuse.'); }
    await db.run(s => { const u = requireUser(s,sessionUser(req)); db.sql.prepare('INSERT INTO uploads VALUES (?,?)').run(url,u.id); });
    res.json({ url });
  });
  app.use('/media',express.static(uploadDir,{ dotfiles: 'deny', maxAge: '7d', immutable: true, index: false }));
  app.use((error: unknown,_req: Request,res: Response,_next: NextFunction) => {
    if (error instanceof z.ZodError) { res.status(422).json({ erreur: 'Vérifie les informations saisies.', champs: error.issues.map(i => i.path.join('.')) }); return; }
    if (error instanceof HttpError) { res.status(error.status).json({ erreur: error.message }); return; }
    if (error instanceof multer.MulterError) { res.status(413).json({ erreur: 'Photo trop volumineuse (10 Mo maximum).' }); return; }
    // No provider errors, credentials, OTPs, bodies or personal data in logs/responses.
    console.error('API request failed:', error instanceof Error ? error.name : 'unknown');
    res.status(500).json({ erreur: 'Le service est momentanément indisponible. Réessaie plus tard.' });
  });
  return app;
}
