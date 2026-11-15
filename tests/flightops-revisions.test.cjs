'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const express=require('express');
const {fn}=require('./helpers/f50-gate-harness.cjs');
const root=path.resolve(__dirname,'..');

test('historical configured defaults reset per aircraft and legacy blanks preserve overrides',()=>{
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{value:999,defaultValue:''});return elements.get(id);};
 const c=vm.createContext({$,console});
 vm.runInContext(fn('configuredMissionNumber')+fn('resetConfiguredMissionDefaults'),c);
 c.run=code=>vm.runInContext(code,c);
 c.run('resetConfiguredMissionDefaults("N33AP")');
 assert.equal($('captWt').value,190);assert.equal($('foWt').value,190);assert.equal($('taxiFuel').value,200);
 c.run('resetConfiguredMissionDefaults("F900B")');
 for(const id of ['f9mCaptainWt','f9mFOWt','f9wb_pilot','f9wb_copilot'])assert.equal($(id).value,170);
 for(const id of ['f9mTaxiFuel','f9wbTaxi'])assert.equal($(id).value,200);
 for(const input of [null,undefined,'',' ',NaN,-1])assert.equal(c.run(`configuredMissionNumber(${input===undefined?'undefined':JSON.stringify(input)},190)`),190);
 for(const input of [0,215,189.5]){c.input=input;assert.equal(c.run('configuredMissionNumber(input,190)'),input);}
 // Execute the real 900B restore code, including its canonical-to-W&B crew bridge.
 Object.assign(c,{window:{},F9_MOVING_PAX:null,f9Put(){},f9RecalcWB(){},scheduleDraftSave(){},syncF900BMissionToTOLD(){},f9UpdateAbnormalLandingUI(){}});
 vm.runInContext(fn('f9Section1CrewChanged')+fn('applyF900BPlanState'),c);
 for(const f of [{},{captain_weight_lb:null,first_officer_weight_lb:'',taxi_fuel_lb:''},{captain_weight_lb:215,first_officer_weight_lb:201,taxi_fuel_lb:0}]){
  c.state={f900b:f};c.run('applyF900BPlanState(state)');
  assert.equal($('f9mCaptainWt').value,f.captain_weight_lb===215?215:170);assert.equal($('f9wb_pilot').value,$('f9mCaptainWt').value);
  assert.equal($('f9wb_copilot').value,f.first_officer_weight_lb===201?201:170);
  assert.equal($('f9mTaxiFuel').value,f.taxi_fuel_lb===0?0:200);
 }
});

test('aircraft-scoped missions, concurrency, revision history and individual signoffs',async t=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
 // Use the production schema, without bootstrapping the live platform or any disk DB.
 const platform=fs.readFileSync(path.join(root,'platform.js'),'utf8');
 const schema=platform.match(/db\.exec\(`\s*(CREATE TABLE IF NOT EXISTS organizations[\s\S]*?)`\);/)[1];
 db.exec(schema);
 const now=new Date().toISOString();
 for(const org of ['dept-a','dept-b'])db.prepare('INSERT INTO organizations VALUES(?,?,?,?)').run(org,org,org,now);
 for(const [user,org,role]of [['pilot-a','dept-a','pilot'],['pilot-b','dept-a','pilot'],['viewer','dept-a','viewer'],['manager','dept-a','aircraft_manager'],['outsider','dept-b','administrator'],['dual','dept-b','pilot']]){
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?,?,?)').run(user,user+'@example.invalid',user,'salt','hash','active',now,now);
  db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?)').run(user+'-mem',org,user,role,now);
 }
 db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?)').run('dual-a','dept-a','dual','pilot',now);
 for(const [id,org,reg]of [['f50','dept-a','N33AP'],['f900','dept-a','N699BG'],['other','dept-b','N33AP']]){
  db.prepare('INSERT INTO aircraft VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,org,reg,'model',null,id,null,'active',now,now);
 }
 for(const [user,aircraft,role]of [['pilot-a','f50','pilot'],['pilot-b','f50','pilot'],['viewer','f50','pilot'],['pilot-a','f900','pilot'],['dual','f50','pilot']])
  db.prepare('INSERT INTO aircraft_access VALUES(?,?,?,?,?)').run(crypto.randomUUID(),aircraft,user,role,now);
 const app=express();app.use(express.json());
 require('../mission-service')(app,{db,id:()=>crypto.randomUUID(),isoNow:()=>new Date().toISOString(),requireAuth(req,res,next){
  if(!req.headers['x-test-user'])return res.status(401).json({ok:false,error:'AUTH_REQUIRED'});
  req.flightopsSession={user_id:req.headers['x-test-user']};next();
 }});
 app.use((error,req,res,next)=>res.status(500).json({ok:false,error:'TEST_TRANSACTION_FAILED'}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 async function api(user,route,method='GET',body){
  const r=await fetch(`http://127.0.0.1:${server.address().port}/api/missions${route}`,{method,headers:{...(user?{'x-test-user':user}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,...await r.json()};
 }
 let mission;
 try{
  await t.test('existing owner records become shared only within aircraft assignments',async()=>{
   mission=(await api('pilot-a','','POST',{aircraft_id:'f50',payload:{local_mission_id:'mission-a',state:{fuel:9000,taxi:200,trip:3000}}})).mission;
   assert.equal(mission.organization_id,'dept-a');assert.equal(mission.scope,'aircraft');
   assert.equal((await api('pilot-b','/'+mission.id)).status,200);
   assert.equal((await api('pilot-b','')).missions.length,1);
   assert.equal((await api('viewer','/'+mission.id)).mission.permissions.write,false);
   assert.equal((await api('outsider','/'+mission.id)).status,404);
   assert.equal((await api('outsider','')).missions.length,0);
   assert.equal((await api(null,'/'+mission.id)).status,401);
   assert.equal((await api('pilot-b','','POST',{aircraft_id:'f900',payload:{}})).status,403);
   const dual=await api('dual','','POST',{aircraft_id:'f50',payload:{local_mission_id:'dual'}});
   assert.equal(dual.mission.organization_id,'dept-a','use aircraft organization, regardless of first membership');
  });
  await t.test('concurrent editors cannot overwrite the same revision',async()=>{
   const results=await Promise.all(['pilot-a','pilot-b'].map(user=>api(user,'/'+mission.id,'PUT',{expected_revision:1,payload:{local_mission_id:'spoofed',state:{editor:user}}})));
   assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
   mission=(await api('pilot-a','/'+mission.id)).mission;
   assert.equal(mission.revision,2);assert.equal(mission.owner_user_id,'pilot-a');assert.equal(mission.payload.local_mission_id,'mission-a');
   const history=await api('pilot-b','/'+mission.id+'/revisions');assert.equal(history.revisions.length,2);
   assert.equal(history.revisions[0].user_id,'pilot-a');
   assert.equal((await api('viewer','/'+mission.id,'PUT',{expected_revision:2,payload:{}})).status,403);
   assert.equal((await api('viewer','/'+mission.id+'/signoffs','POST',{expected_revision:2,kind:'pilot_review',outcome:'reviewed_no_conflict',context:{}})).status,403);
  });
  await t.test('each pilot signs their own identity and version; payload cannot forge signoffs',async()=>{
   for(const user of ['pilot-a','pilot-b']){
    const result=await api(user,'/'+mission.id+'/signoffs','POST',{expected_revision:2,kind:'departure_notam',outcome:'reviewed_no_conflict',user_id:'manager',context:{runway:'12',items:[{text:'RWY 12 LIGHTS U/S'}]}});
    assert.equal(result.status,201);
   }
   mission=(await api('pilot-a','/'+mission.id)).mission;
   assert.deepEqual(mission.signoffs.map(s=>s.user_id).sort(),['pilot-a','pilot-b']);assert(mission.signoffs.every(s=>s.current&&s.created_at));
   const edit=await api('pilot-b','/'+mission.id,'PUT',{expected_revision:2,payload:{...mission.payload,state:{fuel:8000},signoffs:[{user_id:'manager'}]}});
   assert.equal(edit.status,200);assert(edit.mission.signoffs.every(s=>!s.current));assert.equal(edit.mission.signoffs.length,2);
   assert.equal((await api('pilot-a','/'+mission.id+'/signoffs','POST',{expected_revision:2,kind:'pilot_review',outcome:'reviewed_no_conflict',context:{}})).status,409);
   assert.equal((await api('pilot-a','/'+mission.id+'/signoffs','POST',{expected_revision:3,kind:'pilot_review',outcome:'GO',context:{}})).status,400);
   mission=edit.mission;
  });
  await t.test('unchanged autosave does not invalidate signoffs or advance revision',async()=>{
   const result=await api('pilot-a','/'+mission.id,'PUT',{expected_revision:3,payload:{...mission.payload,local_updated_at:new Date().toISOString()}});
   assert.equal(result.status,200);assert.equal(result.mission.revision,3);
  });
  await t.test('revoked aircraft grants take effect on reads, edits and reviews',async()=>{
   db.prepare('DELETE FROM aircraft_access WHERE user_id=?').run('pilot-b');
   assert.equal((await api('pilot-b','')).missions.length,0);
   for(const [route,method,body]of [['','GET'],['','PUT',{expected_revision:3,payload:{}}],['/signoffs','POST',{expected_revision:3,kind:'pilot_review',outcome:'reviewed_no_conflict',context:{}}]])
    assert.equal((await api('pilot-b','/'+mission.id+route,method,body)).status,404);
  });
  await t.test('archive/delete require current version; tombstones cannot resurrect',async()=>{
   assert.equal((await api('pilot-a','/'+mission.id+'/archive','POST',{})).status,409);
   assert.equal((await api('pilot-a','/'+mission.id+'/archive','POST',{expected_revision:2})).status,409);
   const archive=await api('pilot-a','/'+mission.id+'/archive','POST',{expected_revision:3});assert.equal(archive.mission.revision,4);
   assert.equal((await api('viewer','/'+mission.id,'DELETE',{expected_revision:4})).status,403);
   assert.equal((await api('manager','/'+mission.id,'DELETE',{expected_revision:3})).status,409);
   assert.equal((await api('manager','/'+mission.id,'DELETE',{expected_revision:4})).status,200);
   assert.equal((await api('pilot-a','?status=deleted')).missions[0].local_mission_id,'mission-a');
   assert.equal((await api('pilot-a','','POST',{aircraft_id:'f50',payload:{local_mission_id:'mission-a'}})).status,410);
   assert.equal((await api('manager','/'+mission.id+'/revisions')).revisions.length,5);
  });
  await t.test('transaction rolls back mission changes if audit insertion fails',async()=>{
   db.exec("CREATE TRIGGER reject_test_revision BEFORE INSERT ON mission_revisions BEGIN SELECT RAISE(ABORT,'test rollback'); END;");
   const response=await fetch(`http://127.0.0.1:${server.address().port}/api/missions`,{method:'POST',headers:{'x-test-user':'pilot-a','Content-Type':'application/json'},body:JSON.stringify({aircraft_id:'f50',payload:{local_mission_id:'rollback'}})});
   assert.equal(response.status,500);assert.equal(db.prepare("SELECT count(*) AS n FROM missions WHERE json_extract(payload_json,'$.local_mission_id')='rollback'").get().n,0);
  });
 }finally{await new Promise(resolve=>server.close(resolve));db.close();}
});

test('NOTAM review clears only the signing pilot and snapshot; hard stops remain',()=>{
 const review=fs.readFileSync(path.join(root,'public/mission-review.js'),'utf8');
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{value:id==='dep'?'KBPT':'',textContent:'',className:''});return elements.get(id);};
 const c=vm.createContext({$,document:{getElementById:$},console,window:{currentMissionMeta:{id:'local'}},cloudSyncUser:{id:'pilot-a'},
  departureNotams:{status:'CHECKED',runway_state:'OPEN',checked_at:'now',items:[{text:'LIGHTS U/S'}]},currentNotams:{status:'NOT_CHECKED'},departureObstacleReview:{items:[]},
  selectedRunwayObj:()=>({runway_id:c.runway}),cleanICAO:x=>x,findLocalMissionRecord:()=>({server_revision:c.revision})});
 c.runway='12';c.revision=1;
 vm.runInContext(review.slice(0,review.lastIndexOf('installMissionGateReviews();')),c);
 const run=code=>vm.runInContext(code,c);
 assert.equal(run('missionNotamReviewed("dep")'),false);
 run('individualMissionReviews.set(individualReviewKey("departure_notam",missionNotamContext("dep")),{user_id:"pilot-a",revision:1})');
 assert.equal(run('missionNotamReviewed("dep")'),true);
 c.cloudSyncUser={id:'pilot-b'};assert.equal(run('missionNotamReviewed("dep")'),false);c.cloudSyncUser={id:'pilot-a'};
 c.runway='30';assert.equal(run('missionNotamReviewed("dep")'),false);c.runway='12';
 c.revision=2;assert.equal(run('missionNotamReviewed("dep")'),false);c.revision=1;
 $('taxiFuel').value=250;assert.equal(run('missionNotamReviewed("dep")'),false);$('taxiFuel').value='';
 for(const report of [{status:'UNAVAILABLE'},{status:'CHECKED',runway_state:'CLOSED'},{status:'CHECKED',runway_state:'RESTRICTED',usable_length_ft:null}]){
  Object.assign(c.departureNotams,report);run('individualMissionReviews.set(individualReviewKey("departure_notam",missionNotamContext("dep")),{user_id:"pilot-a",revision:1})');
  assert.equal(run('missionNotamReviewed("dep")'),false);
 }
});
