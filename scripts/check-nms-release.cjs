'use strict';

// Runs on the deployment host. Never print credentials, tokens or provider bodies.
const credential=value=>String(value||'').trim().replace(/^(['"])(.*)\1$/,'$2');
function configuration(env=process.env){
  const client=credential(env.NMS_CLIENT_ID||env.FAA_NMS_CLIENT_ID);
  const secret=credential(env.NMS_CLIENT_SECRET||env.FAA_NMS_CLIENT_SECRET);
  const missing=[];
  if(!client)missing.push('NMS_CLIENT_ID');
  if(!secret)missing.push('NMS_CLIENT_SECRET');
  if(missing.length)throw new Error('Missing required FAA NMS configuration: '+missing.join(', '));
  const auth=env.NMS_AUTH_URL||'https://api-nms.aim.faa.gov/v1/auth/token';
  const base=(env.NMS_BASE_URL||'https://api-nms.aim.faa.gov/nmsapi/v1').replace(/\/$/,'');
  // This release targets the established production FAA service. Never send
  // existing production credentials to a substituted or non-HTTPS destination.
  for(const raw of [auth,base]){
    let u;try{u=new URL(raw);}catch{throw new Error('Invalid FAA NMS endpoint configuration');}
    if(u.protocol!=='https:'||u.hostname!=='api-nms.aim.faa.gov'||u.port||u.username||u.password||u.search||u.hash)
      throw new Error('Release requires the approved FAA NMS production HTTPS endpoints');
  }
  if(auth!=='https://api-nms.aim.faa.gov/v1/auth/token'||base!=='https://api-nms.aim.faa.gov/nmsapi/v1')
    throw new Error('Release requires the approved FAA NMS production endpoint paths');
  if(String(env.NMS_RESPONSE_FORMAT||'GEOJSON').toUpperCase()!=='GEOJSON')throw new Error('Release requires NMS_RESPONSE_FORMAT=GEOJSON');
  return {client,secret,auth,base};
}
async function verifyLive({env=process.env,fetchImpl=fetch,airport='KBPT'}={}){
  const c=configuration(env);
  if(!/^K[A-Z0-9]{3}$/.test(airport))throw new Error('A valid US ICAO test airport is required');
  async function request(url,options,label){
    let response;try{response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(25000)});}
    catch{throw new Error(label+' request failed or timed out');}
    if(!response.ok)throw new Error(label+' failed (HTTP '+response.status+')');
    try{return await response.json();}catch{throw new Error(label+' returned unreadable JSON');}
  }
  const token=await request(c.auth,{method:'POST',headers:{Authorization:'Basic '+Buffer.from(c.client+':'+c.secret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:'grant_type=client_credentials'},'FAA NMS authentication');
  if(typeof token.access_token!=='string'||!token.access_token.trim())throw new Error('FAA NMS authentication returned no access token');
  const notams=await request(c.base+'/notams?location='+airport,{headers:{Authorization:'Bearer '+token.access_token,Accept:'application/json',nmsResponseFormat:'GEOJSON'}},'FAA NMS NOTAM retrieval');
  const features=Array.isArray(notams?.data?.geojson)?notams.data.geojson:Array.isArray(notams?.geojson)?notams.geojson:Array.isArray(notams?.features)?notams.features:null;
  if(!features)throw new Error('FAA NMS NOTAM retrieval returned no recognized GeoJSON collection');
  // An airport may legitimately have zero notices. The response must still be
  // an authenticated, valid collection, not an error object interpreted as empty.
  return {ok:true,authenticated:true,airport,notam_features:features.length,checked_at:new Date().toISOString()};
}
if(require.main===module){
  (async()=>{
    if(process.argv.includes('--live')){
      console.log('PASS FAA NMS live release check: '+JSON.stringify(await verifyLive()));
    }else{configuration();console.log('PASS FAA NMS deployment configuration: required credentials present; approved endpoints and GEOJSON selected.');}
  })().catch(error=>{console.error('RELEASE BLOCKED: '+error.message);process.exitCode=1;});
}
module.exports={configuration,verifyLive};
