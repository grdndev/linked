import { Linking, Platform } from 'react-native';
import type { StoreApi } from 'zustand';
import type { EtatLiked } from './liked';
import type { EtatPersiste } from '@/types/state';
import { api, ApiError, restoreSession, setSession, uploadPhoto } from '@/services/api';
import { alerter } from '@/lib/dialogues';

const empty: EtatPersiste = { utilisateurs: [], annonces: [], conversations: [], messages: [], commandes: [], litiges: [], evaluations: [], favoris: {}, recherchesSauvegardees: [], signalements: [], notifications: [], mouvements: [], journalAdmin: [], sessionId: null, consentementMesure: false };
type Result = { result: unknown; state: EtatPersiste };
export function installHttpStore(store: StoreApi<EtatLiked>) {
  const update = (state: EtatPersiste) => store.setState({ ...state, pret: true, erreurReseau: undefined });
  let generation = 0;
  let refresh: Promise<void> | null = null;
  const sync = () => {
    if (refresh) return refresh;
    const version = generation;
    refresh = api<EtatPersiste>('/state').then(s => { if (version === generation) update(s); }).catch(async error => {
      if (version !== generation) return;
      if (error instanceof ApiError && error.status === 401) { await setSession(null); generation++; store.setState({ ...empty, pret: true }); }
      store.setState({ erreurReseau: error.message, pret: true });
    }).finally(() => { refresh = null; });
    return refresh;
  };
  const run = async (name: string,args: unknown[]) => {
    const version = ++generation;
    const response = await api<Result>(`/commands/${name}`,{ args });
    if (version === generation) update(response.state);
    else await sync();
    return response.result;
  };
  const login = async (email: string,code: string,profile?: unknown) => {
    try {
      const response = await api<{ token: string; state: EtatPersiste }>('/auth/verify',{ email,code,profile });
      await setSession(response.token); generation++; update(response.state); return { ok: true };
    } catch(error) { return { ok: false, erreur: (error as Error).message }; }
  };
  // Replace every local mutation: unsupported commands never fall back to a mock.
  const overrides: Record<string,unknown> = {};
  for (const [name,value] of Object.entries(store.getState())) {
    if (typeof value === 'function') overrides[name] = async (...args: unknown[]) => {
      try { return await run(name,args); }
      catch(error) { alerter('Action impossible',(error as Error).message); return undefined; }
    };
  }
  store.setState({ ...empty, ...overrides,
    async amorcer() { try { await restoreSession(); await sync(); } catch(error) { store.setState({ pret: true, erreurReseau: (error as Error).message }); } },
    rafraichir: sync,
    libererFondsSiEchu: async () => {},
    incrementerVue: () => {},
    autoriserMesure: (value: boolean) => store.setState({ consentementMesure: value }),
    demanderCode: async (email: string,canal: 'email'|'sms') => {
      if (canal !== 'email') throw new Error('La vérification SMS n’est pas encore disponible.');
      await api('/auth/code',{ email }); return true;
    },
    connecter: (email: string,code?: string) => login(email,code || ''),
    inscrire: (input: { email: string; code: string; pseudo: string; commune: string; majeur: boolean }) => login(input.email,input.code,{ pseudo: input.pseudo, commune: input.commune, majeur: input.majeur }),
    connecterAvec: async () => ({ ok: false }),
    async deconnecter() {
      try { await api('/auth/logout',{}); } catch { /* Always clear this device. */ }
      await setSession(null); generation++; store.setState({ ...empty, pret: true }); await sync();
    },
    async publierAnnonce(draft) {
      try { const photos = []; for (const uri of draft.photos) photos.push(await uploadPhoto(uri)); return await run('publierAnnonce',[{ ...draft,photos }]) as string; }
      catch(error) { alerter('Publication impossible',(error as Error).message); return ''; }
    },
    async modifierAnnonce(id,patch) {
      try { await run('modifierAnnonce',[id,patch]); return true; }
      catch(error) { alerter('Modification impossible',(error as Error).message); return false; }
    },
    async ouvrirConversation(id) {
      try { return await run('ouvrirConversation',[id]) as string; }
      catch(error) { alerter('Conversation impossible',(error as Error).message); return ''; }
    },
    async ouvrirLitige(id,motif,description,uris) {
      try { const photos = []; for (const uri of uris) photos.push(await uploadPhoto(uri)); return await run('ouvrirLitige',[id,motif,description,photos]) as string; }
      catch(error) { alerter('Réclamation impossible',(error as Error).message); return ''; }
    },
    async passerCommande(input) {
      try {
        const response = await api<{ ok: boolean; commandeId: string; checkoutUrl: string; state: EtatPersiste }>('/checkout',input);
        generation++; update(response.state);
        if (Platform.OS === 'web') window.open(response.checkoutUrl,'_blank','noopener,noreferrer');
        else await Linking.openURL(response.checkoutUrl);
        return { ok: true, commandeId: response.commandeId };
      } catch(error) { return { ok: false, erreur: (error as Error).message }; }
    },
    async validerCodeRemise(id,code) {
      try {
        const response = await api<{ ok: boolean; erreur?: string; state: EtatPersiste }>(`/orders/${id}/handover`,{ code });
        generation++; update(response.state); return response;
      } catch(error) { return { ok: false, erreur: (error as Error).message }; }
    },
    exporterMesDonnees() { return JSON.stringify(store.getState().utilisateurs.find(u => u.id === store.getState().sessionId),null,2); },
  } as Partial<EtatLiked>);
}
