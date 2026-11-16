'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),path=require('node:path');
const {configuration,verifyLive}=require('../scripts/check-nms-release.cjs');
const valid={NMS_CLIENT_ID:'synthetic-test-id',NMS_CLIENT_SECRET:'synthetic-test-secret'};
for(const env of [{},{NMS_CLIENT_ID:'id'},{NMS_CLIENT_SECRET:'secret'},{NMS_CLIENT_ID:' ',NMS_CLIENT_SECRET:'""'}])
 test('missing/incomplete configuration blocks release '+JSON.stringify(Object.keys(env)),()=>assert.throws(()=>configuration(env),/Missing required FAA NMS/));
test('valid credentials and legacy aliases use established production endpoints',()=>{
 const c=configuration({FAA_NMS_CLIENT_ID:"'synthetic-id'",FAA_NMS_CLIENT_SECRET:'"synthetic-secret"'});
 assert.equal(c.client,'synthetic-id');assert.equal(c.secret,'synthetic-secret');
 assert.equal(c.base,'https://api-nms.aim.faa.gov/nmsapi/v1');
});
test('invalid destinations and unsupported response formats block before sending credentials',async()=>{
 for(const overrides of [{NMS_AUTH_URL:'https://example.invalid/token'},{NMS_BASE_URL:'http://api-nms.aim.faa.gov/nmsapi/v1'},{NMS_AUTH_URL:'https://api-nms.aim.faa.gov/changed'},{NMS_BASE_URL:'https://api-nms.aim.faa.gov/nmsapi/v1?token=bad'},{NMS_RESPONSE_FORMAT:'AIXM'}]){
  let called=false;await assert.rejects(verifyLive({env:{...valid,...overrides},fetchImpl:async()=>{called=true;}}));assert.equal(called,false);
 }
});
test('live gate requires successful authentication and actual NOTAM retrieval',async()=>{
 const calls=[];const result=await verifyLive({env:valid,fetchImpl:async(url,options)=>{
  calls.push({url,options});return {ok:true,json:async()=>calls.length===1?{access_token:'synthetic-token'}:{features:[{properties:{text:'TEST ONLY'}}]}};
 }});
 assert.equal(result.authenticated,true);assert.equal(result.notam_features,1);assert.equal(calls.length,2);
 assert.match(calls[1].url,/notams\?location=KBPT/);assert.equal(calls[1].options.headers.nmsResponseFormat,'GEOJSON');
 assert(calls.every(c=>c.options.redirect==='error'));
 assert(!JSON.stringify(result).includes('synthetic'));
});
test('zero notices is valid only with a recognized authenticated collection',async()=>{
 for(const payload of [{features:[]},{geojson:[]},{data:{geojson:[]}}]){
  let calls=0;const r=await verifyLive({env:valid,fetchImpl:async()=>({ok:true,json:async()=>++calls===1?{access_token:'synthetic-token'}:payload})});assert.equal(r.notam_features,0);
 }
});
test('auth errors, revoked tokens, malformed payloads and network errors cannot pass or leak secrets',async()=>{
 for(const failure of ['auth','missing_token','notams','malformed','network']){
  let calls=0;
  await assert.rejects(verifyLive({env:valid,fetchImpl:async()=>{
   calls++;
   if(failure==='network')throw new Error(valid.NMS_CLIENT_SECRET);
   if((failure==='auth'&&calls===1)||(failure==='notams'&&calls===2))return {ok:false,status:401,json:async()=>({error:valid.NMS_CLIENT_SECRET})};
   return {ok:true,json:async()=>calls===1?(failure==='missing_token'?{}:{access_token:'synthetic-token'}):{error:valid.NMS_CLIENT_SECRET}};
  }}),e=>!e.message.includes(valid.NMS_CLIENT_SECRET));
 }
});
test('deployment entrypoint blocks missing configuration without reading database settings',()=>{
 const r=spawnSync(process.execPath,[path.join(__dirname,'../scripts/check-nms-release.cjs')],{encoding:'utf8',env:{PATH:process.env.PATH,FLIGHTOPS_DB_PATH:'UNCHANGED-SYNTHETIC-MARKER'}});
 assert.equal(r.status,1);assert.match(r.stderr,/RELEASE BLOCKED.*NMS_CLIENT_ID.*NMS_CLIENT_SECRET/);assert(!r.stderr.includes('UNCHANGED-SYNTHETIC-MARKER'));
});
