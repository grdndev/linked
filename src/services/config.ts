const driver = process.env.EXPO_PUBLIC_API_DRIVER ?? 'mock';
if (driver !== 'mock' && driver !== 'http') throw new Error('EXPO_PUBLIC_API_DRIVER doit être mock ou http.');
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
if (driver === 'http' && !/^https?:\/\//.test(apiUrl)) throw new Error('Configure EXPO_PUBLIC_API_URL pour utiliser le serveur.');
export const CONFIG = { driver, apiUrl, psp: 'stripe', versionCgu: '2026-09-30' } as const;
export const MODE_DEMO = driver === 'mock';
