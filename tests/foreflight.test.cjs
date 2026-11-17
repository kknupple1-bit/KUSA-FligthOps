'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const express=require('express'),{DatabaseSync}=require('node:sqlite');
const {extractPlan,validDate}=require('../foreflight-parser');
const install=require('../foreflight-service');
const {pdf,plan}=require('./foreflight-fixtures.cjs');
test('parser only proposes explicit unambiguous fields and pounds',()=>{
 const p=extractPlan(plan('N33AP'));assert.equal(p.fields.fob_lb,9000);assert.equal(p.fields.trip_lb,3000);assert.equal(p.fields.registration,'N33AP');assert.equal(p.fields.departure,'KDTO');
 assert.equal(extractPlan(plan('N33AP')+'\nDeparture: KOPF').fields.departure,null);
 assert.equal(extractPlan(plan('N33AP').replace('9,000 lbs','9000 kg')).fields.fob_lb,null);
 assert.equal(extractPlan('ForeFlight\nFlight Date: 11/12/2026').fields.date,null);
 assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2026-11-17'),true);
 assert.throws(()=>extractPlan('Some other document'));
 assert.throws(()=>extractPlan('ForeFlight'+'x'.repeat(120000)));
 const message=extractPlan('ForeFlight\n(FPL-N33AP-IG-FA50/M-SDE2E3FGHIRWY/LB1-KDTO1530-N0400F350 DCT-KBPT0130 KIAH-DOF/261117)');
 assert.equal(message.fields.departure,'KDTO');assert.equal(message.fields.destination,'KBPT');assert.equal(message.fields.alternate,'KIAH');
});
test('real PDF worker extracts text, rejects malformed input and cleans up',async()=>{
 const result=await install.readPdf(pdf(plan('N33AP')));assert.equal(result.pages,1);const p=extractPlan(result.text);assert.equal(p.fields.fob_lb,9000);assert.equal(p.fields.departure,'KDTO');
 await assert.rejects(()=>install.readPdf(Buffer.from('%PDF-invalid')));
});
test('upload-only connections and reviewed trip creation enforce identity, access and idempotency',async t=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 db.exec(fs.readFileSync(path.join(__dirname,'../platform.js'),'utf8').match(/db\.exec\(`\s*(CREATE TABLE IF NOT EXISTS organizations[\s\S]*?)`\);/)[1]);
 const now=new Date().toISOString(),expiry='2099-01-01T00:00:00.000Z';
 for(const o of ['a','b'])db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(o,o,o,now);
 for(const [u,o,role]of [['pilot','a','pilot'],['other','a','pilot'],['viewer','a','viewer'],['outsider','b','administrator']]){
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)').run(u,u+'@example.invalid',u,'s','h','active',now,now);
  db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?)').run(u+'m',o,u,role,now);
  db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?,?)').run(u+'s',u,u+'hash',null,null,now,now,expiry,null);
 }
 for(const [a,reg]of [['f50','N33AP'],['f900','N699BG']]){
  db.prepare('INSERT INTO aircraft VALUES(?,?,?,?,?,?,?,?,?,?)').run(a,'a',reg,'model',null,a,null,'active',now,now);
  for(const u of ['pilot','other','viewer'])db.prepare('INSERT INTO aircraft_access VALUES(?,?,?,?,?)').run(a+u,a,u,'pilot',now);
 }
 const app=express();app.use(express.json({limit:'1mb'}));
 const requireAuth=(req,res,next)=>{const u=req.get('X-Test-User');if(!u)return res.status(401).json({ok:false,error:'AUTH_REQUIRED'});req.flightopsSession={user_id:u,id:u+'s',expires_at:expiry};next();};
 const opts={db,requireAuth,id:p=>p+'_'+crypto.randomBytes(12).toString('hex'),isoNow:()=>new Date().toISOString()};
 require('../mission-service')(app,opts);install(app,{...opts,pdfReader:async bytes=>({text:bytes.toString().slice(6),pages:1})});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 async function api(user,url,method='GET',body,headers={}){const r=await fetch(base+url,{method,headers:{...(user?{'X-Test-User':user}:{}),'Content-Type':'application/json','X-FlightOps-Action':'foreflight',...headers},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};}
 async function upload(key,text=plan('N33AP'),headers={}){const r=await fetch(base+'/api/foreflight/upload',{method:'POST',headers:{'Content-Type':'application/pdf',...(key?{'X-FlightOps-Upload-Key':key}:{}),...headers},body:Buffer.from('%PDF-\n'+text)});return {status:r.status,...await r.json()};}
 let key,cid,iid,mid;
 const reviewed={aircraft_id:'f50',date:'2026-11-17',departure:'KDTO',destination:'KBPT',alternate:'KIAH',fob_lb:9000,trip_lb:3000,taxi_lb:200,reviewed:true};
 try{
  await t.test('anonymous/viewer/outsider cannot provision; cross-site action header required',async()=>{
   assert.equal((await api(null,'/api/foreflight/connections','POST',{})).status,401);
   for(const u of ['viewer','outsider'])assert.equal((await api(u,'/api/foreflight/connections','POST',{})).status,403);
   assert.equal((await api('pilot','/api/foreflight/connections','POST',{}, {'X-FlightOps-Action':''})).status,403);
  });
  await t.test('key is shown once, hashed at rest, upload-only and session bound',async()=>{
   const c=await api('pilot','/api/foreflight/connections','POST',{label:'Test iPad'});assert.equal(c.status,201);key=c.upload_key;cid=c.connection.id;
   assert.notEqual(db.prepare('SELECT token_hash FROM foreflight_connections').get().token_hash,key);
   assert(!JSON.stringify(await api('pilot','/api/foreflight/connections')).includes(key));
   assert.equal((await upload(null)).status,401);
   assert.equal((await api(null,'/api/missions','GET',null,{'X-FlightOps-Upload-Key':key})).status,401);
  });
  await t.test('upload creates private review only; duplicate PDF returns same review',async()=>{
   const r=await upload(key);assert.equal(r.status,201);iid=new URL(r.open_url).searchParams.get('import');
   assert.equal(db.prepare('SELECT COUNT(*) n FROM missions').get().n,0);
   assert.equal((await upload(key)).open_url,r.open_url);
   assert.equal((await api('other','/api/foreflight/imports/'+iid)).status,404);
   assert.equal((await api(null,'/api/foreflight/imports/'+iid)).status,401);
  });
  await t.test('wrong media, oversized and compressed bodies cannot reach PDF parsing',async()=>{
   assert.equal((await upload(key,plan('N33AP'),{'Content-Type':'application/octet-stream'})).status,400);
   assert.equal((await upload(key,'x'.repeat(4*1024*1024))).status,413);
   assert.equal((await upload(key,plan('N33AP'),{'Content-Encoding':'gzip'})).status,400);
  });
  await t.test('review, valid fuel and tail matching required; no inherited reviews',async()=>{
   for(const b of [{reviewed:false},{fob_lb:100},{trip_lb:'3000'},{aircraft_id:'f900'},{date:'2026-02-30'},{departure:'ZZZZ'}])assert.equal((await api('pilot',`/api/foreflight/imports/${iid}/create`,'POST',{...reviewed,...b})).status,400);
   const r=await api('pilot',`/api/foreflight/imports/${iid}/create`,'POST',reviewed);assert.equal(r.status,201);mid=r.mission_id;
   const mission=(await api('other','/api/missions/'+mid)).mission;assert.equal(mission.scope,'aircraft');assert.equal(mission.signoffs.length,0);assert.equal(mission.payload.state.captain_weight_lb,190);assert.equal(mission.payload.state.taxi_fuel_lb,200);assert.equal(mission.payload.state.fob_verified,false);
   assert.equal((await api('pilot',`/api/foreflight/imports/${iid}/create`,'POST',reviewed)).mission_id,mid);
   assert.equal(db.prepare('SELECT COUNT(*) n FROM missions').get().n,1);
   const updated=await api('other','/api/missions/'+mid,'PUT',{expected_revision:1,payload:{state:mission.payload.state}});assert.equal(updated.mission.payload.foreflight_import.content_sha256,mission.payload.foreflight_import.content_sha256);
  });
  await t.test('900B mapping, missing extraction, deletion and transactional rollback',async()=>{
   const r=await upload(key,plan('N699BG'));const id2=new URL(r.open_url).searchParams.get('import');
   const created=await api('pilot',`/api/foreflight/imports/${id2}/create`,'POST',{...reviewed,aircraft_id:'f900',fob_lb:15000});
   const m=(await api('pilot','/api/missions/'+created.mission_id)).mission;assert.equal(m.payload.state.f900b.captain_weight_lb,170);assert.equal(m.payload.state.f900b.first_officer_weight_lb,170);assert.equal(m.payload.state.f900b.fob_lb,15000);
   const empty=await upload(key,'ForeFlight\nAircraft: N33AP');const id3=new URL(empty.open_url).searchParams.get('import');assert.equal((await api('pilot','/api/foreflight/imports/'+id3)).import.fields.departure,null);
   db.exec("CREATE TRIGGER reject_import BEFORE INSERT ON mission_revisions BEGIN SELECT RAISE(ABORT,'test'); END");
   const count=db.prepare('SELECT COUNT(*) n FROM missions').get().n;
   assert.equal((await api('pilot',`/api/foreflight/imports/${id3}/create`,'POST',reviewed)).status,500);assert.equal(db.prepare('SELECT COUNT(*) n FROM missions').get().n,count);db.exec('DROP TRIGGER reject_import');
   db.prepare("UPDATE missions SET status='deleted' WHERE id=?").run(mid);assert.equal((await api('pilot',`/api/foreflight/imports/${iid}/create`,'POST',reviewed)).status,409);
  });
  await t.test('revoked grants, sessions, connections and expired imports are blocked',async()=>{
   db.prepare("UPDATE foreflight_imports SET expires_at='2000-01-01' WHERE id=?").run(iid);assert.equal((await api('pilot','/api/foreflight/imports/'+iid)).status,404);
   db.prepare('DELETE FROM aircraft_access WHERE user_id=?').run('pilot');assert.equal((await upload(key)).status,401);
   db.prepare('INSERT INTO aircraft_access VALUES(?,?,?,?,?)').run('grant','f50','pilot','pilot',now);
   db.prepare('UPDATE sessions SET revoked_at=? WHERE id=?').run(now,'pilots');assert.equal((await upload(key)).status,401);db.prepare('UPDATE sessions SET revoked_at=NULL WHERE id=?').run('pilots');
   await api('pilot','/api/foreflight/connections/'+cid,'DELETE');assert.equal((await upload(key)).status,401);
  });
 }finally{await new Promise(r=>server.close(r));db.close();}
});
