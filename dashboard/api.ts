declare const __API_URL__: string;
const key='liked.dashboard.session';
export const getToken=()=>sessionStorage.getItem(key);
export const setToken=(value:string|null)=>{if(value)sessionStorage.setItem(key,value);else sessionStorage.removeItem(key);};
export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,body?:unknown):Promise<T> {
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
 try {
  const token=getToken();
  const response=await fetch(__API_URL__+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
  if(response.status===204)return undefined as T;
  const data=await response.json();
  if(!response.ok){if(response.status===401 || (response.status===403 && path==='/admin/overview')){setToken(null);window.dispatchEvent(new Event('liked-logout'));}throw new ApiError(data.erreur||'Service indisponible.',response.status);}
  return data as T;
 } catch(e) {if(e instanceof ApiError)throw e;throw new Error('Connexion impossible. Vérifie le réseau puis réessaie.');}
 finally {clearTimeout(timer);}
}
