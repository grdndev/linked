import type { Annonce } from '../src/types';
declare const __API_URL__: string;
export interface Seller {id:string;pseudo:string;commune:string;noteMoyenne:number;nombreEvaluations:number;nombreVentes:number;photoUrl?:string;bio?:string;}
export interface Catalogue {annonces:Annonce[];vendeurs:Seller[];colissimoActif:boolean;demonstrationIds:string[];achatsDisponibles:boolean;}
export async function loadCatalogue(signal:AbortSignal):Promise<Catalogue>{
 const res=await fetch(__API_URL__+'/catalogue',{signal});
 if(!res.ok)throw new Error('Le catalogue est momentanément indisponible. Réessaie dans un instant.');
 return res.json();
}
const sessionKey='liked.api.session';
export const getSession=()=>sessionStorage.getItem(sessionKey);
export const setSession=(token:string|null)=>{if(token)sessionStorage.setItem(sessionKey,token);else sessionStorage.removeItem(sessionKey);};
export class ShopError extends Error {constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,body?:unknown):Promise<T>{
 const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),25000);
 try{const token=getSession();const r=await fetch(__API_URL__+path,{method:body===undefined?'GET':'POST',signal:abort.signal,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});if(r.status===204)return undefined as T;const d=await r.json();if(!r.ok){if(r.status===401)setSession(null);throw new ShopError(d.erreur||'Le service est momentanément indisponible.',r.status);}return d;}catch(e){if(e instanceof ShopError)throw e;throw new Error('Connexion impossible. Réessaie dans un instant.');}finally{clearTimeout(timer);}
}
