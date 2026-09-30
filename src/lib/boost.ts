import type { Annonce } from '../types';
export const BOOST_PLANS = [
  { id: '3j', jours: 3, prixCents: 299, nom: 'Petit coup de pouce' },
  { id: '7j', jours: 7, prixCents: 599, nom: 'Une semaine à la une' },
] as const;
export function boostActif(a: Annonce, now = Date.now()) {
  return a.statut === 'en_ligne' && !!a.boost && Date.parse(a.boost.debut) <= now && Date.parse(a.boost.fin) > now;
}
