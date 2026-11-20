'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createMailer,FROM}=require('../scripts/invitation-mail.cjs');
const env={FLIGHTOPS_INVITATION_MAIL_ENABLED:'true',FLIGHTOPS_MAIL_TENANT_ID:'11111111-1111-1111-1111-111111111111',FLIGHTOPS_MAIL_CLIENT_ID:'22222222-2222-2222-2222-222222222222',FLIGHTOPS_MAIL_CLIENT_SECRET:'invented-test-secret'};
const message={email:'pilot@example.invalid',organization:'Test department',role:'pilot',aircraft:['N33AP'],invitePath:'/invite.html?token='+'A'.repeat(43),expiresAt:'2026-11-26T12:00:00Z'};
test('Microsoft 365 message contains welcome/thanks, correct recipient, Live URL and no browser credentials',async()=>{
 const calls=[],mailer=createMailer({env,request:async(url,opt)=>{calls.push({url,opt});return calls.length===1?{ok:true,json:async()=>({access_token:'invented-access-token'})}:{status:202};}});
 assert.equal(mailer.status().configured,true);await mailer.send(message);assert.equal(calls.length,2);
 assert(calls[0].url.startsWith('https://login.microsoftonline.com/'));assert(calls[1].url.endsWith('/users/'+encodeURIComponent(FROM)+'/sendMail'));
 const data=JSON.parse(calls[1].opt.body);assert.equal(data.message.toRecipients[0].emailAddress.address,message.email);
 assert(data.message.body.content.includes('Welcome to KUSA FlightOps!\n\nThank you'));assert(data.message.body.content.includes('https://flightops.kusaaviation.com'+message.invitePath));assert(data.message.body.content.includes('N33AP'));assert(!JSON.stringify(data).includes(env.FLIGHTOPS_MAIL_CLIENT_SECRET));assert.equal(data.saveToSentItems,true);
});
test('mail configuration fails closed and separates rejected requests from uncertain sends',async()=>{
 let calls=0;const missing=createMailer({env:{},request:async()=>{calls++}});await assert.rejects(()=>missing.send(message),/NOT_CONFIGURED/);assert.equal(calls,0);
 for(const [stage,status,uncertain]of [['auth',401,false],['send',403,false],['send',500,true],['send',0,true]]){
  let n=0;const mailer=createMailer({env,request:async()=>{n++;if(stage==='auth')return {ok:false};if(n===1)return {ok:true,json:async()=>({access_token:'test'})};if(!status)throw Error('secret provider body');return {status};}});
  await assert.rejects(()=>mailer.send(message),e=>{assert.equal(e.uncertain,uncertain);assert(!e.message.includes('secret provider body'));return true;});
 }
});
test('real platform invitation sends enforce scope, acceptance, idempotency and delivery failure states',async t=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'flightops-mail-')),password=crypto.randomBytes(20).toString('hex');
 Object.assign(process.env,{NODE_ENV:'test',FLIGHTOPS_DB_PATH:path.join(temp,'test.sqlite'),FLIGHTOPS_ADMIN_EMAIL:'admin@example.invalid',FLIGHTOPS_ADMIN_PASSWORD:password});
 const express=require('express'),{installPlatform,state}=require('../platform'),db=state.db;assert(state.ok);
 let ready=true,mode='accepted',gate,release,captured=[];
 const mailer={status:()=>({configured:ready,from:FROM}),send:async msg=>{captured.push(msg);if(mode==='held')await new Promise(resolve=>{release=resolve;gate?.();});if(mode==='failed'||mode==='uncertain')throw Object.assign(Error('secret mail error'),{uncertain:mode==='uncertain'});}};
 const app=express();app.use(express.json());installPlatform(app,{invitationMailer:mailer});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function api(url,{cookie='',method='GET',body,action=true,host}={}){const r=host?await new Promise((resolve,reject)=>{const http=require('node:http'),data=body?JSON.stringify(body):null;const req=http.request(base+url,{method,headers:{'Content-Type':'application/json',Host:host,...(cookie?{Cookie:cookie}:{}),...(action?{'X-FlightOps-Action':'invitation'}:{})}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(text),headers:{get:()=>null}}));});req.on('error',reject);req.end(data);}) : await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(action?{'X-FlightOps-Action':'invitation'}:{}),...(host?{Host:host}:{})},...(body?{body:JSON.stringify(body)}:{})});const j=await r.json();return {status:r.status,body:j,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
  const admin=(await api('/api/auth/login',{method:'POST',body:{email:'admin@example.invalid',password}})).cookie;
  const org=db.prepare('SELECT organization_id FROM memberships').get().organization_id,aircraft=db.prepare('SELECT id FROM aircraft WHERE organization_id=? ORDER BY registration').all(org).map(x=>x.id);
  const payload=(email='new@example.invalid')=>({delivery:'email',organization_id:org,email,role:'pilot',aircraft_ids:[aircraft[0]],request_id:crypto.randomUUID()});
  await t.test('missing auth, action header and wrong organization cannot send',async()=>{
   assert.equal((await api('/api/admin/invitations',{method:'POST',body:payload()})).status,401);
   assert.equal((await api('/api/admin/invitations',{cookie:admin,method:'POST',body:payload(),action:false})).status,403);
   assert.equal((await api('/api/admin/invitations',{cookie:admin,method:'POST',body:{...payload(),organization_id:'wrong'}})).status,403);
   assert.equal((await api('/api/admin/invitations',{cookie:admin,method:'POST',body:{...payload(),aircraft_ids:['wrong']}})).status,400);assert.equal(captured.length,0);
   assert.equal((await api('/api/admin/invitations',{cookie:admin,method:'POST',body:payload(),host:'test.preview.c37.airoapp.ai'})).status,409);
  });
  await t.test('missing connection creates no invitation',async()=>{ready=false;const n=db.prepare('SELECT COUNT(*) n FROM invitations').get().n;const r=await api('/api/admin/invitations',{cookie:admin,method:'POST',body:payload()});assert.equal(r.status,503);assert.equal(db.prepare('SELECT COUNT(*) n FROM invitations').get().n,n);ready=true;});
  await t.test('successful send has no token in response and its secure link creates the correctly scoped account',async()=>{
   const body=payload(),r=await api('/api/admin/invitations',{cookie:admin,method:'POST',body});assert.equal(r.status,200);assert.equal(r.body.delivery.status,'accepted');assert(!JSON.stringify(r.body).includes('token='));
   const msg=captured.at(-1),token=msg.invitePath.split('token=')[1];assert.equal(db.prepare('SELECT token_hash FROM invitations WHERE id=?').get(r.body.delivery.invitation_id).token_hash,crypto.createHash('sha256').update(token).digest('hex'));
   assert.equal((await api('/api/invitations/'+token)).status,200);
   const accept=await api('/api/invitations/'+token+'/accept',{method:'POST',body:{display_name:'Test Pilot',password}});assert.equal(accept.status,201);
   const me=await api('/api/me',{cookie:accept.cookie});assert.deepEqual(me.body.aircraft.map(a=>a.id),[aircraft[0]]);
   assert.equal((await api('/api/admin/invitations',{cookie:accept.cookie,method:'POST',body:payload()})).status,403);
   const n=captured.length;assert.equal((await api('/api/admin/invitations',{cookie:admin,method:'POST',body})).status,200);assert.equal(captured.length,n);
   assert.equal((await api('/api/admin/invitations',{cookie:admin,method:'POST',body:{...body,email:'changed@example.invalid'}})).status,409);
  });
  await t.test('concurrent duplicate waits for the same send and never sends twice',async()=>{
   mode='held';const body=payload('held@example.invalid'),started=new Promise(r=>{gate=r}),first=api('/api/admin/invitations',{cookie:admin,method:'POST',body});await started;const n=captured.length;const second=await api('/api/admin/invitations',{cookie:admin,method:'POST',body});assert.equal(second.status,202);assert.equal(captured.length,n);release();await first;mode='accepted';
  });
  await t.test('definite failures revoke; uncertain results preserve links and never retry automatically',async()=>{
   for(const stateName of ['failed','uncertain']){mode=stateName;const body=payload(stateName+'@example.invalid'),r=await api('/api/admin/invitations',{cookie:admin,method:'POST',body});assert.equal(r.status,502);assert.equal(r.body.delivery.status,stateName);const inv=db.prepare('SELECT revoked_at FROM invitations WHERE id=?').get(r.body.delivery.invitation_id);assert.equal(!!inv.revoked_at,stateName==='failed');const n=captured.length;await api('/api/admin/invitations',{cookie:admin,method:'POST',body});assert.equal(captured.length,n);assert(!JSON.stringify(r.body).includes('secret mail error'));}mode='accepted';
  });
  await t.test('failed storage sends no email and rate limit bounds new requests',async()=>{
   db.exec("CREATE TRIGGER fail_mail BEFORE INSERT ON invitation_mail_requests BEGIN SELECT RAISE(ABORT,'private db error'); END;");const n=captured.length;assert.equal((await api('/api/admin/invitations',{cookie:admin,method:'POST',body:payload('rollback@example.invalid')})).status,503);assert.equal(captured.length,n);assert.equal(db.prepare('SELECT COUNT(*) n FROM invitations WHERE email=?').get('rollback@example.invalid').n,0);db.exec('DROP TRIGGER fail_mail');
   let last;for(let i=0;i<12;i++)last=await api('/api/admin/invitations',{cookie:admin,method:'POST',body:payload('limit'+i+'@example.invalid')});assert.equal(last.status,429);
  });
 }finally{await new Promise(r=>server.close(r));db.close();fs.rmSync(temp,{recursive:true,force:true});}
});
