/**
 * Mesure d'audience respectueuse du RGPD (§7) — Matomo ou Plausible,
 * sans cookie publicitaire ni identifiant persistant tiers.
 */
type Proprietes = Record<string, string | number | boolean | undefined>;

let actif = false;
const tampon: { evenement: string; proprietes?: Proprietes; le: string }[] = [];

export const analytique = {
  autoriser(valeur: boolean) {
    actif = valeur;
    if (!valeur) tampon.length = 0;
  },
  suivre(evenement: string, proprietes?: Proprietes) {
    if (!actif) return;
    tampon.push({ evenement, proprietes, le: new Date().toISOString() });
    if (tampon.length > 200) tampon.splice(0, 100);
  },
  vider() {
    return tampon.splice(0, tampon.length);
  },
};
