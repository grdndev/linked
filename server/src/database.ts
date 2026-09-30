import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EtatPersiste } from '../../src/types/state';

export function emptyState(): EtatPersiste {
  return { utilisateurs: [], annonces: [], conversations: [], messages: [], commandes: [],
    litiges: [], evaluations: [], favoris: {}, recherchesSauvegardees: [], signalements: [],
    notifications: [], mouvements: [], journalAdmin: [], sessionId: null, consentementMesure: false };
}

/** Single API instance + persistent volume for the beta. All writes are serialized. */
export class Database {
  sql: DatabaseSync;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.sql = new DatabaseSync(path);
    this.sql.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS marketplace (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS codes (email TEXT PRIMARY KEY, hash TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL, sent INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS payment_data (order_id TEXT PRIMARY KEY, checkout_id TEXT, payment_intent TEXT, charge_id TEXT, transfer_id TEXT, code TEXT, code_attempts INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS accounts (user_id TEXT PRIMARY KEY, stripe_id TEXT NOT NULL UNIQUE);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS refunds (order_id TEXT PRIMARY KEY, stripe_id TEXT NOT NULL, status TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS email_outbox (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, payload TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL, sent_at INTEGER, last_error TEXT);
      CREATE TABLE IF NOT EXISTS uploads (url TEXT PRIMARY KEY, user_id TEXT NOT NULL);`);
    this.sql.prepare('INSERT OR IGNORE INTO marketplace VALUES (1, ?)').run(JSON.stringify(emptyState()));
  }
  read(): EtatPersiste {
    return JSON.parse((this.sql.prepare('SELECT data FROM marketplace WHERE id=1').get() as { data: string }).data);
  }
  /** Includes Stripe idempotent calls; keep every request using this queue, including reads. */
  run<T>(fn: (state: EtatPersiste) => Promise<T> | T): Promise<T> {
    const operation = this.queue.then(async () => {
      this.sql.exec('BEGIN IMMEDIATE');
      try {
        const state = this.read();
        const result = await fn(state);
        this.sql.prepare('UPDATE marketplace SET data=? WHERE id=1').run(JSON.stringify(state));
        this.sql.exec('COMMIT');
        return result;
      } catch (error) { this.sql.exec('ROLLBACK'); throw error; }
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
