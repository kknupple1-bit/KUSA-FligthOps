'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
let DatabaseSync = null;
try { ({ DatabaseSync } = require('node:sqlite')); } catch (_) {}

const SESSION_COOKIE = 'flightops_session';
const SESSION_DAYS = Math.max(1, Number(process.env.FLIGHTOPS_SESSION_DAYS || 30));
const AUTH_REQUIRED = String(process.env.FLIGHTOPS_AUTH_REQUIRED || 'false').toLowerCase() === 'true';
const DB_PATH = process.env.FLIGHTOPS_DB_PATH || path.join(__dirname, 'data', 'flightops.sqlite');

function id(prefix='id') { return `${prefix}_${crypto.randomBytes(12).toString('hex')}`; }
function isoNow(){ return new Date().toISOString(); }
function addDaysIso(days){ return new Date(Date.now()+days*86400000).toISOString(); }
function sha256(s){ return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function pbkdf2(password, salt){ return crypto.pbkdf2Sync(String(password), salt, 210000, 32, 'sha256').toString('hex'); }
function passwordRecord(password){ const salt=crypto.randomBytes(16).toString('hex'); return {salt,hash:pbkdf2(password,salt)}; }
function verifyPassword(password, salt, expected){ const actual=pbkdf2(password,salt); try{return crypto.timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));}catch{return false;} }
function parseCookies(req){
  const out={}; String(req.headers.cookie||'').split(';').forEach(p=>{const i=p.indexOf('='); if(i>0) out[decodeURIComponent(p.slice(0,i).trim())]=decodeURIComponent(p.slice(i+1).trim());}); return out;
}
function cookieSecure(req){ return req.secure || String(req.headers['x-forwarded-proto']||'').split(',')[0].trim()==='https'; }
function setSessionCookie(req,res,rawToken,expiresAt){
  const bits=[`${SESSION_COOKIE}=${encodeURIComponent(rawToken)}`,'Path=/','HttpOnly','SameSite=Lax',`Expires=${new Date(expiresAt).toUTCString()}`];
  if(cookieSecure(req)) bits.push('Secure');
  res.setHeader('Set-Cookie',bits.join('; '));
}
function clearSessionCookie(req,res){
  const bits=[`${SESSION_COOKIE}=`, 'Path=/','HttpOnly','SameSite=Lax','Expires=Thu, 01 Jan 1970 00:00:00 GMT'];
  if(cookieSecure(req)) bits.push('Secure');
  res.setHeader('Set-Cookie',bits.join('; '));
}

function initDb(){
  if(!DatabaseSync) return {ok:false,error:'node:sqlite unavailable; Node 22+ is required for v5.26.1 platform services'};
  fs.mkdirSync(path.dirname(DB_PATH),{recursive:true});
  const db=new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  db.exec(`
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, display_name TEXT NOT NULL,
  password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL,
  created_at TEXT NOT NULL, UNIQUE(organization_id,user_id)
);
CREATE TABLE IF NOT EXISTS aircraft (
  id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  registration TEXT NOT NULL, model TEXT NOT NULL, serial_number TEXT, profile_key TEXT NOT NULL,
  data_package_version TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE(organization_id,registration)
);
CREATE TABLE IF NOT EXISTS aircraft_access (
  id TEXT PRIMARY KEY, aircraft_id TEXT NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, access_role TEXT NOT NULL DEFAULT 'pilot',
  created_at TEXT NOT NULL, UNIQUE(aircraft_id,user_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, user_agent TEXT, ip TEXT, created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_key TEXT NOT NULL, label TEXT, last_seen_at TEXT NOT NULL, revoked_at TEXT,
  UNIQUE(user_id,device_key)
);
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  aircraft_id TEXT NOT NULL REFERENCES aircraft(id) ON DELETE RESTRICT,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  trip_number TEXT, status TEXT NOT NULL DEFAULT 'draft', revision INTEGER NOT NULL DEFAULT 1,
  mission_date TEXT, departure TEXT, destination TEXT, alternate TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT
);
CREATE INDEX IF NOT EXISTS missions_owner_status_idx ON missions(owner_user_id,status,updated_at DESC);
CREATE TABLE IF NOT EXISTS mission_revisions (
  id TEXT PRIMARY KEY, mission_id TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  payload_json TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(mission_id,revision)
);
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'pilot', token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL, accepted_at TEXT, revoked_at TEXT, created_by_user_id TEXT REFERENCES users(id), created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY, organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL, message TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL, decided_at TEXT
);
CREATE TABLE IF NOT EXISTS data_packages (
  id TEXT PRIMARY KEY, profile_key TEXT NOT NULL, version TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved',
  manifest_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL, UNIQUE(profile_key,version)
);
`);
  seed(db);
  return {ok:true,db};
}

function seed(db){
  const now=isoNow();
  let org=db.prepare('SELECT * FROM organizations WHERE slug=?').get('kusa');
  if(!org){
    const orgId=id('org'); db.prepare('INSERT INTO organizations(id,name,slug,created_at) VALUES(?,?,?,?)').run(orgId,'KUSA Aviation','kusa',now);
    org={id:orgId,name:'KUSA Aviation',slug:'kusa'};
  }
  const adminEmail=String(process.env.FLIGHTOPS_ADMIN_EMAIL||'').trim().toLowerCase();
  const adminPassword=String(process.env.FLIGHTOPS_ADMIN_PASSWORD||'');
  if(adminEmail && adminPassword){
    let u=db.prepare('SELECT * FROM users WHERE email=?').get(adminEmail);
    if(!u){ const p=passwordRecord(adminPassword),uid=id('usr'); db.prepare('INSERT INTO users(id,email,display_name,password_salt,password_hash,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(uid,adminEmail,process.env.FLIGHTOPS_ADMIN_NAME||'KUSA Administrator',p.salt,p.hash,'active',now,now); u={id:uid}; }
    db.prepare("INSERT OR IGNORE INTO memberships(id,organization_id,user_id,role,created_at) VALUES(?,?,?,?,?)").run(id('mem'),org.id,u.id,'administrator',now);
  }
  const aircraftSeeds=[
    ['N33AP','Falcon 50-4','081','N33AP_F50_4','5.25.86'],
    ['N699BG','Falcon 900B','082','N699BG_F900B','5.25.86']
  ];
  for(const [reg,model,sn,key,ver] of aircraftSeeds){
    db.prepare('INSERT OR IGNORE INTO aircraft(id,organization_id,registration,model,serial_number,profile_key,data_package_version,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id('ac'),org.id,reg,model,sn,key,ver,'active',now,now);
  }
}

const state=initDb();

function currentSession(req){
  if(!state.ok) return null;
  const raw=parseCookies(req)[SESSION_COOKIE]; if(!raw) return null;
  const row=state.db.prepare(`SELECT s.*,u.email,u.display_name,u.status AS user_status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL`).get(sha256(raw));
  if(!row || row.user_status!=='active' || Date.parse(row.expires_at)<=Date.now()) return null;
  state.db.prepare('UPDATE sessions SET last_seen_at=? WHERE id=?').run(isoNow(),row.id);
  return row;
}
function requireAuth(req,res,next){
  const s=currentSession(req); if(!s) return res.status(401).json({ok:false,error:'AUTH_REQUIRED'}); req.flightopsSession=s; next();
}

function administratorMembershipsFor(userId){
  return state.db.prepare(`SELECT m.organization_id,m.role,o.name,o.slug
    FROM memberships m
    JOIN organizations o ON o.id=m.organization_id
    WHERE m.user_id=? AND m.role='administrator'
    ORDER BY o.name`).all(userId);
}

function requireAdministrator(req,res,next){
  const admins=administratorMembershipsFor(req.flightopsSession.user_id);
  if(!admins.length) return res.status(403).json({ok:false,error:'ADMIN_REQUIRED'});
  req.flightopsAdminMemberships=admins;
  next();
}
function membershipsFor(userId){
  return state.db.prepare('SELECT m.organization_id,m.role,o.name,o.slug FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=?').all(userId);
}
function allowedAircraft(userId){
  const memberships=membershipsFor(userId);
  const isAdmin=memberships.some(m=>['administrator','aircraft_manager'].includes(m.role));
  if(isAdmin) return state.db.prepare('SELECT * FROM aircraft WHERE status=? ORDER BY registration').all('active');
  return state.db.prepare(`SELECT a.* FROM aircraft a JOIN aircraft_access aa ON aa.aircraft_id=a.id WHERE aa.user_id=? AND a.status='active' ORDER BY a.registration`).all(userId);
}
function canUseAircraft(userId, aircraftId){ return allowedAircraft(userId).some(a=>a.id===aircraftId); }
function safeMission(row){ if(!row)return null; const x={...row}; try{x.payload=JSON.parse(x.payload_json||'{}')}catch{x.payload={}} delete x.payload_json; return x; }

function installPlatform(app,{build='5.26.1'}={}){
  app.get('/api/platform/status',(req,res)=>{
    const s=state.ok?currentSession(req):null;
    res.json({ok:state.ok,build,database:state.ok?'sqlite':'unavailable',database_path:state.ok?path.basename(DB_PATH):null,auth_required:AUTH_REQUIRED,session_cookie:SESSION_COOKIE,authenticated:!!s,bootstrap_admin_configured:!!(process.env.FLIGHTOPS_ADMIN_EMAIL&&process.env.FLIGHTOPS_ADMIN_PASSWORD),error:state.error||null});
  });

  app.post('/api/auth/login',(req,res)=>{
    if(!state.ok) return res.status(503).json({ok:false,error:state.error});
    const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');
    const u=state.db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if(!u || u.status!=='active' || !verifyPassword(password,u.password_salt,u.password_hash)) return res.status(401).json({ok:false,error:'INVALID_CREDENTIALS'});
    const raw=crypto.randomBytes(32).toString('base64url'),sid=id('ses'),now=isoNow(),exp=addDaysIso(SESSION_DAYS);
    state.db.prepare('INSERT INTO sessions(id,user_id,token_hash,user_agent,ip,created_at,last_seen_at,expires_at) VALUES(?,?,?,?,?,?,?,?)').run(sid,u.id,sha256(raw),String(req.headers['user-agent']||'').slice(0,500),String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim(),now,now,exp);
    setSessionCookie(req,res,raw,exp);
    res.json({ok:true,user:{id:u.id,email:u.email,display_name:u.display_name},memberships:membershipsFor(u.id)});
  });

  app.post('/api/auth/logout',(req,res)=>{
    if(state.ok){ const raw=parseCookies(req)[SESSION_COOKIE]; if(raw) state.db.prepare('UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').run(isoNow(),sha256(raw)); }
    clearSessionCookie(req,res); res.json({ok:true});
  });

  app.get('/api/me',(req,res)=>{
    if(!state.ok) return res.status(503).json({ok:false,error:state.error});
    const s=currentSession(req); if(!s) return res.status(401).json({ok:false,error:'AUTH_REQUIRED'});
    res.json({ok:true,user:{id:s.user_id,email:s.email,display_name:s.display_name},memberships:membershipsFor(s.user_id),aircraft:allowedAircraft(s.user_id)});
  });

  app.get('/api/aircraft',requireAuth,(req,res)=>res.json({ok:true,aircraft:allowedAircraft(req.flightopsSession.user_id)}));

  // v5.26.1 administrator foundation: organization-scoped user roster.
  // Server-side authorization is mandatory; being authenticated alone is insufficient.
  app.get('/api/admin/users',requireAuth,requireAdministrator,(req,res)=>{
    const orgIds=req.flightopsAdminMemberships.map(m=>m.organization_id);
    const placeholders=orgIds.map(()=>'?').join(',');
    const rows=state.db.prepare(`
      SELECT
        u.id AS user_id,
        u.email,
        u.display_name,
        u.status,
        u.created_at,
        u.updated_at,
        m.id AS membership_id,
        m.organization_id,
        o.name AS organization_name,
        o.slug AS organization_slug,
        m.role,
        (
          SELECT MAX(s.last_seen_at)
          FROM sessions s
          WHERE s.user_id=u.id
        ) AS last_seen_at,
        (
          SELECT COUNT(*)
          FROM sessions s
          WHERE s.user_id=u.id
            AND s.revoked_at IS NULL
            AND s.expires_at>?
        ) AS active_session_count
      FROM memberships m
      JOIN users u ON u.id=m.user_id
      JOIN organizations o ON o.id=m.organization_id
      WHERE m.organization_id IN (${placeholders})
      ORDER BY o.name,u.display_name,u.email
    `).all(isoNow(),...orgIds);

    const users=rows.map(row=>{
      const aircraftAccess=state.db.prepare(`
        SELECT
          a.id AS aircraft_id,
          a.registration,
          a.model,
          aa.access_role
        FROM aircraft_access aa
        JOIN aircraft a ON a.id=aa.aircraft_id
        WHERE aa.user_id=? AND a.organization_id=?
        ORDER BY a.registration
      `).all(row.user_id,row.organization_id);

      return {...row,aircraft_access:aircraftAccess};
    });

    res.json({
      ok:true,
      organizations:req.flightopsAdminMemberships,
      users
    });
  });

  app.get('/api/missions',requireAuth,(req,res)=>{
    const status=String(req.query.status||'draft');
    const rows=state.db.prepare('SELECT * FROM missions WHERE owner_user_id=? AND status=? ORDER BY updated_at DESC LIMIT 250').all(req.flightopsSession.user_id,status).map(safeMission);
    res.json({ok:true,missions:rows});
  });

  app.post('/api/missions',requireAuth,(req,res)=>{
    const body=req.body||{},aircraftId=String(body.aircraft_id||'');
    if(!canUseAircraft(req.flightopsSession.user_id,aircraftId)) return res.status(403).json({ok:false,error:'AIRCRAFT_ACCESS_DENIED'});
    const orgs=membershipsFor(req.flightopsSession.user_id); const orgId=orgs[0]?.organization_id; if(!orgId)return res.status(403).json({ok:false,error:'NO_ORGANIZATION'});
    const mid=id('mis'),now=isoNow(),payload=body.payload&&typeof body.payload==='object'?body.payload:{};
    state.db.prepare(`INSERT INTO missions(id,organization_id,aircraft_id,owner_user_id,trip_number,status,revision,mission_date,departure,destination,alternate,payload_json,created_at,updated_at) VALUES(?,?,?,?,?,'draft',1,?,?,?,?,?,?,?)`).run(mid,orgId,aircraftId,req.flightopsSession.user_id,body.trip_number||null,body.mission_date||null,body.departure||null,body.destination||null,body.alternate||null,JSON.stringify(payload),now,now);
    state.db.prepare('INSERT INTO mission_revisions(id,mission_id,revision,user_id,payload_json,created_at) VALUES(?,?,?,?,?,?)').run(id('rev'),mid,1,req.flightopsSession.user_id,JSON.stringify(payload),now);
    res.status(201).json({ok:true,mission:safeMission(state.db.prepare('SELECT * FROM missions WHERE id=?').get(mid))});
  });

  app.get('/api/missions/:id',requireAuth,(req,res)=>{
    const row=state.db.prepare('SELECT * FROM missions WHERE id=? AND owner_user_id=?').get(req.params.id,req.flightopsSession.user_id);
    if(!row)return res.status(404).json({ok:false,error:'MISSION_NOT_FOUND'}); res.json({ok:true,mission:safeMission(row)});
  });

  app.put('/api/missions/:id',requireAuth,(req,res)=>{
    const row=state.db.prepare('SELECT * FROM missions WHERE id=? AND owner_user_id=?').get(req.params.id,req.flightopsSession.user_id);
    if(!row)return res.status(404).json({ok:false,error:'MISSION_NOT_FOUND'});
    if(row.status!=='draft')return res.status(409).json({ok:false,error:'MISSION_NOT_DRAFT'});
    const expected=Number(req.body?.expected_revision); if(!Number.isInteger(expected)||expected!==row.revision) return res.status(409).json({ok:false,error:'REVISION_CONFLICT',current_revision:row.revision});
    const payload=req.body?.payload&&typeof req.body.payload==='object'?req.body.payload:JSON.parse(row.payload_json||'{}');
    const rev=row.revision+1,now=isoNow();
    state.db.prepare(`UPDATE missions SET trip_number=?,mission_date=?,departure=?,destination=?,alternate=?,payload_json=?,revision=?,updated_at=? WHERE id=?`).run(req.body.trip_number??row.trip_number,req.body.mission_date??row.mission_date,req.body.departure??row.departure,req.body.destination??row.destination,req.body.alternate??row.alternate,JSON.stringify(payload),rev,now,row.id);
    state.db.prepare('INSERT INTO mission_revisions(id,mission_id,revision,user_id,payload_json,created_at) VALUES(?,?,?,?,?,?)').run(id('rev'),row.id,rev,req.flightopsSession.user_id,JSON.stringify(payload),now);
    res.json({ok:true,mission:safeMission(state.db.prepare('SELECT * FROM missions WHERE id=?').get(row.id))});
  });

  app.post('/api/missions/:id/archive',requireAuth,(req,res)=>{
    const row=state.db.prepare('SELECT * FROM missions WHERE id=? AND owner_user_id=?').get(req.params.id,req.flightopsSession.user_id);
    if(!row)return res.status(404).json({ok:false,error:'MISSION_NOT_FOUND'});
    const now=isoNow(); state.db.prepare("UPDATE missions SET status='archived',archived_at=?,updated_at=? WHERE id=?").run(now,now,row.id);
    res.json({ok:true,mission:safeMission(state.db.prepare('SELECT * FROM missions WHERE id=?').get(row.id))});
  });

  // Transitional auth gate: off by default so v5.25.86 operational behavior remains deployable.
  // Set FLIGHTOPS_AUTH_REQUIRED=true after the login UI/admin bootstrap has been verified.
  if(AUTH_REQUIRED){
    app.use('/api/platform/private',requireAuth);
  }
}

module.exports={installPlatform,state,AUTH_REQUIRED,SESSION_COOKIE,DB_PATH};
