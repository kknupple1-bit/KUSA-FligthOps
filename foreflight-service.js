'use strict';
const express=require('express');
const crypto=require('node:crypto');
const path=require('node:path');
const {fork}=require('node:child_process');
const {extractPlan,validDate}=require('./foreflight-parser');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function readPdf(bytes){return new Promise((resolve,reject)=>{
 const env=Object.fromEntries(['PATH','SystemRoot','SYSTEMROOT','TEMP','TMP'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
 const worker=fork(path.join(__dirname,'scripts/foreflight-pdf-worker.cjs'),[],{execArgv:['--max-old-space-size=128'],env,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
 const timer=setTimeout(()=>{worker.kill();reject(Error('PDF_NOT_READABLE'));},10000);
 const finish=()=>{clearTimeout(timer);worker.kill();};
 worker.once('message',r=>{finish();r.ok?resolve(r):reject(Error('PDF_NOT_READABLE'));});
 worker.once('error',()=>{finish();reject(Error('PDF_NOT_READABLE'));});
 worker.once('exit',()=>{clearTimeout(timer);reject(Error('PDF_NOT_READABLE'));});
 worker.send(bytes.toString('base64'));
});}
module.exports=function installForeflight(app,{db,requireAuth,id,isoNow,pdfReader=readPdf}){
 db.exec(`CREATE TABLE IF NOT EXISTS foreflight_connections (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),session_id TEXT NOT NULL REFERENCES sessions(id),
 token_hash TEXT NOT NULL UNIQUE,label TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,revoked_at TEXT);
 CREATE TABLE IF NOT EXISTS foreflight_imports (
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),connection_id TEXT NOT NULL REFERENCES foreflight_connections(id),
 content_sha256 TEXT NOT NULL,extracted_json TEXT NOT NULL,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,
 mission_id TEXT REFERENCES missions(id),UNIQUE(user_id,content_sha256));`);
 function writable(user){return db.prepare(`SELECT a.* FROM aircraft a JOIN memberships m ON m.organization_id=a.organization_id
 LEFT JOIN aircraft_access aa ON aa.aircraft_id=a.id AND aa.user_id=m.user_id
 WHERE m.user_id=? AND a.status='active' AND (m.role IN ('administrator','aircraft_manager') OR (m.role='pilot' AND aa.access_role IN ('pilot','administrator','aircraft_manager')))
 AND a.registration IN ('N33AP','N699BG') ORDER BY a.registration`).all(user);}
 function action(req,res,next){if(req.get('X-FlightOps-Action')!=='foreflight')return res.status(403).json({ok:false,error:'ACTION_REQUIRED'});next();}
 function safeConnection(c){const {id,label,created_at,expires_at,revoked_at}=c;return {id,label,created_at,expires_at,revoked_at};}
 function cleanup(){db.prepare('DELETE FROM foreflight_imports WHERE expires_at<? AND mission_id IS NULL').run(isoNow());}
 app.get('/api/foreflight/connections',requireAuth,(req,res)=>res.json({ok:true,connections:db.prepare('SELECT * FROM foreflight_connections WHERE user_id=? ORDER BY created_at DESC').all(req.flightopsSession.user_id).map(safeConnection)}));
 app.post('/api/foreflight/connections',requireAuth,action,(req,res)=>{
  const s=req.flightopsSession;if(!writable(s.user_id).length)return res.status(403).json({ok:false,error:'AIRCRAFT_ACCESS_DENIED'});
  const count=db.prepare('SELECT COUNT(*) n FROM foreflight_connections WHERE user_id=? AND revoked_at IS NULL AND expires_at>?').get(s.user_id,isoNow()).n;
  if(count>=5)return res.status(429).json({ok:false,error:'REVOKE_AN_OLD_CONNECTION'});
  const token=crypto.randomBytes(32).toString('base64url'),now=isoNow(),expires=new Date(Math.min(Date.now()+7*86400000,Date.parse(s.expires_at))).toISOString();
  const cid=id('ffc');db.prepare('INSERT INTO foreflight_connections VALUES(?,?,?,?,?,?,?,NULL)').run(cid,s.user_id,s.id,digest(token),String(req.body?.label||'iPad').trim().slice(0,60)||'iPad',now,expires);
  res.status(201).json({ok:true,connection:{id:cid,label:String(req.body?.label||'iPad').slice(0,60),expires_at:expires},upload_key:token});
 });
 app.delete('/api/foreflight/connections/:id',requireAuth,action,(req,res)=>{
  db.prepare('UPDATE foreflight_connections SET revoked_at=? WHERE id=? AND user_id=?').run(isoNow(),req.params.id,req.flightopsSession.user_id);res.json({ok:true});
 });
 // This one route uses an upload-only key, never a browser session or API master key.
 const attempts=new Map();let busy=0;
 function uploadAuth(req,res,next){
  const now=Date.now(),ip=req.socket.remoteAddress||'unknown';
  for(const [key,value]of attempts)if(value.until<now)attempts.delete(key);
  const a=attempts.get(ip)||{n:0,until:now+60000};a.n++;if(attempts.size<1000||attempts.has(ip))attempts.set(ip,a);
  if(a.n>40)return res.status(429).json({ok:false,error:'TRY_AGAIN_LATER'});
  const raw=req.get('X-FlightOps-Upload-Key')||'';
  const c=/^[A-Za-z0-9_-]{43}$/.test(raw)&&db.prepare(`SELECT c.* FROM foreflight_connections c JOIN users u ON u.id=c.user_id
 JOIN sessions s ON s.id=c.session_id WHERE c.token_hash=? AND c.revoked_at IS NULL AND c.expires_at>?
 AND u.status='active' AND s.revoked_at IS NULL AND s.expires_at>?`).get(digest(raw),isoNow(),isoNow());
  if(!c||!writable(c.user_id).length)return res.status(401).json({ok:false,error:'UPLOAD_CONNECTION_EXPIRED_OR_REVOKED'});
  req.foreflightConnection=c;next();
 }
 function importUrl(req,iid){
  const proto=req.secure||req.get('x-forwarded-proto')?.split(',')[0].trim()==='https'?'https':'http';
  const u=new URL(`/foreflight.html?import=${encodeURIComponent(iid)}`,`${proto}://${req.get('host')}`);
  if(typeof req.query.airoShareToken==='string'&&req.query.airoShareToken.length<200)u.searchParams.set('airoShareToken',req.query.airoShareToken);
  return u.href;
 }
 app.post('/api/foreflight/upload',uploadAuth,express.raw({type:'application/pdf',limit:'4mb',inflate:false}),async(req,res)=>{
  if(!Buffer.isBuffer(req.body)||req.body.length<8||req.body.subarray(0,5).toString()!=='%PDF-')return res.status(400).json({ok:false,error:'SHARE_ONE_PDF'});
  const c=req.foreflightConnection,sha=digest(req.body);cleanup();
  const prior=db.prepare('SELECT * FROM foreflight_imports WHERE user_id=? AND content_sha256=?').get(c.user_id,sha);
  if(prior){db.prepare('UPDATE foreflight_imports SET expires_at=? WHERE id=?').run(new Date(Date.now()+48*3600000).toISOString(),prior.id);return res.json({ok:true,reused:true,open_url:importUrl(req,prior.id)});}
  const recent=db.prepare('SELECT COUNT(*) n FROM foreflight_imports WHERE user_id=? AND created_at>?').get(c.user_id,new Date(Date.now()-3600000).toISOString()).n;
  if(recent>=12||busy>=2)return res.status(429).json({ok:false,error:'TRY_AGAIN_LATER'});
  busy++;
  try{
   const pdf=await pdfReader(req.body),parsed=extractPlan(pdf.text);
   // Recheck authority after asynchronous PDF work (revocation can happen meanwhile).
   const still=db.prepare('SELECT c.id FROM foreflight_connections c JOIN sessions s ON s.id=c.session_id JOIN users u ON u.id=c.user_id WHERE c.id=? AND c.revoked_at IS NULL AND c.expires_at>? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status=\'active\'').get(c.id,isoNow(),isoNow());
   if(!still||!writable(c.user_id).length)return res.status(401).json({ok:false,error:'UPLOAD_CONNECTION_EXPIRED_OR_REVOKED'});
   const iid=id('ffi');
   db.prepare('INSERT OR IGNORE INTO foreflight_imports VALUES(?,?,?,?,?,?,?,NULL)').run(iid,c.user_id,c.id,sha,JSON.stringify({...parsed,pages:pdf.pages}),isoNow(),new Date(Date.now()+48*3600000).toISOString());
   const stored=db.prepare('SELECT id FROM foreflight_imports WHERE user_id=? AND content_sha256=?').get(c.user_id,sha);
   return res.status(201).json({ok:true,open_url:importUrl(req,stored.id)});
  }catch{return res.status(422).json({ok:false,error:'PDF_NOT_READABLE_OR_UNSUPPORTED',message:'Share a text-based ForeFlight Navlog / flight-plan PDF (20 pages maximum). No trip was created.'});}
  finally{busy--;}
 });
 app.use('/api/foreflight/upload',(err,req,res,next)=>{if(err)return res.status(err.type==='entity.too.large'?413:400).json({ok:false,error:'PDF_UPLOAD_REJECTED'});next();});
 function ownImport(req,res){cleanup();const row=db.prepare('SELECT * FROM foreflight_imports WHERE id=? AND user_id=? AND expires_at>?').get(req.params.id,req.flightopsSession.user_id,isoNow());if(!row)res.status(404).json({ok:false,error:'IMPORT_NOT_FOUND_OR_EXPIRED'});return row;}
 app.get('/api/foreflight/imports/:id',requireAuth,(req,res)=>{
  const r=ownImport(req,res);if(!r)return;res.json({ok:true,import:{id:r.id,created_at:r.created_at,content_sha256:r.content_sha256,mission_id:r.mission_id,...JSON.parse(r.extracted_json)},aircraft:writable(req.flightopsSession.user_id).map(a=>({id:a.id,registration:a.registration,model:a.model}))});
 });
 app.post('/api/foreflight/imports/:id/create',requireAuth,action,(req,res)=>{
  const r=ownImport(req,res);if(!r)return;const b=req.body||{},user=req.flightopsSession.user_id;
  const a=writable(user).find(a=>a.id===b.aircraft_id);if(!a)return res.status(403).json({ok:false,error:'AIRCRAFT_ACCESS_DENIED'});
  const parsed=JSON.parse(r.extracted_json);
  if(parsed.fields.registration&&parsed.fields.registration!==a.registration)return res.status(400).json({ok:false,error:'AIRCRAFT_DOES_NOT_MATCH_PDF'});
  if(r.mission_id){const m=db.prepare('SELECT id,status FROM missions WHERE id=? AND aircraft_id=? AND organization_id=?').get(r.mission_id,a.id,a.organization_id);if(!m||m.status==='deleted')return res.status(409).json({ok:false,error:'IMPORTED_MISSION_UNAVAILABLE'});return res.json({ok:true,reused:true,mission_id:m.id});}
  const airport=v=>typeof v==='string'&&/^[A-Z]{4}$/.test(v)&&v!=='ZZZZ';
  if(b.reviewed!==true||!validDate(b.date)||!airport(b.departure)||!airport(b.destination)||(b.alternate&&!airport(b.alternate)))return res.status(400).json({ok:false,error:'REVIEW_DATE_AND_AIRPORTS'});
  if(![b.fob_lb,b.trip_lb,b.taxi_lb].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=50000)||b.fob_lb<=0||b.taxi_lb+b.trip_lb>b.fob_lb)return res.status(400).json({ok:false,error:'REVIEW_FUEL_POUNDS_AND_DEFINITIONS'});
  const now=isoNow(),mid=id('mis'),local=`FF-${r.id}`,f900=a.registration==='N699BG';
  const common={dep:b.departure,dest:b.destination,alt:b.alternate||'',trip_date:b.date,aircraft:f900?'F900B':'N33AP',registration:a.registration,note:'Imported from ForeFlight — loading and pilot reviews required',offline_mission_package:null};
  const fuel={fob_lb:b.fob_lb,mission_fuel_lb:b.trip_lb,taxi_fuel_lb:b.taxi_lb,fob_verified:false};
  const state=f900?{...common,f900b:{...fuel,captain_weight_lb:170,first_officer_weight_lb:170,passenger_count:0,total_baggage_lb:0}}:{...common,...fuel,captain_weight_lb:190,fo_weight_lb:190,passengers:[],seat_assignments:[],baggage:[0,0,0],fob_verified:false,low_fuel_confirmed:false,departure_notam_state:{status:'NOT_CHECKED',source:'NONE'},destination_notam_state:{status:'NOT_CHECKED',source:'NONE'}};
  const provenance={source:'ForeFlight PDF',content_sha256:r.content_sha256,imported_at:now,imported_by:user,extracted_fields:parsed.fields,confirmed_fields:{aircraft_id:a.id,date:b.date,departure:b.departure,destination:b.destination,alternate:b.alternate||'',fob_lb:b.fob_lb,trip_lb:b.trip_lb,taxi_lb:b.taxi_lb}};
  const payload={local_mission_id:local,aircraft:common.aircraft,registration:a.registration,note:common.note,state,foreflight_import:provenance,archive_meta:{started_at:now}};
  db.exec('BEGIN IMMEDIATE');
  try{
   // Re-check import idempotency inside the write transaction.
   const duplicate=db.prepare('SELECT mission_id FROM foreflight_imports WHERE id=?').get(r.id);
   if(duplicate.mission_id){db.exec('COMMIT');return res.json({ok:true,reused:true,mission_id:duplicate.mission_id});}
   db.prepare(`INSERT INTO missions(id,organization_id,aircraft_id,owner_user_id,trip_number,status,revision,mission_date,departure,destination,alternate,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,'draft',1,?,?,?,?,?,?,?)`).run(mid,a.organization_id,a.id,user,`FF-${b.date.replaceAll('-','')}-${r.id.slice(-6).toUpperCase()}`,b.date,b.departure,b.destination,b.alternate||null,JSON.stringify(payload),now,now);
   db.prepare('INSERT INTO mission_revisions VALUES(?,?,?,?,?,?)').run(id('rev'),mid,1,user,JSON.stringify(payload),now);
   db.prepare('UPDATE foreflight_imports SET mission_id=? WHERE id=?').run(mid,r.id);db.exec('COMMIT');
   return res.status(201).json({ok:true,mission_id:mid});
  }catch{db.exec('ROLLBACK');return res.status(500).json({ok:false,error:'TRIP_NOT_CREATED'});}
 });
};
module.exports.readPdf=readPdf;
