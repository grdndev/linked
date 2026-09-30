import { filtrerCoordonnees } from '../../src/lib/filtreCoordonnees';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { EtatPersiste } from '../../src/types/state';
import type { Utilisateur } from '../../src/types';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function check(value: unknown, message = 'Action non autorisée.', status = 403): asserts value {
  if (!value) throw new HttpError(status, message);
}
export const token = () => randomBytes(32).toString('hex');
export const code = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
export const digest = (value: string, secret: string) => createHmac('sha256', secret).update(value).digest('hex');
export function equal(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function requireUser(state: EtatPersiste, id: string | null): Utilisateur {
  const user = state.utilisateurs.find(u => u.id === id);
  check(user, 'Connecte-toi pour continuer.', 401);
  check(user.statut === 'actif' || user.statut === 'averti', 'Ce compte est suspendu.');
  return user;
}

/** Explicit allowlist: no email, phone, bank details, DAC7, preferences or balance. */
export function publicProfile(u: Utilisateur) {
  const { id, pseudo, commune, photoUrl, bio, dateInscription, noteMoyenne, nombreEvaluations, nombreVentes } = u;
  return { id, pseudo: filtrerCoordonnees(pseudo,true).texte, commune, photoUrl, bio: bio ? filtrerCoordonnees(bio,true).texte : undefined, dateInscription, noteMoyenne, nombreEvaluations, nombreVentes };
}
export function snapshot(state: EtatPersiste, userId: string | null) {
  const me = state.utilisateurs.find(u => u.id === userId);
  const admin = me?.role === 'admin';
  const conversations = state.conversations.filter(c => c.acheteurId === userId || c.vendeurId === userId);
  const commands = state.commandes.filter(c => admin || c.acheteurId === userId || c.vendeurId === userId);
  const conversationIds = new Set(conversations.map(c => c.id));
  const orderIds = new Set(commands.map(c => c.id));
  return {
    utilisateurs: state.utilisateurs.map(u => u.id === userId ? u : publicProfile(u)),
    annonces: state.annonces.filter(a => admin || a.statut === 'en_ligne' || a.vendeurId === userId || commands.some(c => c.annonceId === a.id)),
    conversations: conversations.map(c=>({...c,filtrageLeve:false})),
    messages: state.messages.filter(m => conversationIds.has(m.conversationId)).map(m=>{
      const filtered=filtrerCoordonnees(m.texte,true);return {...m,texte:filtered.texte,filtre:m.filtre || filtered.filtre};
    }),
    commandes: commands.map(c => ({ ...c, codeRemise: c.acheteurId === userId ? c.codeRemise : undefined })),
    litiges: state.litiges.filter(l => orderIds.has(l.commandeId)), evaluations: state.evaluations,
    favoris: userId ? { [userId]: state.favoris[userId] ?? [] } : {},
    recherchesSauvegardees: state.recherchesSauvegardees.filter(r => r.utilisateurId === userId),
    signalements: state.signalements.filter(s => admin || s.auteurId === userId),
    notifications: state.notifications.filter(n => n.utilisateurId === userId),
    mouvements: state.mouvements.filter(m => m.utilisateurId === userId),
    journalAdmin: admin ? state.journalAdmin : [], sessionId: userId, consentementMesure: false,
  };
}
