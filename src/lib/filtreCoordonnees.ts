/** Coordonnées masquées dans les échanges, avant et après paiement. */
const MASQUE = '•••';
const MOTIFS: RegExp[] = [
  // Adresses classiques et variantes écrites avec « arobase / point ».
  /[a-z0-9._%+-]+\s*(?:@|\(?\[?(?:at|arobase)\]?\)?)(?:\s*)[a-z0-9.-]+\s*(?:\.|\(?\[?(?:dot|point)\]?\)?)\s*[a-z]{2,}/gi,
  // Liens, y compris liens de paiement et de messagerie.
  /\b(?:https?:\/\/|www\.|mailto:|tel:)[^\s<>]+/gi,
  /\b(?:[a-z0-9-]+\.)+(?:com|fr|re|net|org|io|me|gg|app|co|be|eu|info|xyz|online|shop|social)(?:\/[^\s<>]*)?\b/gi,
  // Téléphones français et internationaux (espaces, parenthèses, tirets).
  /(?:\+\s*\d{1,3}|00\d{1,3}|0)[\s().-]*(?:\d[\s().-]*){8,12}/g,
  /\b(?:\d[\s().-]*){8,15}\b/g,
  /@[a-z0-9_.-]{2,40}/gi,
  /\b(?:snap(?:chat)?|insta(?:gram)?|whats?app|telegram|signal|discord|messenger|facebook|tiktok|fb)\s*(?:(?:c['’]est|est|sur)\s*)?[:=@-]?\s*[a-z0-9_.-]{2,40}/gi,
  // Téléphones dictés chiffre par chiffre, sans masquer les petits nombres usuels.
  /\b(?:(?:z[eé]ro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf)[\s,.-]+){7,14}(?:z[eé]ro|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf)\b/gi,
];
export interface ResultatFiltre { texte: string; filtre: boolean; }
export function filtrerCoordonnees(texte: string, actif: boolean): ResultatFiltre {
  if (!actif) return { texte, filtre: false };
  // Évite les caractères pleine chasse et les espaces invisibles dans les coordonnées.
  let sortie = texte.normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'');
  let filtre = false;
  for (const motif of MOTIFS) sortie = sortie.replace(motif, () => { filtre = true; return MASQUE; });
  return { texte: sortie, filtre };
}
export const AVERTISSEMENT_FILTRE =
  'Pour ta sécurité, les téléphones, e-mails, liens et identifiants de contact sont masqués dans les échanges, même après paiement. Organisez la vente dans la messagerie Liked.';
