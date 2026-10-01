import {liveMode} from './commerce';
import type { Commande } from '../../src/types';
import type { EtatPersiste } from '../../src/types/state';
import { Database } from './database';
import { sendEmail } from './providers';

import { orderEmail, type OrderEmail } from '../../src/lib/orderEmail';
/** Called inside the same transaction as the order change. Never send before commit. */
export function queueOrderEmails(db: Database,s: EtatPersiste,c: Commande,event: OrderEmail) {
  const title = s.annonces.find(a=>a.id===c.annonceId)?.titre || 'Ton article';
  for (const id of [c.acheteurId,c.vendeurId]) {
    const user = s.utilisateurs.find(u=>u.id===id); if (!user) continue;
    const payload = { to: user.email,...orderEmail(c,title,event,id===c.vendeurId,liveMode()) };
    db.sql.prepare('INSERT OR IGNORE INTO email_outbox(id,user_id,payload,next_attempt) VALUES (?,?,?,?)').run(`${c.id}:${event}:${id}`,id,JSON.stringify(payload),Date.now());
  }
}
export async function flushEmails(db: Database, sender = sendEmail) {
  // One serial worker. Failed e-mails never roll back a paid/refunded order.
  await db.run(async () => {
    const rows = db.sql.prepare('SELECT * FROM email_outbox WHERE sent_at IS NULL AND attempts<8 AND next_attempt<=? LIMIT 10').all(Date.now()) as {id:string;payload:string;attempts:number}[];
    for (const row of rows) {
      try { await sender(JSON.parse(row.payload)); db.sql.prepare('UPDATE email_outbox SET sent_at=?,attempts=attempts+1,last_error=NULL WHERE id=?').run(Date.now(),row.id); }
      catch { db.sql.prepare('UPDATE email_outbox SET attempts=attempts+1,next_attempt=?,last_error=? WHERE id=?').run(Date.now()+Math.min(3600_000,30_000*2**row.attempts),'Envoi impossible : vérifier la configuration Brevo.',row.id); }
    }
  });
}
