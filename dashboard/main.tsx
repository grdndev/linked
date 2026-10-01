import { useEffect, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { Dashboard } from './Dashboard';
import { api, getToken, setToken } from './api';
import { Logotype } from './ui';
import './style.css';
function App(){
 const [connected,setConnected]=useState(false);const [loading,setLoading]=useState(!!getToken());
 const [email,setEmail]=useState('');const [code,setCode]=useState('');const [sent,setSent]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const logout=()=>{void api('/auth/logout',{}).catch(()=>{});setToken(null);setConnected(false);setSent(false);setCode('');};
 useEffect(()=>{const reset=()=>{setConnected(false);setLoading(false);};window.addEventListener('liked-logout',reset);if(getToken())api('/admin/overview').then(()=>setConnected(true)).catch(e=>{setToken(null);setError(e.message);}).finally(()=>setLoading(false));return()=>window.removeEventListener('liked-logout',reset);},[]);
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');try{if(!sent){await api('/auth/code',{email});setSent(true);}else{const result=await api<{token:string}>('/auth/verify',{email,code});setToken(result.token);try{await api('/admin/overview');setConnected(true);}catch(e){await api('/auth/logout',{}).catch(()=>{});setToken(null);throw e;}}}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(loading)return <div className="loading"><Logotype hauteur={48}/><p>Ouverture de ton espace…</p></div>;
 if(connected)return <Dashboard logout={logout}/>;
 return <main className="login"><section className="login-art"><Logotype hauteur={46} sombre/><div><p className="eyebrow">LIKED · ADMINISTRATION</p><h1>Tout Liked.<br/>Un seul espace.</h1><p>Accompagne ta communauté.<br/>Fais grandir les secondes histoires.</p></div><p>La Réunion · 974</p></section><section className="login-form"><span className="badge action">ESPACE WEB PRIVÉ · TEST</span><h2>Content de te retrouver.</h2><p>Connecte-toi avec ton adresse administrateur. Un code à usage unique te sera envoyé par e-mail.</p><form onSubmit={submit}><label>Adresse e-mail<input type="email" autoComplete="email" required value={email} onChange={e=>{setEmail(e.target.value);setSent(false);setCode('');}} placeholder="ton@email.fr"/></label>{sent&&<label>Code reçu par e-mail<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e=>setCode(e.target.value)} placeholder="000000"/></label>}{error&&<p role="alert" className="error">{error}</p>}{sent&&<p>Consulte aussi tes courriers indésirables. Le code expire après dix minutes.</p>}<button className="button action" disabled={busy}>{busy?'Un instant…':sent?'Ouvrir mon dashboard':'Recevoir mon code'}</button>{sent&&<button type="button" className="button discret" disabled={busy} onClick={()=>{setSent(false);setCode('');}}>Demander un nouveau code</button>}</form><a href="/bienvenue">← Retour à l’application Liked</a></section></main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
