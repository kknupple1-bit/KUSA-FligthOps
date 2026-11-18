'use strict';
const express=require('express');
const crypto=require('node:crypto');
const path=require('node:path');
const {fork}=require('node:child_process');
const {extractPlan,validDate,proposeRampFuel}=require('./foreflight-parser');
const {workerEnvironment,startupReason,safeReason,probePdf}=require('./scripts/foreflight-pdf-runtime.cjs');
const {installerInfo}=require('./scripts/foreflight-shortcut-installer.cjs');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const pdfMessages={
 PDF_TIMEOUT:'The hosted PDF reader timed out. No trip was created. Report the reference below so we can check it.',
 PDF_READER_UNAVAILABLE:'The hosted PDF reader could not start. This is a server problem, not a Shortcut setting. No trip was created.',
 PDF_READER_FAILED:'The hosted PDF reader stopped unexpectedly. No trip was created. Report the reference below.',
 PDF_PASSWORD_REQUIRED:'The PDF is password-protected. Share an unprotected ForeFlight Navlog / flight-plan PDF. No trip was created.',
 PDF_PAGE_LIMIT:'The PDF exceeds the 20-page limit. Share the flight Navlog / flight-plan PDF without the full briefing. No trip was created.',
 PDF_NO_TEXT:'No readable text was found in the PDF. It may contain scanned pages or images. No trip was created.',
 PDF_TEXT_LIMIT:'The PDF contains more text than this import supports. Share the flight Navlog / flight-plan PDF only. No trip was created.',
 PDF_INVALID:'The received PDF could not be decoded. Please share the same ForeFlight PDF with support for format testing. No trip was created.',
 PDF_NOT_READABLE:'The PDF reader could not decode this document. Please share the same PDF with support for format testing. No trip was created.',
 PDF_LAYOUT_NOT_RECOGNIZED:'The PDF was read, but its flight-plan layout was not recognized. We need this sample to support its format. No trip was created.',
 IMPORT_STORAGE_FAILED:'The PDF was read, but the incoming plan could not be stored. No trip was created. Report the reference below.'
};
const fault=(code,reason)=>Object.assign(Error(code),{code,...(reason?{reason:safeReason(reason)}:{})});
function readPdf(bytes){return new Promise((resolve,reject)=>{
 const env=workerEnvironment();
 let worker;
 try{worker=fork(path.join(__dirname,'scripts/foreflight-pdf-worker.cjs'),[require.resolve('pdf-parse'),require.resolve('@napi-rs/canvas/geometry'),require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')],{execArgv:['--max-old-space-size=128'],env,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});}
 catch(error){reject(fault('PDF_READER_UNAVAILABLE',startupReason(error)));return;}
 const timer=setTimeout(()=>{worker.kill();reject(fault('PDF_TIMEOUT'));},10000);
 const finish=()=>{clearTimeout(timer);worker.kill();};
 worker.once('message',r=>{finish();r.ok?resolve(r):reject(fault(Object.hasOwn(pdfMessages,r.error)?r.error:'PDF_NOT_READABLE',r.reason));});
 worker.once('error',error=>{finish();reject(fault('PDF_READER_UNAVAILABLE',startupReason(error)));});
 worker.once('exit',()=>{clearTimeout(timer);reject(fault('PDF_READER_FAILED'));});
 worker.send(bytes.toString('base64'),error=>{if(error){finish();reject(fault('PDF_READER_UNAVAILABLE','IPC_FAILED'));}});
});}
module.exports=function installForeflight(app,{db,requireAuth,id,isoNow,pdfReader=readPdf,shortcutInstaller}){
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
 function connectionExpiry(s){
  const row=db.prepare("SELECT s.expires_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'").get(s.id,s.user_id,isoNow());
  const end=row&&Date.parse(row.expires_at);return Number.isFinite(end)&&end>Date.now()?new Date(Math.min(Date.now()+7*86400000,end)).toISOString():null;
 }
 function connectionWrite(work){let started=false;try{db.exec('BEGIN IMMEDIATE');started=true;const result=work();db.exec('COMMIT');return result;}catch{if(started)try{db.exec('ROLLBACK');}catch{}return {status:503,body:{ok:false,error:'CONNECTION_UPDATE_UNAVAILABLE',message:'The connection could not be updated. Nothing was changed. Try again shortly.'}};}}
 app.get('/api/foreflight/installer',requireAuth,(req,res)=>{
  if(!writable(req.flightopsSession.user_id).length)return res.status(403).json({ok:false,error:'AIRCRAFT_ACCESS_DENIED'});
  res.json({ok:true,installer:installerInfo(req.get('host'),shortcutInstaller)});
 });
 app.get('/api/foreflight/connections',requireAuth,(req,res)=>res.json({ok:true,connections:db.prepare('SELECT * FROM foreflight_connections WHERE user_id=? ORDER BY created_at DESC').all(req.flightopsSession.user_id).map(safeConnection)}));
 app.post('/api/foreflight/connections',requireAuth,action,(req,res)=>{
  const s=req.flightopsSession;
  const result=connectionWrite(()=>{
   if(!writable(s.user_id).length)return {status:403,body:{ok:false,error:'AIRCRAFT_ACCESS_DENIED'}};
   const expires=connectionExpiry(s);if(!expires)return {status:401,body:{ok:false,error:'AUTH_REQUIRED'}};
   const count=db.prepare('SELECT COUNT(*) n FROM foreflight_connections WHERE user_id=? AND revoked_at IS NULL AND expires_at>?').get(s.user_id,isoNow()).n;
   if(count>=5)return {status:429,body:{ok:false,error:'REVOKE_AN_OLD_CONNECTION'}};
   const token=crypto.randomBytes(32).toString('base64url'),now=isoNow(),label=String(req.body?.label||'iPad').trim().slice(0,60)||'iPad',cid=id('ffc');
   db.prepare('INSERT INTO foreflight_connections VALUES(?,?,?,?,?,?,?,NULL)').run(cid,s.user_id,s.id,digest(token),label,now,expires);
   return {status:201,body:{ok:true,connection:{id:cid,label,expires_at:expires},upload_key:token}};
  });res.status(result.status).json(result.body);
 });
 app.post('/api/foreflight/connections/:id/reconnect',requireAuth,action,(req,res)=>{
  const s=req.flightopsSession;
  const result=connectionWrite(()=>{
   if(!writable(s.user_id).length)return {status:403,body:{ok:false,error:'AIRCRAFT_ACCESS_DENIED'}};
   const expires=connectionExpiry(s);if(!expires)return {status:401,body:{ok:false,error:'AUTH_REQUIRED'}};
   const c=db.prepare('SELECT * FROM foreflight_connections WHERE id=? AND user_id=?').get(req.params.id,s.user_id);
   if(!c)return {status:404,body:{ok:false,error:'CONNECTION_NOT_FOUND'}};
   if(c.revoked_at)return {status:409,body:{ok:false,error:'CONNECTION_REVOKED_CREATE_NEW'}};
   const count=db.prepare('SELECT COUNT(*) n FROM foreflight_connections WHERE user_id=? AND id<>? AND revoked_at IS NULL AND expires_at>?').get(s.user_id,c.id,isoNow()).n;
   if(count>=5)return {status:429,body:{ok:false,error:'REVOKE_AN_OLD_CONNECTION'}};
   db.prepare('UPDATE foreflight_connections SET session_id=?,expires_at=? WHERE id=? AND user_id=? AND revoked_at IS NULL').run(s.id,expires,c.id,s.user_id);
   return {status:200,body:{ok:true,connection:safeConnection({...c,session_id:s.id,expires_at:expires})}};
  });res.status(result.status).json(result.body);
 });
 app.delete('/api/foreflight/connections/:id',requireAuth,action,(req,res)=>{
  db.prepare('UPDATE foreflight_connections SET revoked_at=? WHERE id=? AND user_id=?').run(isoNow(),req.params.id,req.flightopsSession.user_id);res.json({ok:true});
 });
 // This one route uses an upload-only key, never a browser session or API master key.
 const attempts=new Map();let busy=0;
 // One bounded synthetic probe at each application start, sharing the same
 // process/concurrency constraints as real imports. No key or PDF is needed.
 let readerHealth={status:'checking'};
 busy++;
 readPdf(probePdf()).then(result=>{
  if(!result.text.includes('KUSA_PDF_READER_PROBE'))throw fault('PDF_READER_FAILED','OTHER');
  readerHealth={status:'ready',checked_at:isoNow()};
 }).catch(error=>{readerHealth={status:'unavailable',code:Object.hasOwn(pdfMessages,error.code)?error.code:'PDF_READER_FAILED',reason:safeReason(error.reason),checked_at:isoNow()};})
 .finally(()=>{busy--;console.info('[ForeFlight reader]',JSON.stringify(readerHealth));});
 app.get('/api/foreflight/reader-status',requireAuth,(req,res)=>{
  if(!writable(req.flightopsSession.user_id).length)return res.status(403).json({ok:false,error:'AIRCRAFT_ACCESS_DENIED'});
  res.json({ok:true,reader:readerHealth});
 });
 function uploadAuth(req,res,next){
  const now=Date.now(),ip=req.socket.remoteAddress||'unknown';
  for(const [key,value]of attempts)if(value.until<now)attempts.delete(key);
  const a=attempts.get(ip)||{n:0,until:now+60000};a.n++;if(attempts.size<1000||attempts.has(ip))attempts.set(ip,a);
  if(a.n>40)return res.status(429).json({ok:false,error:'TRY_AGAIN_LATER'});
  const raw=req.get('X-FlightOps-Upload-Key')||'';
  const c=/^[A-Za-z0-9_-]{43}$/.test(raw)&&db.prepare(`SELECT c.*,s.revoked_at session_revoked_at,s.expires_at session_expires_at,u.status user_status FROM foreflight_connections c JOIN users u ON u.id=c.user_id
 JOIN sessions s ON s.id=c.session_id WHERE c.token_hash=?`).get(digest(raw));
  if(!c||c.revoked_at||c.user_status!=='active'||!writable(c.user_id).length)return res.status(401).json({ok:false,error:'UPLOAD_CONNECTION_EXPIRED_OR_REVOKED',message:'This upload connection is unavailable. Sign in to FlightOps to check this iPad connection.'});
  if(c.expires_at<=isoNow()||c.session_revoked_at||c.session_expires_at<=isoNow()){
   const u=new URL(importUrl(req,'unused'));u.searchParams.delete('import');u.searchParams.set('reconnect',c.id);
   return res.status(401).json({ok:false,error:'UPLOAD_CONNECTION_EXPIRED_OR_REVOKED',message:'Sign in to FlightOps and tap Reconnect for this iPad. Keep the existing Shortcut and key, then share the PDF again.',reconnect_url:u.href,open_url:u.href});
  }
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
  const started=Date.now();let stage='pdf_decode',pageCount;
  try{
   const pdf=await pdfReader(req.body);pageCount=pdf.pages;stage='plan_recognition';
   const parsed=extractPlan(pdf.text);stage='import_storage';
   // Recheck authority after asynchronous PDF work (revocation can happen meanwhile).
   const still=db.prepare('SELECT c.id FROM foreflight_connections c JOIN sessions s ON s.id=c.session_id JOIN users u ON u.id=c.user_id WHERE c.id=? AND c.revoked_at IS NULL AND c.expires_at>? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status=\'active\'').get(c.id,isoNow(),isoNow());
   if(!still||!writable(c.user_id).length)return res.status(401).json({ok:false,error:'UPLOAD_CONNECTION_EXPIRED_OR_REVOKED'});
   const iid=id('ffi');
   db.prepare('INSERT OR IGNORE INTO foreflight_imports VALUES(?,?,?,?,?,?,?,NULL)').run(iid,c.user_id,c.id,sha,JSON.stringify({...parsed,pages:pdf.pages}),isoNow(),new Date(Date.now()+48*3600000).toISOString());
   const stored=db.prepare('SELECT id FROM foreflight_imports WHERE user_id=? AND content_sha256=?').get(c.user_id,sha);
   return res.status(201).json({ok:true,open_url:importUrl(req,stored.id)});
  }catch(error){
   const code=stage==='plan_recognition'?(error.message==='DOCUMENT_TEXT_LIMIT'?'PDF_TEXT_LIMIT':'PDF_LAYOUT_NOT_RECOGNIZED'):stage==='import_storage'?'IMPORT_STORAGE_FAILED':Object.hasOwn(pdfMessages,error.code)?error.code:'PDF_NOT_READABLE';
   const reference=crypto.randomBytes(6).toString('hex');
   // No keys, PDF text, filenames, routes, identity, hashes, URLs or provider bodies.
   console.warn('[ForeFlight import]',JSON.stringify({reference,stage,code,...(error.reason?{reason:safeReason(error.reason)}:{}),pdf_bytes:req.body.length,pages:pageCount,elapsed_ms:Date.now()-started}));
   const status=code==='IMPORT_STORAGE_FAILED'?500:['PDF_TIMEOUT','PDF_READER_UNAVAILABLE','PDF_READER_FAILED'].includes(code)?503:422;
   return res.status(status).json({ok:false,error:code,message:pdfMessages[code],reference});
  }
  finally{busy--;}
 });
 app.use('/api/foreflight/upload',(err,req,res,next)=>{if(err)return res.status(err.type==='entity.too.large'?413:400).json({ok:false,error:'PDF_UPLOAD_REJECTED'});next();});
 function ownImport(req,res){cleanup();const row=db.prepare('SELECT * FROM foreflight_imports WHERE id=? AND user_id=? AND expires_at>?').get(req.params.id,req.flightopsSession.user_id,isoNow());if(!row)res.status(404).json({ok:false,error:'IMPORT_NOT_FOUND_OR_EXPIRED'});return row;}
 app.get('/api/foreflight/imports/:id',requireAuth,(req,res)=>{
  const r=ownImport(req,res);if(!r)return;res.json({ok:true,import:{id:r.id,created_at:r.created_at,content_sha256:r.content_sha256,mission_id:r.mission_id,...proposeRampFuel(JSON.parse(r.extracted_json))},aircraft:writable(req.flightopsSession.user_id).map(a=>({id:a.id,registration:a.registration,model:a.model}))});
 });
 app.post('/api/foreflight/imports/:id/create',requireAuth,action,(req,res)=>{
  const r=ownImport(req,res);if(!r)return;const b=req.body||{},user=req.flightopsSession.user_id;
  const a=writable(user).find(a=>a.id===b.aircraft_id);if(!a)return res.status(403).json({ok:false,error:'AIRCRAFT_ACCESS_DENIED'});
  const parsed=proposeRampFuel(JSON.parse(r.extracted_json));
  if(parsed.fields.registration&&parsed.fields.registration!==a.registration)return res.status(400).json({ok:false,error:'AIRCRAFT_DOES_NOT_MATCH_PDF'});
  if(r.mission_id){const m=db.prepare('SELECT id,status FROM missions WHERE id=? AND aircraft_id=? AND organization_id=?').get(r.mission_id,a.id,a.organization_id);if(!m||m.status==='deleted')return res.status(409).json({ok:false,error:'IMPORTED_MISSION_UNAVAILABLE'});return res.json({ok:true,reused:true,mission_id:m.id});}
  const airport=v=>typeof v==='string'&&/^[A-Z]{4}$/.test(v)&&v!=='ZZZZ';
  if(b.reviewed!==true||!validDate(b.date)||!airport(b.departure)||!airport(b.destination)||(b.alternate&&!airport(b.alternate)))return res.status(400).json({ok:false,error:'REVIEW_DATE_AND_AIRPORTS'});
  if(![b.fob_lb,b.trip_lb,b.taxi_lb].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=50000)||b.fob_lb<=0||b.taxi_lb+b.trip_lb>b.fob_lb)return res.status(400).json({ok:false,error:'REVIEW_FUEL_POUNDS_AND_DEFINITIONS'});
  const now=isoNow(),mid=id('mis'),local=`FF-${r.id}`,f900=a.registration==='N699BG';
  const common={dep:b.departure,dest:b.destination,alt:b.alternate||'',trip_date:b.date,aircraft:f900?'F900B':'N33AP',registration:a.registration,note:'Imported from ForeFlight — loading and pilot reviews required',offline_mission_package:null};
  const fuel={fob_lb:b.fob_lb,mission_fuel_lb:b.trip_lb,taxi_fuel_lb:b.taxi_lb,fob_verified:false};
  const state=f900?{...common,f900b:{...fuel,captain_weight_lb:170,first_officer_weight_lb:170,passenger_count:0,total_baggage_lb:0}}:{...common,...fuel,captain_weight_lb:190,fo_weight_lb:190,passengers:[],seat_assignments:[],baggage:[0,0,0],fob_verified:false,low_fuel_confirmed:false,departure_notam_state:{status:'NOT_CHECKED',source:'NONE'},destination_notam_state:{status:'NOT_CHECKED',source:'NONE'}};
  const provenance={source:'ForeFlight PDF',content_sha256:r.content_sha256,imported_at:now,imported_by:user,fob_source:parsed.fob_source||(parsed.fields.fob_lb!==null?'explicit_fob':'manual'),extracted_fields:parsed.fields,confirmed_fields:{aircraft_id:a.id,date:b.date,departure:b.departure,destination:b.destination,alternate:b.alternate||'',fob_lb:b.fob_lb,trip_lb:b.trip_lb,taxi_lb:b.taxi_lb}};
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
