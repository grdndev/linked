let compteur = 0;

export function id(prefixe: string): string {
  compteur += 1;
  const alea = Math.random().toString(36).slice(2, 8);
  return `${prefixe}_${Date.now().toString(36)}${compteur.toString(36)}${alea}`;
}

/** Code de remise en main propre à 4 chiffres (§4.6). */
export function codeRemise(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function reference(): string {
  const lettres = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let sortie = 'LK-';
  for (let i = 0; i < 3; i += 1) sortie += lettres[Math.floor(Math.random() * lettres.length)];
  sortie += '-' + String(Math.floor(1000 + Math.random() * 9000));
  return sortie;
}
