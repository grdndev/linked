import { reglagesApplication } from '../../src/lib/reglages';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { EtatPersiste } from '../../src/types/state';
import type { Annonce, Utilisateur, CanalEvenement } from '../../src/types';
import { COMMUNES } from '../../src/data/communes';
import { filtrerCoordonnees } from '../../src/lib/filtreCoordonnees';
import { check, HttpError, requireUser } from './security';

export const now = () => new Date().toISOString();
export const uid = () => randomUUID();
const text = z.string().trim().min(1).max(4000);
const key = z.string().min(1).max(100);
const cents = z.number().int().min(100).max(1_000_000);
const commune = z.enum(COMMUNES);
const photo = z.string().url().max(2000);
const profile = z.object({ pseudo: z.string().trim().min(2).max(40), commune, bio: z.string().max(500).optional(), photoUrl: photo.optional() });
export const listingSchema = z.object({
  titre: z.string().trim().min(5).max(100), description: z.string().max(4000), photos: z.array(photo).min(1).max(8),
  universe: z.enum(['femme', 'homme', 'enfant']), categorie: key, taille: key, marque: key, couleur: key,
  etat: z.enum(['neuf_avec_etiquette', 'neuf_sans_etiquette', 'tres_bon', 'bon', 'satisfaisant']),
  prixCents: cents, gabarit: z.enum(['petit', 'moyen', 'volumineux']),
  accepteMainPropre: z.boolean(), communeRemise: commune.optional(), accepteEnvoi: z.boolean(),
}).refine(a => a.accepteMainPropre || a.accepteEnvoi, 'Choisis un mode de remise.')
  .refine(a => !a.accepteMainPropre || !!a.communeRemise, 'Indique une commune.');
export const registration = z.object({ pseudo: profile.shape.pseudo, commune, majeur: z.boolean() });
const channels: CanalEvenement[] = ['nouveau_message', 'offre_recue', 'article_vendu', 'etiquette_disponible', 'colis_livre', 'code_remise', 'fonds_verses', 'evaluation_recue', 'alerte_recherche'];

export function newUser(email: string, input: z.infer<typeof registration>): Utilisateur {
  const prefs = Object.fromEntries(channels.map(c => [c, true])) as Record<CanalEvenement, boolean>;
  return { id: uid(), email, ...input, emailVerifie: true, telephoneVerifie: false, dateInscription: now(),
    role: 'membre', statut: 'actif', noteMoyenne: 0, nombreEvaluations: 0, nombreVentes: 0,
    kyc: 'non_requis', soldePortefeuilleCents: 0,
    dac7: { pays: 'FR', montantAnnuelCents: 0, nombreTransactionsAnnuel: 0, anneeReference: new Date().getFullYear() },
    preferences: { email: { ...prefs }, push: { ...prefs }, prospectionCommerciale: false } };
}

export function command(s: EtatPersiste, userId: string, name: string, args: unknown[]) {
  const u = requireUser(s, userId);
  const getListing = (id: unknown) => {
    const a = s.annonces.find(a => a.id === key.parse(id));
    check(a, 'Article introuvable.', 404); return a;
  };
  const getConversation = (id: unknown) => {
    const c = s.conversations.find(c => c.id === key.parse(id));
    check(c && [c.acheteurId, c.vendeurId].includes(u.id)); return c;
  };
  const audit = (action: string, cible: string, detail?: string) => s.journalAdmin.push({ id: uid(), adminId: u.id, action, cible, detail, le: now() });
  const admin = () => check(u.role === 'admin');
  const notify = (to: string, canal: CanalEvenement, titre: string, lien: string) => {
    s.notifications.unshift({ id: uid(), utilisateurId: to, canal, titre, corps: '', lien, le: now(), lue: false });
  };
  switch (name) {
    case 'majProfil': Object.assign(u, profile.partial().parse(args[0])); return;
    case 'majPreference': {
      const [channel, event, value] = z.tuple([z.enum(['email','push']), z.enum(channels as [CanalEvenement, ...CanalEvenement[]]), z.boolean()]).parse(args);
      u.preferences[channel][event] = value; return;
    }
    case 'majProspection': u.preferences.prospectionCommerciale = z.boolean().parse(args[0]); return;
    case 'publierAnnonce': {
      check(reglagesApplication(s).publicationsOuvertes, 'Les nouvelles publications sont momentanément suspendues.',409);
      check(u.majeur, 'La vente est réservée aux personnes majeures.');
      const data = listingSchema.parse(args[0]);
      check(reglagesApplication(s).colissimoActif || data.accepteMainPropre,'Colissimo est désactivé : propose une remise en main propre.',422);
      const a: Annonce = { ...data, id: uid(), vendeurId: u.id, statut: 'en_ligne', publieeLe: now(), favoris: 0, vues: 0, signalements: 0 };
      s.annonces.unshift(a); return a.id;
    }
    case 'modifierAnnonce': {
      const a = getListing(args[0]); check(a.vendeurId === u.id && ['en_ligne','masquee'].includes(a.statut));
      const patch = z.record(z.string(), z.unknown()).parse(args[1]);
      if (patch.statut !== undefined) a.statut = z.enum(['en_ligne','masquee']).parse(patch.statut);
      const data = listingSchema.parse({ ...a, ...patch });
      Object.assign(a, data); return;
    }
    case 'supprimerAnnonce': {
      const a = getListing(args[0]); check(a.vendeurId === u.id && ['en_ligne','masquee'].includes(a.statut));
      a.statut = 'supprimee'; return;
    }
    case 'incrementerVue': return; // Client view counts are not authoritative.
    case 'basculerFavori': {
      const a = getListing(args[0]); check(a.statut === 'en_ligne');
      const list = s.favoris[u.id] ?? []; const exists = list.includes(a.id);
      s.favoris[u.id] = exists ? list.filter(id => id !== a.id) : [...list, a.id];
      a.favoris = Math.max(0, a.favoris + (exists ? -1 : 1)); return;
    }
    case 'ouvrirConversation': {
      const a = getListing(args[0]);
      const own = s.conversations.find(c => c.annonceId === a.id && c.acheteurId === u.id);
      if (own) return own.id;
      // A seller opens the buyer conversation from the order, never creates one as buyer.
      if (a.vendeurId === u.id) {
        const order = s.commandes.find(c => c.annonceId === a.id && !['annulee','remboursee'].includes(c.statut));
        const existing = s.conversations.find(c => c.annonceId === a.id && c.acheteurId === order?.acheteurId);
        check(existing, 'Aucune conversation pour cette vente.', 404); return existing.id;
      }
      check(a.statut === 'en_ligne', 'Cet article n’est plus disponible.', 409);
      const c = { id: uid(), annonceId: a.id, acheteurId: u.id, vendeurId: a.vendeurId, derniereActiviteLe: now(), filtrageLeve: false, luPar: [u.id] };
      s.conversations.unshift(c); return c.id;
    }
    case 'envoyerMessage': case 'faireOffre': {
      const c = getConversation(args[0]); const offer = name === 'faireOffre';
      if (offer) check(c.acheteurId === u.id && getListing(c.annonceId).statut === 'en_ligne');
      const amount = offer ? cents.parse(args[1]) : undefined;
      const filtered = filtrerCoordonnees(offer ? `Offre : ${(amount! / 100).toFixed(2)} €` : text.parse(args[1]), true);
      s.messages.push({ id: uid(), conversationId: c.id, auteurId: u.id, ...filtered, envoyeLe: now(),
        offre: amount ? { montantCents: amount, statut: 'en_attente' } : undefined });
      c.luPar = [u.id]; c.derniereActiviteLe = now();
      notify(c.acheteurId === u.id ? c.vendeurId : c.acheteurId, offer ? 'offre_recue' : 'nouveau_message', offer ? 'Une nouvelle offre' : 'Un nouveau message', `/discussion/${c.id}`); return;
    }
    case 'repondreOffre': {
      const m = s.messages.find(m => m.id === key.parse(args[0])); check(m?.offre?.statut === 'en_attente');
      const c = getConversation(m.conversationId); check(c.vendeurId === u.id);
      check(getListing(c.annonceId).statut === 'en_ligne');
      const response = z.enum(['acceptee','refusee']).parse(args[1]);
      if (args[2] != null) throw new HttpError(422, 'Les contre-offres ne sont pas encore disponibles sur l’API.');
      if (response === 'acceptee') for (const other of s.messages) {
        if (other.conversationId === c.id && other.offre?.statut === 'acceptee') other.offre.statut = 'expiree';
      }
      m.offre.statut = response; notify(c.acheteurId, 'offre_recue', `Offre ${response === 'acceptee' ? 'acceptée' : 'refusée'}`, `/discussion/${c.id}`); return;
    }
    case 'marquerLu': { const c = getConversation(args[0]); if (!c.luPar.includes(u.id)) c.luPar.push(u.id); return; }
    case 'signaler': {
      const [type, cibleId, motif, detail] = z.tuple([z.enum(['annonce','utilisateur','message']), key, text, text.optional()]).parse([args[0],args[1],args[2],args[3]]);
      if (type === 'message') { const m = s.messages.find(m => m.id === cibleId); check(m); getConversation(m.conversationId); }
      s.signalements.push({ id: uid(), type, cibleId, auteurId: u.id, motif, detail, le: now(), traite: false }); return;
    }
    case 'ouvrirLitige': {
      const c = s.commandes.find(c => c.id === key.parse(args[0]));
      check(c && c.acheteurId === u.id && ['sequestre','etiquette_emise','expedie','livre'].includes(c.statut));
      check(!c.litigeId && (!c.liberableLe || new Date(c.liberableLe).getTime() > Date.now()), 'Le délai de réclamation est terminé.', 409);
      const motif = z.enum(['non_recu','non_conforme','contrefacon','endommage','autre']).parse(args[1]);
      const description = text.parse(args[2]); const photos = z.array(photo).max(8).parse(args[3]);
      const id = uid(); s.litiges.push({ id, commandeId: c.id, ouvertPar: u.id, motif, description, photos, statut: 'ouvert', ouvertLe: now(), messages: [] });
      c.statut = 'litige'; c.litigeId = id; c.liberableLe = undefined;
      c.journal.push({ le: now(), libelle: 'Litige ouvert, transfert suspendu' }); return id;
    }
    case 'repondreLitige': {
      const l = s.litiges.find(l => l.id === key.parse(args[0])); check(l && ['ouvert','en_examen'].includes(l.statut));
      const c = s.commandes.find(c => c.id === l.commandeId)!;
      check(u.role === 'admin' || [c.acheteurId,c.vendeurId].includes(u.id));
      l.messages.push({ id: uid(), auteurId: u.id, texte: text.parse(args[1]), le: now(), role: u.role === 'admin' ? 'support' : c.acheteurId === u.id ? 'acheteur' : 'vendeur' }); return;
    }
    case 'evaluer': {
      const c = s.commandes.find(c => c.id === key.parse(args[0]));
      check(c?.statut === 'finalisee' && [c.acheteurId,c.vendeurId].includes(u.id));
      check(!s.evaluations.some(e => e.commandeId === c.id && e.auteurId === u.id), 'Tu as déjà évalué cette transaction.', 409);
      const buyer = c.acheteurId === u.id; const cibleId = buyer ? c.vendeurId : c.acheteurId;
      s.evaluations.push({ id: uid(), commandeId: c.id, auteurId: u.id, cibleId, note: z.number().int().min(1).max(5).parse(args[1]), commentaire: z.string().max(1000).parse(args[2]), le: now(), role: buyer ? 'acheteur' : 'vendeur' });
      const target = s.utilisateurs.find(u => u.id === cibleId)!; const ratings = s.evaluations.filter(e => e.cibleId === cibleId);
      target.nombreEvaluations = ratings.length; target.noteMoyenne = ratings.reduce((sum,e) => sum+e.note,0)/ratings.length;
      if (buyer) c.evaluationAcheteurFaite = true; else c.evaluationVendeurFaite = true; return;
    }
    case 'marquerNotificationLue': {
      const n = s.notifications.find(n => n.id === key.parse(args[0]) && n.utilisateurId === u.id); if (n) n.lue = true; return;
    }
    case 'toutMarquerLu': s.notifications.filter(n => n.utilisateurId === u.id).forEach(n => n.lue = true); return;
    case 'sauvegarderRecherche': {
      const filters = z.object({ texte: z.string().max(200).optional(), universe: z.enum(['femme','homme','enfant']).optional(), categorie: key.optional(), tailles: z.array(key).max(30).optional(), marques: z.array(key).max(30).optional(), etats: z.array(listingSchema.shape.etat).max(5).optional(), communes: z.array(commune).max(24).optional(), prixMinCents: z.number().int().min(0).optional(), prixMaxCents: z.number().int().min(0).optional(), mode: z.enum(['main_propre','colissimo']).optional(), tri: z.enum(['recent','prix_croissant','prix_decroissant','commune']).optional() }).parse(args[1]);
      check(s.recherchesSauvegardees.filter(r => r.utilisateurId === u.id).length < 50,'Maximum 50 recherches.',422);
      s.recherchesSauvegardees.push({ id: uid(), utilisateurId: u.id, nom: key.parse(args[0]), filtres: filters, alerte: z.boolean().parse(args[2]), creeeLe: now(), derniereVueLe: now() }); return;
    }
    case 'supprimerRecherche': s.recherchesSauvegardees = s.recherchesSauvegardees.filter(r => !(r.id === args[0] && r.utilisateurId === u.id)); return;
    case 'marquerRechercheVue': { const r = s.recherchesSauvegardees.find(r => r.id === args[0] && r.utilisateurId === u.id); if (r) r.derniereVueLe = now(); return; }
    case 'modererAnnonce': {
      admin(); const a = getListing(args[0]); check(!['reservee','vendue'].includes(a.statut), 'Une transaction est liée à cet article.', 409);
      const action = z.enum(['masquer','retablir','supprimer']).parse(args[1]);
      a.statut = action === 'masquer' ? 'masquee' : action === 'retablir' ? 'en_ligne' : 'supprimee'; audit(name,a.id,text.parse(args[2])); return;
    }
    case 'sanctionner': {
      admin(); const target = s.utilisateurs.find(u => u.id === key.parse(args[0])); check(target && target.id !== u.id && target.role !== 'admin');
      target.statut = z.enum(['actif','averti','suspendu','banni']).parse(args[1]); audit(name,target.id,text.parse(args[2])); return;
    }
    case 'traiterSignalement': { admin(); const r = s.signalements.find(r => r.id === key.parse(args[0])); check(r); r.traite = true; audit(name,r.id); return; }
    default: throw new HttpError(501, 'Cette fonction n’est pas encore raccordée au serveur. Aucune opération effectuée.');
  }
}
