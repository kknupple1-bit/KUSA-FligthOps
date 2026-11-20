'use strict';
const FROM='kusa@kusaaviation.com',ORIGIN='https://flightops.kusaaviation.com';
const guid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function createMailer({env=process.env,request=globalThis.fetch}={}){
 function status(){return {configured:env.FLIGHTOPS_INVITATION_MAIL_ENABLED==='true'&&guid.test(env.FLIGHTOPS_MAIL_TENANT_ID||'')&&guid.test(env.FLIGHTOPS_MAIL_CLIENT_ID||'')&&!!String(env.FLIGHTOPS_MAIL_CLIENT_SECRET||'').trim(),from:FROM};}
 async function authorize(){
  let auth;try{auth=await request('https://login.microsoftonline.com/'+env.FLIGHTOPS_MAIL_TENANT_ID+'/oauth2/v2.0/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.FLIGHTOPS_MAIL_CLIENT_ID,client_secret:env.FLIGHTOPS_MAIL_CLIENT_SECRET,grant_type:'client_credentials',scope:'https://graph.microsoft.com/.default'}),signal:AbortSignal.timeout(15000)});}catch{throw Object.assign(Error('INVITATION_MAIL_AUTH_FAILED'),{uncertain:false});}
  let token={};try{token=await auth.json();}catch{}
  if(!auth.ok||!token.access_token)throw Object.assign(Error('INVITATION_MAIL_AUTH_FAILED'),{uncertain:false,httpStatus:Number.isInteger(auth.status)?auth.status:null,providerCode:Array.isArray(token.error_codes)?token.error_codes.find(Number.isSafeInteger)||null:null});
  return token.access_token;
 }
 async function verifyConnection(){
  if(!status().configured)return {...status(),authenticated:false,reason:'NOT_CONFIGURED'};
  try{await authorize();return {...status(),authenticated:true};}
  catch(e){return {...status(),authenticated:false,reason:'INVITATION_MAIL_AUTH_FAILED',http_status:e.httpStatus||null,provider_code:e.providerCode||null};}
 }
 async function send({email,organization,role,aircraft,invitePath,expiresAt}){
  if(!status().configured)throw Object.assign(Error('INVITATION_MAIL_NOT_CONFIGURED'),{uncertain:false});
  if(!/^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(email)||/[\r\n]/.test(email)||!/^\/invite\.html\?token=[A-Za-z0-9_-]{43}$/.test(invitePath))throw Object.assign(Error('INVALID_INVITATION_MESSAGE'),{uncertain:false});
  const clean=s=>String(s||'').replace(/[\r\n]/g,' ').slice(0,160);
  const text=['Welcome to KUSA FlightOps!','', 'Thank you for joining our Flight Department. Use the secure link below to complete your account setup and access your assigned aircraft.','', 'Flight Department: '+clean(organization),'Role: '+clean(role),'Aircraft: '+(aircraft.map(clean).join(', ')||'None assigned'),'',ORIGIN+invitePath,'','This invitation expires: '+new Date(expiresAt).toUTCString(),'', 'Already have a FlightOps account? Open the link and sign in with the invited email address.','', 'Please keep this personal invitation link private. If you were not expecting this invitation, you can disregard this email.','', 'Thank you,','KUSA Aviation','KUSA FlightOps'].join('\n');
  const accessToken=await authorize();
  let response;try{response=await request('https://graph.microsoft.com/v1.0/users/'+encodeURIComponent(FROM)+'/sendMail',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({message:{subject:'Welcome to KUSA FlightOps — your invitation',body:{contentType:'Text',content:text},toRecipients:[{emailAddress:{address:email}}]},saveToSentItems:true}),signal:AbortSignal.timeout(20000)});}catch{throw Object.assign(Error('INVITATION_MAIL_STATUS_UNKNOWN'),{uncertain:true});}
  if(response.status!==202)throw Object.assign(Error('INVITATION_MAIL_REJECTED'),{uncertain:response.status>=500,httpStatus:Number.isInteger(response.status)?response.status:null});
  return {status:'accepted',from:FROM};
 }
 return {status,send,verifyConnection};
}
module.exports={createMailer,FROM};
