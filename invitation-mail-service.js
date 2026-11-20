'use strict';
const crypto=require('node:crypto');
const {createMailer}=require('./scripts/invitation-mail.cjs');
module.exports=function installInvitationMail(app,{db,requireAuth,requireAdministrator,administeredOrganization,id,isoNow,writeAdminAudit,mailer=createMailer()}){
 db.exec('CREATE TABLE IF NOT EXISTS invitation_mail_requests (actor_id TEXT NOT NULL REFERENCES users(id), request_id TEXT NOT NULL, organization_id TEXT NOT NULL REFERENCES organizations(id), fingerprint TEXT NOT NULL, invitation_id TEXT NOT NULL REFERENCES invitations(id), status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(actor_id,request_id))');
 app.get('/api/admin/invitation-mail',requireAuth,requireAdministrator,(req,res)=>{const mail=mailer.status(),preview=String(req.get('host')).includes('.preview.');res.json({ok:true,mail:{...mail,configured:mail.configured&&!preview,reason:preview?'PREVIEW_EMAIL_DISABLED':null}});});
 const guarded=handler=>(req,res,next)=>Promise.resolve(handler(req,res,next)).catch(()=>res.status(503).json({ok:false,error:'INVITATION_SERVICE_UNAVAILABLE',message:'The invitation service is unavailable. Check send status before retrying.'}));
 app.post('/api/admin/invitations',requireAuth,requireAdministrator,guarded(async(req,res,next)=>{
  if(req.body?.delivery!=='email')return next();
  if(String(req.get('host')).includes('.preview.'))return res.status(409).json({ok:false,error:'PREVIEW_EMAIL_DISABLED',message:'Preview cannot send invitations to Live FlightOps.'});
  if(req.get('X-FlightOps-Action')!=='invitation')return res.status(403).json({ok:false,error:'ACTION_REQUIRED'});
  const actor=req.flightopsSession.user_id,org=String(req.body.organization_id||''),membership=administeredOrganization(req,org);
  if(!membership)return res.status(403).json({ok:false,error:'ORGANIZATION_ADMIN_REQUIRED'});
  const email=String(req.body.email||'').trim().toLowerCase(),role=String(req.body.role||'pilot'),requestId=String(req.body.request_id||'');
  if(!/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(email)||email.length>254)return res.status(400).json({ok:false,error:'INVALID_EMAIL'});
  if(!['administrator','aircraft_manager','pilot','viewer'].includes(role))return res.status(400).json({ok:false,error:'INVALID_ROLE'});
  if(!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId))return res.status(400).json({ok:false,error:'INVALID_REQUEST_ID'});
  const aircraft=Array.isArray(req.body.aircraft_ids)?[...new Set(req.body.aircraft_ids.map(String))].sort():[];
  const valid=db.prepare("SELECT id,registration FROM aircraft WHERE organization_id=? AND status='active' ORDER BY registration").all(org);
  if(aircraft.some(a=>!valid.some(v=>v.id===a)))return res.status(400).json({ok:false,error:'INVALID_AIRCRAFT_FOR_ORGANIZATION'});
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify({email,role,org,aircraft})).digest('hex');
  function reply(row){const messages={accepted:'Microsoft 365 accepted the invitation for sending. Final delivery is not yet confirmed.',pending:'The send request is still processing or its result is unknown. Check before sending another invitation.',uncertain:'The email service did not confirm the result. Check the recipient or Sent Items before sending another invitation.',failed:'The invitation could not be sent. No active invitation was left behind.'};return res.status(row.status==='accepted'?200:row.status==='pending'?202:502).json({ok:row.status==='accepted'||row.status==='pending',delivery:{status:row.status,from:mailer.status().from,email,invitation_id:row.invitation_id},message:messages[row.status]});}
  const previous=db.prepare('SELECT * FROM invitation_mail_requests WHERE actor_id=? AND request_id=?').get(actor,requestId);
  if(previous){if(previous.fingerprint!==fingerprint)return res.status(409).json({ok:false,error:'SEND_REQUEST_CHANGED'});return reply(previous);}
  if(!mailer.status().configured)return res.status(503).json({ok:false,error:'INVITATION_MAIL_NOT_CONFIGURED',message:'Invitation email is not connected yet. No invitation was created.'});
  if(db.prepare('SELECT u.id FROM users u JOIN memberships m ON m.user_id=u.id WHERE u.email=? AND m.organization_id=?').get(email,org))return res.status(409).json({ok:false,error:'USER_ALREADY_MEMBER'});
  const now=isoNow(),recent=db.prepare('SELECT COUNT(*) n FROM invitation_mail_requests WHERE actor_id=? AND created_at>?').get(actor,new Date(Date.now()-60000).toISOString()).n;
  if(recent>=10)return res.status(429).json({ok:false,error:'INVITATION_SEND_LIMIT',message:'Please wait a minute before sending more invitations.'});
  const raw=crypto.randomBytes(32).toString('base64url'),invitationId=id('inv'),expires=new Date(Date.now()+7*86400000).toISOString();
  try{db.exec('BEGIN IMMEDIATE');
   db.prepare('INSERT INTO invitations(id,organization_id,email,role,token_hash,expires_at,created_by_user_id,created_at,aircraft_json) VALUES(?,?,?,?,?,?,?,?,?)').run(invitationId,org,email,role,crypto.createHash('sha256').update(raw).digest('hex'),expires,actor,now,JSON.stringify(aircraft));
   db.prepare('INSERT INTO invitation_mail_requests VALUES(?,?,?,?,?,?,?,?)').run(actor,requestId,org,fingerprint,invitationId,'pending',now,now);
   writeAdminAudit(req,org,null,'INVITATION_EMAIL_REQUESTED',{invitation_id:invitationId,email,role,aircraft_ids:aircraft,expires_at:expires});db.exec('COMMIT');
  }catch{try{db.exec('ROLLBACK');}catch{}return res.status(503).json({ok:false,error:'INVITATION_SAVE_FAILED',message:'The invitation could not be saved. No email was sent.'});}
  let status='accepted';try{const organization=db.prepare('SELECT name FROM organizations WHERE id=?').get(org);await mailer.send({email,organization:organization.name,role,aircraft:valid.filter(a=>['administrator','aircraft_manager'].includes(role)||aircraft.includes(a.id)).map(a=>a.registration),invitePath:'/invite.html?token='+raw,expiresAt:expires});}catch(e){status=e.uncertain?'uncertain':'failed';console.warn('[Invitation mail]',JSON.stringify({status,reason:['INVITATION_MAIL_AUTH_FAILED','INVITATION_MAIL_REJECTED','INVITATION_MAIL_STATUS_UNKNOWN'].includes(e.message)?e.message:'SEND_FAILED',http_status:Number.isInteger(e.httpStatus)?e.httpStatus:null,provider_code:Number.isSafeInteger(e.providerCode)?e.providerCode:null}));}
  try{db.exec('BEGIN IMMEDIATE');
   db.prepare('UPDATE invitation_mail_requests SET status=?,updated_at=? WHERE actor_id=? AND request_id=?').run(status,isoNow(),actor,requestId);
   if(status==='failed')db.prepare('UPDATE invitations SET revoked_at=? WHERE id=?').run(isoNow(),invitationId);
   writeAdminAudit(req,org,null,'INVITATION_EMAIL_'+status.toUpperCase(),{invitation_id:invitationId,email});db.exec('COMMIT');
  }catch{try{db.exec('ROLLBACK');}catch{}return res.status(502).json({ok:false,error:'INVITATION_MAIL_STATUS_UNKNOWN',message:'The send result could not be recorded. Check the recipient or Sent Items before sending another invitation.'});}
  return reply({status,invitation_id:invitationId});
 }));
};
