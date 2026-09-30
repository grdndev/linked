import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { Database } from '../src/database';
import { createApp } from '../src/app';

test('API : codes à usage unique, expiration, sessions révoquées, aucune donnée démo',async t => {
  const db=new Database(':memory:'); const dir=mkdtempSync(join(tmpdir(),'liked-api-'));
  const mailbox = new Map<string,string>();
  const app=createApp(db,{secret:'a'.repeat(64),apiUrl:'http://localhost',returnUrl:'liked://mes-achats',webOrigin:'http://localhost:8081',uploadDir:dir},async (email,code)=>{mailbox.set(email,code);});
  const server=app.listen(0,'127.0.0.1'); await new Promise<void>(resolve=>server.once('listening',resolve));
  t.after(()=>{server.close(); db.sql.close(); rmSync(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post=(path:string,body:unknown,token?:string)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
  const email='person@example.test';
  const initial=await (await fetch(base+'/state')).json(); assert.deepEqual(initial.utilisateurs,[]);
  assert.equal((await post('/commands/publierAnnonce',{args:[]})).status,401);
  assert.equal((await post('/auth/code',{email})).status,200);
  assert.equal((await post('/auth/code',{email})).status,429);
  const profile={pseudo:'Testeur',commune:'Saint-Denis',majeur:true};
  assert.equal((await post('/auth/verify',{email,code:'xxxxxx',profile})).status,422);
  const wrong=mailbox.get(email)==='000000'?'000001':'000000';
  assert.equal((await post('/auth/verify',{email,code:wrong,profile})).status,400);
  const response=await post('/auth/verify',{email,code:mailbox.get(email),profile}); assert.equal(response.status,200);
  const login=await response.json(); assert.match(login.token,/^[a-f0-9]{64}$/);
  const session=db.sql.prepare('SELECT hash FROM sessions').get() as {hash:string}; assert.notEqual(session.hash,login.token);
  assert.equal((await post('/auth/verify',{email,code:mailbox.get(email),profile})).status,400);
  const data=await (await fetch(base+'/state',{headers:{Authorization:`Bearer ${login.token}`}})).json(); assert.equal(data.utilisateurs[0].email,email);
  assert.equal((await post('/commands/majStatutKyc',{args:[data.sessionId,'valide']},login.token)).status,501);
  assert.equal((await post('/auth/logout',{},login.token)).status,204);
  assert.equal((await fetch(base+'/state',{headers:{Authorization:`Bearer ${login.token}`}})).status,401);
});

test('API : cinq échecs ne peuvent être annulés par rollback',async t => {
  const db=new Database(':memory:'); const dir=mkdtempSync(join(tmpdir(),'liked-auth-')); let otp='';
  const app=createApp(db,{secret:'a'.repeat(64),apiUrl:'http://localhost',returnUrl:'liked://mes-achats',webOrigin:'http://localhost:8081',uploadDir:dir},async (_,code)=>{otp=code;});
  const server=app.listen(0,'127.0.0.1'); await new Promise<void>(resolve=>server.once('listening',resolve));
  t.after(()=>{server.close(); db.sql.close(); rmSync(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post=(path:string,body:unknown)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const email='locked@example.test'; await post('/auth/code',{email});
  const profile={pseudo:'Testeur',commune:'Saint-Denis',majeur:true};
  for(let i=0;i<5;i++) await post('/auth/verify',{email,code:otp==='000000'?'000001':'000000',profile});
  assert.equal((await post('/auth/verify',{email,code:otp,profile})).status,400);
  assert.equal(db.read().utilisateurs.length,0);
});
