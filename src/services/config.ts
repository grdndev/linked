/**
 * Aiguillage des intégrations tierces (§7).
 * `mock` fait tourner l'application de bout en bout sans clés ; `http` bascule
 * sur l'API Liked qui, elle, dialogue avec Mangopay / La Poste côté serveur.
 * Aucune clé secrète ne doit vivre dans le bundle mobile.
 */
export const CONFIG = {
  driver: (process.env.EXPO_PUBLIC_API_DRIVER ?? 'mock') as 'mock' | 'http',
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.liked.re',
  psp: (process.env.EXPO_PUBLIC_PSP ?? 'mangopay') as 'mangopay' | 'lemonway',
  hebergement: 'UE',
  versionCgu: '2026-01-15',
} as const;
