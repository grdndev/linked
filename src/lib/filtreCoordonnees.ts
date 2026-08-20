/**
 * Filtrage des coordonnées dans la messagerie — §4.4.
 * Avant paiement, on masque téléphones, e-mails et identifiants sociaux pour
 * limiter le contournement de la plateforme. Le filtrage est levé après paiement.
 */

const MASQUE = '•••';

const MOTIFS: RegExp[] = [
  // E-mails, y compris les contournements « nom (at) domaine point fr »
  /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\s+at\s+)\s*[a-z0-9.-]+\s*(?:\.|\(dot\)|\s+point\s+)\s*[a-z]{2,}/gi,
  // Numéros réunionnais et métropolitains, espacés, pointés ou écrits en toutes lettres partiellement
  /(?:\+262|\+33|00262|0)\s*[.\- ]?(?:\d[.\- ]?){8,12}/g,
  // Identifiants de réseaux sociaux
  /(?:@[a-z0-9_.]{3,30})\b/gi,
  /\b(?:snap(?:chat)?|insta(?:gram)?|whats?app|wa|telegram|tg|messenger|fb|facebook|tiktok)\s*[:=\-]?\s*[a-z0-9_.]{3,30}\b/gi,
  // Suites de 8 chiffres et plus écrites en lettres/chiffres collés
  /\b\d{8,}\b/g,
];

export interface ResultatFiltre {
  texte: string;
  filtre: boolean;
}

export function filtrerCoordonnees(texte: string, actif: boolean): ResultatFiltre {
  if (!actif) return { texte, filtre: false };
  let sortie = texte;
  let filtre = false;
  for (const motif of MOTIFS) {
    sortie = sortie.replace(motif, () => {
      filtre = true;
      return MASQUE;
    });
  }
  return { texte: sortie, filtre };
}

export const AVERTISSEMENT_FILTRE =
  "Pour ta sécurité, les numéros et adresses sont masqués tant que l'achat n'est pas payé. " +
  'Une fois le paiement fait, vous pourrez échanger librement pour organiser la remise.';
