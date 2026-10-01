export interface ReglagesApplication {
  colissimoActif: boolean;
  inscriptionsOuvertes: boolean;
  publicationsOuvertes: boolean;
  achatsOuverts: boolean;
  boostsActifs: boolean;
  boost3Cents: number;
  boost7Cents: number;
}
export const REGLAGES_DEFAUT: ReglagesApplication = {
  colissimoActif: false, inscriptionsOuvertes: true, publicationsOuvertes: true,
  achatsOuverts: true, boostsActifs: true, boost3Cents: 299, boost7Cents: 599,
};
export const reglagesApplication = (s: { reglages?: ReglagesApplication }) => ({ ...REGLAGES_DEFAUT, ...s.reglages });
export const forfaitsBoost = (s: { reglages?: ReglagesApplication }) => {
  const r = reglagesApplication(s);
  return [{id:'3j' as const,jours:3,prixCents:r.boost3Cents,nom:'Un petit coup de pouce'}, {id:'7j' as const,jours:7,prixCents:r.boost7Cents,nom:'Une semaine en lumière'}];
};
