export const DELAI_LIBERATION_MS = 48 * 60 * 60 * 1000; // 48 h après livraison (§4.6)
export const DELAI_LITIGE_MS = 48 * 60 * 60 * 1000; // 48 h pour ouvrir un litige (§4.7)

export function maintenant(): string {
  return new Date().toISOString();
}

export function depuis(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours === 1) return 'hier';
  if (jours < 30) return `il y a ${jours} j`;
  const mois = Math.floor(jours / 30);
  if (mois < 12) return `il y a ${mois} mois`;
  return `il y a ${Math.floor(mois / 12)} an(s)`;
}

export function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function heureCourte(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function compteARebours(iso: string): string {
  const delta = new Date(iso).getTime() - Date.now();
  if (delta <= 0) return 'maintenant';
  const heures = Math.floor(delta / 3600000);
  const minutes = Math.floor((delta % 3600000) / 60000);
  if (heures >= 1) return `${heures} h ${String(minutes).padStart(2, '0')}`;
  return `${minutes} min`;
}
