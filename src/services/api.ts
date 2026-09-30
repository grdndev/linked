import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { CONFIG } from './config';
// Native: Keychain / Keystore. Web preview: memory only, never localStorage.
let session: string | null = null;
const SESSION_KEY = 'liked.api.session';
export async function restoreSession() {
  session = Platform.OS === 'web' ? null : await SecureStore.getItemAsync(SESSION_KEY);
}
export async function setSession(value: string | null) {
  session = value;
  if (Platform.OS === 'web') return;
  if (value) await SecureStore.setItemAsync(SESSION_KEY,value);
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(),25000);
  try {
    const response = await fetch(`${CONFIG.apiUrl}${path}`, {
      method: body === undefined ? 'GET' : 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json();
    if (!response.ok) throw new ApiError(data.erreur ?? 'Le serveur est indisponible.',response.status);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Connexion impossible. Vérifie ton réseau et réessaie.',0);
  } finally { clearTimeout(timeout); }
}
export async function uploadPhoto(uri: string) {
  if (uri.startsWith(`${CONFIG.apiUrl}/media/`)) return uri;
  const form = new FormData();
  if (Platform.OS === 'web') form.append('photo',await (await fetch(uri)).blob(),'photo.jpg');
  else form.append('photo',{ uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(),45000);
  try {
    const response = await fetch(`${CONFIG.apiUrl}/uploads`,{ method: 'POST', headers: session ? { Authorization: `Bearer ${session}` } : {}, body: form, signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erreur || 'Impossible d’envoyer la photo.');
    return data.url as string;
  } finally { clearTimeout(timeout); }
}
