'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
let DatabaseSync = null;
try { ({ DatabaseSync } = require('node:sqlite')); } catch (_) {}

const SESSION_COOKIE = 'flightops_session';
const SESSION_DAYS = Math.max(1, Number(process.env.FLIGHTOPS_SESSION_DAYS || 30));
// v5.26.7: mandatory authentication is now the normal operating mode.
const AUTH_REQUIRED = String(process.env.FLIGHTOPS_AUTH_REQUIRED || 'true').toLowerCase() !== 'false';
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
  if(!DatabaseSync) return {ok:false,error:'node:sqlite unavailable; Node 22+ is required for v5.26.8 platform services'};
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
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_audit_org_created_idx ON admin_audit_log(organization_id,created_at DESC);
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT,
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS password_resets_user_created_idx ON password_resets(user_id,created_at DESC);
CREATE TABLE IF NOT EXISTS offline_signing_keys (
  id TEXT PRIMARY KEY,
  private_pem TEXT NOT NULL,
  public_pem TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS offline_grants (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS offline_grants_user_created_idx ON offline_grants(user_id,created_at DESC);
`);
  // v5.26.5 migration-safe invitation payload extension.
  try{
    const cols=db.prepare("PRAGMA table_info(invitations)").all();
    if(!cols.some(c=>c.name==='aircraft_json')) db.exec("ALTER TABLE invitations ADD COLUMN aircraft_json TEXT NOT NULL DEFAULT '[]'");
    if(!cols.some(c=>c.name==='accepted_user_id')) db.exec("ALTER TABLE invitations ADD COLUMN accepted_user_id TEXT");
  }catch(e){
    console.error('[PLATFORM MIGRATION] invitation column migration failed',String(e?.message||e));
    throw e;
  }

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

function administeredOrganization(req, organizationId){
  const id=String(organizationId||'');
  return (req.flightopsAdminMemberships||[]).find(m=>m.organization_id===id)||null;
}

function targetMembershipInAdminOrg(req,targetUserId,organizationId){
  const adminOrg=administeredOrganization(req,organizationId);
  if(!adminOrg) return null;
  return state.db.prepare(`
    SELECT m.*,u.email,u.display_name,u.status AS user_status,o.name AS organization_name,o.slug AS organization_slug
    FROM memberships m
    JOIN users u ON u.id=m.user_id
    JOIN organizations o ON o.id=m.organization_id
    WHERE m.user_id=? AND m.organization_id=?
  `).get(targetUserId,organizationId)||null;
}

function writeAdminAudit(req,organizationId,targetUserId,action,detail={}){
  state.db.prepare(`
    INSERT INTO admin_audit_log(id,organization_id,actor_user_id,target_user_id,action,detail_json,created_at)
    VALUES(?,?,?,?,?,?,?)
  `).run(
    id('aud'),
    organizationId,
    req.flightopsSession.user_id,
    targetUserId||null,
    action,
    JSON.stringify(detail&&typeof detail==='object'?detail:{}),
    isoNow()
  );
}

function normalizeRole(role){
  const r=String(role||'').trim().toLowerCase();
  return ['administrator','aircraft_manager','pilot','viewer'].includes(r)?r:null;
}

function b64urlEncode(input){
  return Buffer.from(input).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function ensureOfflineSigningKey(){
  let row=state.db.prepare("SELECT * FROM offline_signing_keys WHERE id='primary'").get();
  if(row) return row;
  const kp=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const privatePem=kp.privateKey.export({type:'pkcs8',format:'pem'}).toString();
  const publicPem=kp.publicKey.export({type:'spki',format:'pem'}).toString();
  const now=isoNow();
  state.db.prepare("INSERT INTO offline_signing_keys(id,private_pem,public_pem,created_at) VALUES('primary',?,?,?)")
    .run(privatePem,publicPem,now);
  return {id:'primary',private_pem:privatePem,public_pem:publicPem,created_at:now};
}
function signOfflinePayload(payload){
  const key=ensureOfflineSigningKey();
  const header={alg:'ES256',typ:'KUSA-OFFLINE',v:1};
  const h=b64urlEncode(JSON.stringify(header));
  const p=b64urlEncode(JSON.stringify(payload));
  const input=`${h}.${p}`;
  const sig=crypto.sign('sha256',Buffer.from(input),{key:key.private_pem,dsaEncoding:'ieee-p1363'});
  return `${input}.${b64urlEncode(sig)}`;
}
function offlineGrantDays(){
  return Math.max(1,Math.min(30,Number(process.env.FLIGHTOPS_OFFLINE_GRANT_DAYS||7)));
}
function membershipsFor(userId){
  return state.db.prepare('SELECT m.organization_id,m.role,o.name,o.slug FROM memberships m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=?').all(userId);
}
function allowedAircraft(userId){
  // v5.26.2 tenant isolation: a user must belong to the aircraft organization.
  // Administrators/aircraft managers receive all active aircraft only inside organizations
  // where they hold that role; other members receive only explicit aircraft_access grants.
  return state.db.prepare(`
    SELECT DISTINCT a.*
    FROM aircraft a
    JOIN memberships m
      ON m.organization_id=a.organization_id
     AND m.user_id=?
    LEFT JOIN aircraft_access aa
      ON aa.aircraft_id=a.id
     AND aa.user_id=?
    WHERE a.status='active'
      AND (
        m.role IN ('administrator','aircraft_manager')
        OR aa.user_id IS NOT NULL
      )
    ORDER BY a.registration
  `).all(userId,userId);
}
function canUseAircraft(userId, aircraftId){ return allowedAircraft(userId).some(a=>a.id===aircraftId); }
function safeMission(row){ if(!row)return null; const x={...row}; try{x.payload=JSON.parse(x.payload_json||'{}')}catch{x.payload={}} delete x.payload_json; return x; }

function installPlatform(app,{build='5.26.8'}={}){
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

      const effectiveAircraftAccess=['administrator','aircraft_manager'].includes(row.role)
        ? state.db.prepare(`
            SELECT id AS aircraft_id,registration,model,
                   ? AS access_role
            FROM aircraft
            WHERE organization_id=? AND status='active'
            ORDER BY registration
          `).all(row.role,row.organization_id)
        : aircraftAccess;

      return {
        ...row,
        aircraft_access:aircraftAccess,
        effective_aircraft_access:effectiveAircraftAccess
      };
    });

    res.json({
      ok:true,
      organizations:req.flightopsAdminMemberships,
      users
    });
  });


  // v5.26.3 controlled administrator write actions.
  app.patch('/api/admin/users/:userId/status',requireAuth,requireAdministrator,(req,res)=>{
    const targetUserId=String(req.params.userId||'');
    const organizationId=String(req.body?.organization_id||'');
    const status=String(req.body?.status||'').toLowerCase();
    if(!['active','disabled'].includes(status)) return res.status(400).json({ok:false,error:'INVALID_STATUS'});
    const membership=targetMembershipInAdminOrg(req,targetUserId,organizationId);
    if(!membership) return res.status(404).json({ok:false,error:'USER_NOT_FOUND_IN_ADMIN_ORGANIZATION'});
    if(targetUserId===req.flightopsSession.user_id && status!=='active')
      return res.status(409).json({ok:false,error:'SELF_DISABLE_BLOCKED'});

    const now=isoNow();
    state.db.prepare('UPDATE users SET status=?,updated_at=? WHERE id=?').run(status,now,targetUserId);
    if(status!=='active'){
      state.db.prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').run(now,targetUserId);
    }
    writeAdminAudit(req,organizationId,targetUserId,'USER_STATUS_CHANGED',{from:membership.user_status,to:status});
    res.json({ok:true,user_id:targetUserId,status});
  });

  app.post('/api/admin/users/:userId/revoke-sessions',requireAuth,requireAdministrator,(req,res)=>{
    const targetUserId=String(req.params.userId||'');
    const organizationId=String(req.body?.organization_id||'');
    const membership=targetMembershipInAdminOrg(req,targetUserId,organizationId);
    if(!membership) return res.status(404).json({ok:false,error:'USER_NOT_FOUND_IN_ADMIN_ORGANIZATION'});
    if(targetUserId===req.flightopsSession.user_id)
      return res.status(409).json({ok:false,error:'SELF_SESSION_REVOKE_BLOCKED'});
    const now=isoNow();
    const info=state.db.prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').run(now,targetUserId);
    writeAdminAudit(req,organizationId,targetUserId,'SESSIONS_REVOKED',{changes:Number(info?.changes||0)});
    res.json({ok:true,user_id:targetUserId,revoked_sessions:Number(info?.changes||0)});
  });

  app.patch('/api/admin/users/:userId/role',requireAuth,requireAdministrator,(req,res)=>{
    const targetUserId=String(req.params.userId||'');
    const organizationId=String(req.body?.organization_id||'');
    const role=normalizeRole(req.body?.role);
    if(!role) return res.status(400).json({ok:false,error:'INVALID_ROLE'});
    const membership=targetMembershipInAdminOrg(req,targetUserId,organizationId);
    if(!membership) return res.status(404).json({ok:false,error:'USER_NOT_FOUND_IN_ADMIN_ORGANIZATION'});

    if(targetUserId===req.flightopsSession.user_id && role!=='administrator')
      return res.status(409).json({ok:false,error:'SELF_ADMIN_DEMOTION_BLOCKED'});

    if(membership.role==='administrator' && role!=='administrator'){
      const admins=state.db.prepare(
        "SELECT COUNT(*) AS n FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.organization_id=? AND m.role='administrator' AND u.status='active'"
      ).get(organizationId);
      if(Number(admins?.n||0)<=1) return res.status(409).json({ok:false,error:'LAST_ADMIN_DEMOTION_BLOCKED'});
    }

    state.db.prepare('UPDATE memberships SET role=? WHERE id=?').run(role,membership.id);
    writeAdminAudit(req,organizationId,targetUserId,'USER_ROLE_CHANGED',{from:membership.role,to:role});
    res.json({ok:true,user_id:targetUserId,organization_id:organizationId,role});
  });

  app.put('/api/admin/users/:userId/aircraft-access',requireAuth,requireAdministrator,(req,res)=>{
    const targetUserId=String(req.params.userId||'');
    const organizationId=String(req.body?.organization_id||'');
    const membership=targetMembershipInAdminOrg(req,targetUserId,organizationId);
    if(!membership) return res.status(404).json({ok:false,error:'USER_NOT_FOUND_IN_ADMIN_ORGANIZATION'});

    const requested=Array.isArray(req.body?.aircraft_ids)?[...new Set(req.body.aircraft_ids.map(String))]:[];
    const validAircraft=state.db.prepare(
      "SELECT id,registration FROM aircraft WHERE organization_id=? AND status='active' ORDER BY registration"
    ).all(organizationId);
    const validIds=new Set(validAircraft.map(a=>a.id));
    if(requested.some(x=>!validIds.has(x)))
      return res.status(400).json({ok:false,error:'INVALID_AIRCRAFT_FOR_ORGANIZATION'});

    const before=state.db.prepare(`
      SELECT a.id AS aircraft_id,a.registration,aa.access_role
      FROM aircraft_access aa JOIN aircraft a ON a.id=aa.aircraft_id
      WHERE aa.user_id=? AND a.organization_id=?
      ORDER BY a.registration
    `).all(targetUserId,organizationId);

    state.db.exec('BEGIN IMMEDIATE');
    try{
      state.db.prepare(`
        DELETE FROM aircraft_access
        WHERE user_id=? AND aircraft_id IN (SELECT id FROM aircraft WHERE organization_id=?)
      `).run(targetUserId,organizationId);
      const ins=state.db.prepare(
        'INSERT INTO aircraft_access(id,aircraft_id,user_id,access_role,created_at) VALUES(?,?,?,?,?)'
      );
      for(const aircraftId of requested) ins.run(id('aac'),aircraftId,targetUserId,'pilot',isoNow());
      state.db.exec('COMMIT');
    }catch(e){
      try{state.db.exec('ROLLBACK')}catch{}
      throw e;
    }

    writeAdminAudit(req,organizationId,targetUserId,'AIRCRAFT_ACCESS_CHANGED',{
      before:before.map(x=>x.aircraft_id),
      after:requested
    });
    res.json({ok:true,user_id:targetUserId,organization_id:organizationId,aircraft_ids:requested});
  });

  app.post('/api/admin/invitations',requireAuth,requireAdministrator,(req,res)=>{
    const organizationId=String(req.body?.organization_id||'');
    const adminOrg=administeredOrganization(req,organizationId);
    if(!adminOrg) return res.status(403).json({ok:false,error:'ORGANIZATION_ADMIN_REQUIRED'});

    const email=String(req.body?.email||'').trim().toLowerCase();
    const role=normalizeRole(req.body?.role)||'pilot';
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ok:false,error:'INVALID_EMAIL'});

    const existing=state.db.prepare(`
      SELECT u.id
      FROM users u JOIN memberships m ON m.user_id=u.id
      WHERE u.email=? AND m.organization_id=?
    `).get(email,organizationId);
    if(existing) return res.status(409).json({ok:false,error:'USER_ALREADY_MEMBER'});

    const requestedAircraft=Array.isArray(req.body?.aircraft_ids)?[...new Set(req.body.aircraft_ids.map(String))]:[];
    const validAircraft=state.db.prepare(
      "SELECT id,registration FROM aircraft WHERE organization_id=? AND status='active' ORDER BY registration"
    ).all(organizationId);
    const validIds=new Set(validAircraft.map(a=>a.id));
    if(requestedAircraft.some(x=>!validIds.has(x)))
      return res.status(400).json({ok:false,error:'INVALID_AIRCRAFT_FOR_ORGANIZATION'});

    const rawToken=crypto.randomBytes(32).toString('base64url');
    const invitationId=id('inv'),now=isoNow(),expiresAt=addDaysIso(7);
    state.db.prepare(`
      INSERT INTO invitations(id,organization_id,email,role,token_hash,expires_at,created_by_user_id,created_at,aircraft_json)
      VALUES(?,?,?,?,?,?,?,?,?)
    `).run(invitationId,organizationId,email,role,sha256(rawToken),expiresAt,req.flightopsSession.user_id,now,JSON.stringify(requestedAircraft));

    writeAdminAudit(req,organizationId,null,'INVITATION_CREATED',{
      invitation_id:invitationId,email,role,expires_at:expiresAt,aircraft_ids:requestedAircraft
    });
    res.status(201).json({
      ok:true,
      invitation:{
        id:invitationId,email,role,organization_id:organizationId,expires_at:expiresAt,
        aircraft_ids:requestedAircraft,
        token:rawToken,
        invite_path:`/invite.html?token=${encodeURIComponent(rawToken)}`
      },
      note:'Invitation email delivery is not enabled yet. Copy the invite_path to the recipient for controlled testing.'
    });
  });

  app.get('/api/admin/invitations',requireAuth,requireAdministrator,(req,res)=>{
    const organizationId=String(req.query.organization_id||req.flightopsAdminMemberships[0]?.organization_id||'');
    if(!administeredOrganization(req,organizationId)) return res.status(403).json({ok:false,error:'ORGANIZATION_ADMIN_REQUIRED'});
    const invitations=state.db.prepare(`
      SELECT id,email,role,expires_at,accepted_at,revoked_at,created_by_user_id,created_at,aircraft_json,accepted_user_id
      FROM invitations
      WHERE organization_id=?
      ORDER BY created_at DESC
      LIMIT 250
    `).all(organizationId).map(inv=>{
      let aircraft_ids=[];try{aircraft_ids=JSON.parse(inv.aircraft_json||'[]')}catch{}
      const x={...inv,aircraft_ids};delete x.aircraft_json;return x;
    });
    res.json({ok:true,organization_id:organizationId,invitations});
  });


  // v5.26.5 public invitation validation and first-password setup.
  app.get('/api/invitations/:token',(req,res)=>{
    if(!state.ok) return res.status(503).json({ok:false,error:state.error});
    const token=String(req.params.token||'');
    if(token.length<20) return res.status(404).json({ok:false,error:'INVITATION_NOT_FOUND'});
    const inv=state.db.prepare(`
      SELECT i.*,o.name AS organization_name,o.slug AS organization_slug
      FROM invitations i
      JOIN organizations o ON o.id=i.organization_id
      WHERE i.token_hash=?
    `).get(sha256(token));
    if(!inv) return res.status(404).json({ok:false,error:'INVITATION_NOT_FOUND'});
    if(inv.revoked_at) return res.status(410).json({ok:false,error:'INVITATION_REVOKED'});
    if(inv.accepted_at) return res.status(410).json({ok:false,error:'INVITATION_ALREADY_ACCEPTED'});
    if(Date.parse(inv.expires_at)<=Date.now()) return res.status(410).json({ok:false,error:'INVITATION_EXPIRED'});

    let aircraftIds=[];try{aircraftIds=JSON.parse(inv.aircraft_json||'[]')}catch{}
    const aircraft=aircraftIds.length
      ? state.db.prepare(`SELECT id,registration,model FROM aircraft WHERE organization_id=? AND id IN (${aircraftIds.map(()=>'?').join(',')}) ORDER BY registration`).all(inv.organization_id,...aircraftIds)
      : [];

    const existingUser=state.db.prepare('SELECT id,status,display_name FROM users WHERE email=?').get(inv.email);
    res.json({
      ok:true,
      invitation:{
        email:inv.email,
        role:inv.role,
        organization_id:inv.organization_id,
        organization_name:inv.organization_name,
        expires_at:inv.expires_at,
        aircraft,
        existing_account:!!existingUser,
        existing_account_status:existingUser?.status||null,
        existing_display_name:existingUser?.display_name||null
      }
    });
  });

  app.post('/api/invitations/:token/accept',(req,res)=>{
    if(!state.ok) return res.status(503).json({ok:false,error:state.error});
    const token=String(req.params.token||'');
    if(token.length<20) return res.status(404).json({ok:false,error:'INVITATION_NOT_FOUND'});

    const inv=state.db.prepare(`
      SELECT i.*,o.name AS organization_name
      FROM invitations i
      JOIN organizations o ON o.id=i.organization_id
      WHERE i.token_hash=?
    `).get(sha256(token));
    if(!inv) return res.status(404).json({ok:false,error:'INVITATION_NOT_FOUND'});
    if(inv.revoked_at) return res.status(410).json({ok:false,error:'INVITATION_REVOKED'});
    if(inv.accepted_at) return res.status(410).json({ok:false,error:'INVITATION_ALREADY_ACCEPTED'});
    if(Date.parse(inv.expires_at)<=Date.now()) return res.status(410).json({ok:false,error:'INVITATION_EXPIRED'});

    let aircraftIds=[];try{aircraftIds=JSON.parse(inv.aircraft_json||'[]')}catch{}
    const role=normalizeRole(inv.role)||'pilot';
    const now=isoNow();

    const existingUser=state.db.prepare('SELECT * FROM users WHERE email=?').get(inv.email);

    if(existingUser){
      if(existingUser.status!=='active') return res.status(409).json({ok:false,error:'ACCOUNT_NOT_ACTIVE'});
      const currentPassword=String(req.body?.current_password||'');
      if(!currentPassword || !verifyPassword(currentPassword,existingUser.password_salt,existingUser.password_hash))
        return res.status(401).json({ok:false,error:'INVALID_CREDENTIALS'});

      const alreadyMember=state.db.prepare(
        'SELECT id FROM memberships WHERE user_id=? AND organization_id=?'
      ).get(existingUser.id,inv.organization_id);
      if(alreadyMember) return res.status(409).json({ok:false,error:'USER_ALREADY_MEMBER'});

      state.db.exec('BEGIN IMMEDIATE');
      try{
        state.db.prepare(`
          INSERT INTO memberships(id,organization_id,user_id,role,created_at)
          VALUES(?,?,?,?,?)
        `).run(id('mem'),inv.organization_id,existingUser.id,role,now);

        if(!['administrator','aircraft_manager'].includes(role)){
          const valid=state.db.prepare(
            "SELECT id FROM aircraft WHERE organization_id=? AND status='active'"
          ).all(inv.organization_id);
          const validIds=new Set(valid.map(x=>x.id));
          const ins=state.db.prepare(
            'INSERT OR IGNORE INTO aircraft_access(id,aircraft_id,user_id,access_role,created_at) VALUES(?,?,?,?,?)'
          );
          for(const aircraftId of aircraftIds){
            if(validIds.has(aircraftId)) ins.run(id('aac'),aircraftId,existingUser.id,'pilot',now);
          }
        }

        state.db.prepare(`
          UPDATE invitations SET accepted_at=?,accepted_user_id=? WHERE id=? AND accepted_at IS NULL
        `).run(now,existingUser.id,inv.id);

        state.db.prepare(`
          INSERT INTO admin_audit_log(id,organization_id,actor_user_id,target_user_id,action,detail_json,created_at)
          VALUES(?,?,?,?,?,?,?)
        `).run(
          id('aud'),inv.organization_id,inv.created_by_user_id,existingUser.id,'INVITATION_ACCEPTED_EXISTING',
          JSON.stringify({invitation_id:inv.id,email:inv.email,role,aircraft_ids:aircraftIds}),now
        );
        state.db.exec('COMMIT');
      }catch(e){
        try{state.db.exec('ROLLBACK')}catch{}
        throw e;
      }

      const raw=crypto.randomBytes(32).toString('base64url'),sid=id('ses'),exp=addDaysIso(SESSION_DAYS);
      state.db.prepare(`
        INSERT INTO sessions(id,user_id,token_hash,user_agent,ip,created_at,last_seen_at,expires_at)
        VALUES(?,?,?,?,?,?,?,?)
      `).run(
        sid,existingUser.id,sha256(raw),
        String(req.headers['user-agent']||'').slice(0,500),
        String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim(),
        now,now,exp
      );
      setSessionCookie(req,res,raw,exp);

      return res.json({
        ok:true,
        existing_account:true,
        user:{id:existingUser.id,email:existingUser.email,display_name:existingUser.display_name,status:existingUser.status},
        memberships:membershipsFor(existingUser.id),
        aircraft:allowedAircraft(existingUser.id),
        redirect:'/'
      });
    }

    const displayName=String(req.body?.display_name||'').trim();
    const password=String(req.body?.password||'');
    if(displayName.length<2 || displayName.length>120) return res.status(400).json({ok:false,error:'INVALID_DISPLAY_NAME'});
    if(password.length<12) return res.status(400).json({ok:false,error:'PASSWORD_TOO_SHORT',minimum_length:12});

    const p=passwordRecord(password);
    const uid=id('usr');

    state.db.exec('BEGIN IMMEDIATE');
    try{
      state.db.prepare(`
        INSERT INTO users(id,email,display_name,password_salt,password_hash,status,created_at,updated_at)
        VALUES(?,?,?,?,?,'active',?,?)
      `).run(uid,String(inv.email).toLowerCase(),displayName,p.salt,p.hash,now,now);

      state.db.prepare(`
        INSERT INTO memberships(id,organization_id,user_id,role,created_at)
        VALUES(?,?,?,?,?)
      `).run(id('mem'),inv.organization_id,uid,role,now);

      if(!['administrator','aircraft_manager'].includes(role)){
        const valid=state.db.prepare(
          "SELECT id FROM aircraft WHERE organization_id=? AND status='active'"
        ).all(inv.organization_id);
        const validIds=new Set(valid.map(x=>x.id));
        const ins=state.db.prepare(
          'INSERT INTO aircraft_access(id,aircraft_id,user_id,access_role,created_at) VALUES(?,?,?,?,?)'
        );
        for(const aircraftId of aircraftIds){
          if(validIds.has(aircraftId)) ins.run(id('aac'),aircraftId,uid,'pilot',now);
        }
      }

      state.db.prepare(`
        UPDATE invitations SET accepted_at=?,accepted_user_id=? WHERE id=? AND accepted_at IS NULL
      `).run(now,uid,inv.id);

      state.db.prepare(`
        INSERT INTO admin_audit_log(id,organization_id,actor_user_id,target_user_id,action,detail_json,created_at)
        VALUES(?,?,?,?,?,?,?)
      `).run(
        id('aud'),inv.organization_id,inv.created_by_user_id,uid,'INVITATION_ACCEPTED',
        JSON.stringify({invitation_id:inv.id,email:inv.email,role,aircraft_ids:aircraftIds}),now
      );

      state.db.exec('COMMIT');
    }catch(e){
      try{state.db.exec('ROLLBACK')}catch{}
      throw e;
    }

    const raw=crypto.randomBytes(32).toString('base64url'),sid=id('ses'),exp=addDaysIso(SESSION_DAYS);
    state.db.prepare(`
      INSERT INTO sessions(id,user_id,token_hash,user_agent,ip,created_at,last_seen_at,expires_at)
      VALUES(?,?,?,?,?,?,?,?)
    `).run(
      sid,uid,sha256(raw),
      String(req.headers['user-agent']||'').slice(0,500),
      String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim(),
      now,now,exp
    );
    setSessionCookie(req,res,raw,exp);

    const u=state.db.prepare('SELECT id,email,display_name,status FROM users WHERE id=?').get(uid);
    res.status(201).json({
      ok:true,
      existing_account:false,
      user:u,
      memberships:membershipsFor(uid),
      aircraft:allowedAircraft(uid),
      redirect:'/'
    });
  });


  // v5.26.6 administrator-issued password recovery.
  app.post('/api/admin/users/:userId/password-reset',requireAuth,requireAdministrator,(req,res)=>{
    const targetUserId=String(req.params.userId||'');
    const organizationId=String(req.body?.organization_id||'');
    const membership=targetMembershipInAdminOrg(req,targetUserId,organizationId);
    if(!membership) return res.status(404).json({ok:false,error:'USER_NOT_FOUND_IN_ADMIN_ORGANIZATION'});

    const now=isoNow();
    state.db.prepare(`
      UPDATE password_resets SET revoked_at=?
      WHERE user_id=? AND used_at IS NULL AND revoked_at IS NULL
    `).run(now,targetUserId);

    const rawToken=crypto.randomBytes(32).toString('base64url');
    const resetId=id('pwd'),expiresAt=new Date(Date.now()+2*60*60*1000).toISOString();
    state.db.prepare(`
      INSERT INTO password_resets(id,user_id,organization_id,token_hash,expires_at,created_by_user_id,created_at)
      VALUES(?,?,?,?,?,?,?)
    `).run(resetId,targetUserId,organizationId,sha256(rawToken),expiresAt,req.flightopsSession.user_id,now);

    writeAdminAudit(req,organizationId,targetUserId,'PASSWORD_RESET_CREATED',{reset_id:resetId,expires_at:expiresAt});
    res.status(201).json({
      ok:true,
      reset:{
        id:resetId,
        user_id:targetUserId,
        expires_at:expiresAt,
        reset_path:`/reset-password.html?token=${encodeURIComponent(rawToken)}`
      }
    });
  });

  app.get('/api/password-resets/:token',(req,res)=>{
    if(!state.ok) return res.status(503).json({ok:false,error:state.error});
    const token=String(req.params.token||'');
    if(token.length<20) return res.status(404).json({ok:false,error:'RESET_NOT_FOUND'});
    const row=state.db.prepare(`
      SELECT pr.*,u.email,u.display_name,u.status AS user_status,o.name AS organization_name
      FROM password_resets pr
      JOIN users u ON u.id=pr.user_id
      LEFT JOIN organizations o ON o.id=pr.organization_id
      WHERE pr.token_hash=?
    `).get(sha256(token));
    if(!row) return res.status(404).json({ok:false,error:'RESET_NOT_FOUND'});
    if(row.revoked_at) return res.status(410).json({ok:false,error:'RESET_REVOKED'});
    if(row.used_at) return res.status(410).json({ok:false,error:'RESET_ALREADY_USED'});
    if(Date.parse(row.expires_at)<=Date.now()) return res.status(410).json({ok:false,error:'RESET_EXPIRED'});
    if(row.user_status!=='active') return res.status(409).json({ok:false,error:'ACCOUNT_NOT_ACTIVE'});
    res.json({ok:true,reset:{email:row.email,display_name:row.display_name,organization_name:row.organization_name,expires_at:row.expires_at}});
  });

  app.post('/api/password-resets/:token/accept',(req,res)=>{
    if(!state.ok) return res.status(503).json({ok:false,error:state.error});
    const token=String(req.params.token||'');
    if(token.length<20) return res.status(404).json({ok:false,error:'RESET_NOT_FOUND'});
    const row=state.db.prepare(`
      SELECT pr.*,u.email,u.display_name,u.status AS user_status
      FROM password_resets pr
      JOIN users u ON u.id=pr.user_id
      WHERE pr.token_hash=?
    `).get(sha256(token));
    if(!row) return res.status(404).json({ok:false,error:'RESET_NOT_FOUND'});
    if(row.revoked_at) return res.status(410).json({ok:false,error:'RESET_REVOKED'});
    if(row.used_at) return res.status(410).json({ok:false,error:'RESET_ALREADY_USED'});
    if(Date.parse(row.expires_at)<=Date.now()) return res.status(410).json({ok:false,error:'RESET_EXPIRED'});
    if(row.user_status!=='active') return res.status(409).json({ok:false,error:'ACCOUNT_NOT_ACTIVE'});

    const password=String(req.body?.password||'');
    if(password.length<12) return res.status(400).json({ok:false,error:'PASSWORD_TOO_SHORT',minimum_length:12});
    const p=passwordRecord(password),now=isoNow();

    state.db.exec('BEGIN IMMEDIATE');
    try{
      state.db.prepare('UPDATE users SET password_salt=?,password_hash=?,updated_at=? WHERE id=?')
        .run(p.salt,p.hash,now,row.user_id);
      state.db.prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL')
        .run(now,row.user_id);
      state.db.prepare('UPDATE password_resets SET used_at=? WHERE id=?').run(now,row.id);
      state.db.prepare(`
        INSERT INTO admin_audit_log(id,organization_id,actor_user_id,target_user_id,action,detail_json,created_at)
        VALUES(?,?,?,?,?,?,?)
      `).run(
        id('aud'),row.organization_id,row.created_by_user_id,row.user_id,'PASSWORD_RESET_COMPLETED',
        JSON.stringify({reset_id:row.id}),now
      );
      state.db.exec('COMMIT');
    }catch(e){
      try{state.db.exec('ROLLBACK')}catch{}
      throw e;
    }

    const raw=crypto.randomBytes(32).toString('base64url'),sid=id('ses'),exp=addDaysIso(SESSION_DAYS);
    state.db.prepare(`
      INSERT INTO sessions(id,user_id,token_hash,user_agent,ip,created_at,last_seen_at,expires_at)
      VALUES(?,?,?,?,?,?,?,?)
    `).run(
      sid,row.user_id,sha256(raw),
      String(req.headers['user-agent']||'').slice(0,500),
      String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].trim(),
      now,now,exp
    );
    setSessionCookie(req,res,raw,exp);

    res.json({ok:true,redirect:'/'});
  });

  app.get('/api/admin/audit',requireAuth,requireAdministrator,(req,res)=>{
    const organizationId=String(req.query.organization_id||req.flightopsAdminMemberships[0]?.organization_id||'');
    if(!administeredOrganization(req,organizationId)) return res.status(403).json({ok:false,error:'ORGANIZATION_ADMIN_REQUIRED'});
    const rows=state.db.prepare(`
      SELECT a.id,a.action,a.detail_json,a.created_at,
             actor.email AS actor_email,actor.display_name AS actor_display_name,
             target.email AS target_email,target.display_name AS target_display_name
      FROM admin_audit_log a
      JOIN users actor ON actor.id=a.actor_user_id
      LEFT JOIN users target ON target.id=a.target_user_id
      WHERE a.organization_id=?
      ORDER BY a.created_at DESC
      LIMIT 250
    `).all(organizationId).map(r=>{
      let detail={};try{detail=JSON.parse(r.detail_json||'{}')}catch{}
      const x={...r,detail};delete x.detail_json;return x;
    });
    res.json({ok:true,organization_id:organizationId,audit:rows});
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


  // v5.26.8 trusted-device / signed offline authorization foundation.
  app.get('/api/offline/public-key',(req,res)=>{
    if(!state.ok) return res.status(503).json({ok:false,error:state.error});
    const key=ensureOfflineSigningKey();
    res.json({ok:true,algorithm:'ES256',key_format:'spki-pem',public_key_pem:key.public_pem,build});
  });

  app.get('/api/offline/status',requireAuth,(req,res)=>{
    const rows=state.db.prepare(`
      SELECT d.id,d.device_key,d.label,d.last_seen_at,d.revoked_at,
             og.expires_at AS grant_expires_at,og.revoked_at AS grant_revoked_at,og.created_at AS grant_created_at
      FROM devices d
      LEFT JOIN offline_grants og ON og.id=(
        SELECT g.id FROM offline_grants g WHERE g.device_id=d.id ORDER BY g.created_at DESC LIMIT 1
      )
      WHERE d.user_id=? ORDER BY d.last_seen_at DESC
    `).all(req.flightopsSession.user_id);
    res.json({ok:true,grant_days:offlineGrantDays(),devices:rows});
  });

  app.post('/api/offline/enroll',requireAuth,(req,res)=>{
    const userId=req.flightopsSession.user_id;
    const deviceKey=String(req.body?.device_key||'').trim();
    const label=String(req.body?.label||'This device').trim().slice(0,120)||'This device';
    if(!/^[A-Za-z0-9_-]{24,160}$/.test(deviceKey)) return res.status(400).json({ok:false,error:'INVALID_DEVICE_KEY'});
    const now=isoNow();
    let device=state.db.prepare('SELECT * FROM devices WHERE user_id=? AND device_key=?').get(userId,deviceKey);
    if(!device){
      const did=id('dev');
      state.db.prepare('INSERT INTO devices(id,user_id,device_key,label,last_seen_at,revoked_at) VALUES(?,?,?,?,?,NULL)')
        .run(did,userId,deviceKey,label,now);
      device={id:did,user_id:userId,device_key:deviceKey,label,last_seen_at:now,revoked_at:null};
    }else{
      state.db.prepare('UPDATE devices SET label=?,last_seen_at=?,revoked_at=NULL WHERE id=?').run(label,now,device.id);
      device={...device,label,last_seen_at:now,revoked_at:null};
    }
    state.db.prepare('UPDATE offline_grants SET revoked_at=? WHERE device_id=? AND revoked_at IS NULL').run(now,device.id);

    const memberships=membershipsFor(userId);
    const aircraft=allowedAircraft(userId).map(a=>({
      id:a.id,organization_id:a.organization_id,registration:a.registration,model:a.model,
      serial_number:a.serial_number,profile_key:a.profile_key,data_package_version:a.data_package_version
    }));
    const expiresAt=new Date(Date.now()+offlineGrantDays()*86400000).toISOString();
    const payload={
      iss:'KUSA FlightOps',aud:'KUSA FlightOps Offline',version:1,build,
      user:{id:userId,email:req.flightopsSession.email,display_name:req.flightopsSession.display_name},
      device:{id:device.id,key:device.device_key,label:device.label},
      memberships,aircraft,issued_at:now,expires_at:expiresAt
    };
    const token=signOfflinePayload(payload);
    const grantId=id('ofg');
    state.db.prepare('INSERT INTO offline_grants(id,device_id,user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)')
      .run(grantId,device.id,userId,sha256(token),expiresAt,now);

    for(const m of memberships.filter(x=>x.role==='administrator')){
      writeAdminAudit(req,m.organization_id,userId,'OFFLINE_DEVICE_AUTHORIZED',{device_id:device.id,label:device.label,grant_id:grantId,expires_at:expiresAt});
    }

    res.status(201).json({
      ok:true,
      device:{id:device.id,key:device.device_key,label:device.label},
      grant:{id:grantId,token,expires_at:expiresAt,days:offlineGrantDays()},
      public_key:ensureOfflineSigningKey().public_pem
    });
  });

  app.post('/api/offline/devices/:deviceId/revoke',requireAuth,(req,res)=>{
    const deviceId=String(req.params.deviceId||'');
    const device=state.db.prepare('SELECT * FROM devices WHERE id=? AND user_id=?').get(deviceId,req.flightopsSession.user_id);
    if(!device) return res.status(404).json({ok:false,error:'DEVICE_NOT_FOUND'});
    const now=isoNow();
    state.db.prepare('UPDATE devices SET revoked_at=? WHERE id=?').run(now,deviceId);
    state.db.prepare('UPDATE offline_grants SET revoked_at=? WHERE device_id=? AND revoked_at IS NULL').run(now,deviceId);
    for(const m of membershipsFor(req.flightopsSession.user_id).filter(x=>x.role==='administrator')){
      writeAdminAudit(req,m.organization_id,req.flightopsSession.user_id,'OFFLINE_DEVICE_REVOKED',{device_id:deviceId,label:device.label});
    }
    res.json({ok:true,device_id:deviceId,revoked_at:now});
  });

  // v5.26.8 mandatory application gate.
  // Public onboarding/recovery routes are registered above this middleware.
  // Everything registered after installPlatform() — including the FlightOps static app,
  // performance data APIs, weather, NOTAM, runway, sharing, and diagnostics — requires
  // a live server-side session when AUTH_REQUIRED is enabled.
  if(AUTH_REQUIRED){
    const publicExact=new Set([
      '/account.html',
      '/invite.html',
      '/reset-password.html',
      '/sw.js',
      '/manifest.webmanifest',
      '/api/health',
      '/api/offline/public-key'
    ]);
    const publicPrefixes=['/icons/'];

    app.use((req,res,next)=>{
      if(publicExact.has(req.path) || publicPrefixes.some(p=>req.path.startsWith(p))) return next();

      const s=currentSession(req);
      if(s){
        req.flightopsSession=s;
        return next();
      }

      if(req.path.startsWith('/api/')){
        return res.status(401).json({ok:false,error:'AUTH_REQUIRED'});
      }

      if(req.method==='GET' || req.method==='HEAD'){
        const nextUrl=String(req.originalUrl||'/');
        const params=new URLSearchParams();
        params.set('next',nextUrl);
        const shareToken=String(req.query?.airoShareToken||'').trim();
        if(shareToken) params.set('airoShareToken',shareToken);
        return res.redirect(302,`/account.html?${params.toString()}`);
      }

      return res.status(401).json({ok:false,error:'AUTH_REQUIRED'});
    });
  }
}

module.exports={installPlatform,state,AUTH_REQUIRED,SESSION_COOKIE,DB_PATH};
