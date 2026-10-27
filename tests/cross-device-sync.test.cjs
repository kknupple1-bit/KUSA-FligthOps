'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const net = require('node:net');
const vm = require('node:vm');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const {setTimeout: delay} = require('node:timers/promises');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const syncCode = html.slice(html.indexOf('const MISSION_SYNC_QUEUE_KEY='), html.indexOf('const OFFLINE_MISSION_PACKAGE_KEY='));

// Execute the shipped client sync code with separate device stores against a real,
// isolated server/SQLite database. No user credentials or production records.
function device(base, cookie) {
  const memory = new Map(), elements = new Map(), hooks = new Map(), scheduled = [];
  const api = {override: null, calls: [], storageFailure: null};
  const localStorage = {getItem:key=>memory.get(key)??null,
    setItem(key,value){if(api.storageFailure?.(key))throw new Error('Simulated storage quota');memory.set(key,String(value));},
    removeItem:key=>memory.delete(key)};
  const element = id => {if(!elements.has(id))elements.set(id,{textContent:'',className:'',disabled:false,style:{display:id==='archiveView'?'block':'none'}});return elements.get(id);};
  const context = vm.createContext({console:{warn(){}},crypto,navigator:{onLine:true},localStorage,
    window:{currentMissionMeta:null,addEventListener:(event,fn)=>hooks.set(event,fn)},
    document:{hidden:false,addEventListener:(event,fn)=>hooks.set(event,fn)},
    setTimeout(fn){scheduled.push(fn);return scheduled.length;},clearTimeout(){},setInterval(){},
    $:element,esc:value=>String(value),localISODate:value=>new Date(value).toISOString().slice(0,10),
    migrateContinuityStorage(){},refreshMenuCounts(){},renderDrafts(){},renderArchive(){},
    getMissionDrafts:()=>JSON.parse(localStorage.getItem('kusaFlightOpsDrafts')||'[]'),
    getMissionArchive:()=>JSON.parse(localStorage.getItem('kusaFlightOpsArchive')||'[]'),
    saveMissionDrafts:records=>localStorage.setItem('kusaFlightOpsDrafts',JSON.stringify(records)),
    saveMissionArchive:records=>localStorage.setItem('kusaFlightOpsArchive',JSON.stringify(records)),
    async fetch(route,options={}){
      api.calls.push({route,method:options.method||'GET'});
      assert(route.startsWith('/')&&!route.startsWith('//'));
      if(api.override){const response=await api.override(route,options);if(response)return response;}
      return fetch(base+route,{...options,headers:{...options.headers,Cookie:cookie},signal:AbortSignal.timeout(8000)});
    }
  });
  vm.runInContext(syncCode, context);
  return {...api, context, hooks, scheduled, elements, memory,
    configure(update){Object.assign(api,update);},calls:api.calls,
    run:code=>vm.runInContext(code,context),
    drafts:()=>JSON.parse(localStorage.getItem('kusaFlightOpsDrafts')||'[]'),
    archive:()=>JSON.parse(localStorage.getItem('kusaFlightOpsArchive')||'[]'),
    putDraft(record){const records=JSON.parse(localStorage.getItem('kusaFlightOpsDrafts')||'[]');const index=records.findIndex(r=>r.id===record.id);if(index>=0)records[index]=record;else records.push(record);localStorage.setItem('kusaFlightOpsDrafts',JSON.stringify(records));},
    putArchive(record){localStorage.setItem('kusaFlightOpsArchive',JSON.stringify([record]));localStorage.setItem('kusaFlightOpsDrafts',JSON.stringify(JSON.parse(localStorage.getItem('kusaFlightOpsDrafts')||'[]').filter(r=>r.id!==record.id)));},
    queue(id,action='upsert'){vm.runInContext(`enqueueMissionSync(${JSON.stringify(id)},${JSON.stringify(action)})`,context);}
  };
}
const response = (status,error) => new Response(JSON.stringify({ok:false,error}),{status,headers:{'Content-Type':'application/json'}});

test('Flight Plans Refresh and cross-device draft/archive continuity', {timeout:45000}, async t => {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'flightops-devices-'));
  const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');
  const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
  const base=`http://127.0.0.1:${port}`,email='devices@flightops.invalid',password=crypto.randomBytes(24).toString('hex');
  const child=spawn(process.execPath,['server.js'],{cwd:root,env:{PATH:process.env.PATH,NODE_ENV:'test',PORT:String(port),
    FLIGHTOPS_AUTH_REQUIRED:'true',FLIGHTOPS_DB_PATH:path.join(temp,'test.sqlite'),FLIGHTOPS_ADMIN_EMAIL:email,FLIGHTOPS_ADMIN_PASSWORD:password},stdio:['ignore','ignore','ignore']});
  child.on('error',()=>{});
  try {
    let ready=false;
    for(let i=0;i<100;i++){try{ready=(await fetch(base+'/api/health',{signal:AbortSignal.timeout(300)})).ok;}catch{}if(ready)break;await delay(100);}
    assert(ready,'Isolated server started');
    async function session(){const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
    const ipad=device(base,await session()),phone=device(base,await session());
    const record=(id,aircraft='N33AP')=>({id,trip_number:'20261026-TEST',trip_date:'2026-10-26',dep:'KBPT',dest:'KDTO',alt:'KIAH',
      aircraft,updated_at:new Date().toISOString(),started_at:new Date().toISOString(),state:{aircraft,marker:'initial',fuel:8100}});
    await t.test('Refresh is wired to a cloud reconciliation, rather than a local redraw',()=>{
      assert.match(html, /id="refreshFlightPlansBtn" onclick="refreshFlightPlans\(\)"/);
    });
    await t.test('iPad draft appears on a separate phone store after Refresh',async()=>{
      ipad.putDraft(record('ipad-draft'));ipad.queue('ipad-draft');
      assert.equal(await ipad.run('refreshFlightPlans()'),true);
      assert.equal(ipad.drafts()[0].server_sync_state,'synced');
      assert.equal(await phone.run('refreshFlightPlans()'),true);
      assert.equal(phone.drafts().find(r=>r.id==='ipad-draft').state.fuel,8100);
      assert(phone.calls.some(r=>r.route==='/api/missions?status=draft'));
      assert(phone.calls.some(r=>r.route==='/api/missions?status=archived'));
      assert.match(phone.elements.get('flightPlanSyncStatus').textContent,/devices@flightops.invalid/);
    });
    await t.test('completed iPad plan moves from phone Drafts to Archive with summary intact',async()=>{
      const plan={...ipad.drafts()[0],completed:true,completed_at:new Date().toISOString(),updated_at:new Date().toISOString(),
        summary:'Synthetic completed report',tow_lb:32000,ldw_lb:29000,mission_fuel_lb:3000,to_status:'TEST ONLY'};
      ipad.putArchive(plan);ipad.queue(plan.id,'archive');await ipad.run('refreshFlightPlans()');await phone.run('refreshFlightPlans()');
      assert.equal(phone.drafts().some(r=>r.id===plan.id),false);
      const archived=phone.archive().find(r=>r.id===plan.id);assert(archived);
      assert.equal(archived.summary,'Synthetic completed report');assert.equal(archived.tow_lb,32000);assert.equal(archived.mission_fuel_lb,3000);
      assert.equal(archived.state.fuel,8100);assert.equal(archived.server_sync_state,'synced');
    });
    await t.test('offline iPad plan is retained, then uploads and reaches phone on reconnect',async()=>{
      ipad.context.navigator.onLine=false;ipad.putDraft(record('offline-f900b','F900B'));ipad.queue('offline-f900b');
      assert.equal(await ipad.run('refreshFlightPlans()'),false);await phone.run('refreshFlightPlans()');
      assert.equal(phone.drafts().some(r=>r.id==='offline-f900b'),false);
      ipad.context.navigator.onLine=true;await ipad.run('refreshFlightPlans()');await phone.run('refreshFlightPlans()');
      assert.equal(phone.drafts().find(r=>r.id==='offline-f900b').aircraft,'F900B');
    });
    await t.test('phone local edits survive a newer iPad revision and are marked as a conflict',async()=>{
      const a=ipad.drafts().find(r=>r.id==='offline-f900b');a.state.marker='iPad revision';a.updated_at=new Date().toISOString();ipad.putDraft(a);ipad.queue(a.id);await ipad.run('refreshFlightPlans()');
      const b=phone.drafts().find(r=>r.id===a.id);b.state.marker='phone pending edit';b.updated_at=new Date().toISOString();b.server_sync_state='queued';phone.putDraft(b);phone.queue(b.id);
      await phone.run('refreshFlightPlans()');const conflict=phone.drafts().find(r=>r.id===a.id);
      assert.equal(conflict.state.marker,'phone pending edit');assert.equal(conflict.server_sync_state,'conflict');
      const writes=phone.calls.filter(c=>c.method!=='GET').length;await phone.run('refreshFlightPlans()');
      assert.equal(phone.calls.filter(c=>c.method!=='GET').length,writes,'Conflict is not retried over the remote plan');
    });
    await t.test('download failure does not replace local lists with empty server data',async()=>{
      const before={drafts:phone.drafts(),archive:phone.archive()};
      phone.configure({override:route=>route==='/api/missions?status=archived'?response(503,'TEST_UNAVAILABLE'):null});
      assert.equal(await phone.run('refreshFlightPlans()'),false);
      assert.deepEqual({drafts:phone.drafts(),archive:phone.archive()},before);
      assert.match(phone.elements.get('flightPlanSyncStatus').textContent,/failed.*retained/i);phone.configure({override:null});
    });
    await t.test('expired sign-in is visible and does not claim successful cloud sync',async()=>{
      phone.configure({override:route=>route==='/api/me'?response(401,'AUTH_REQUIRED'):null});
      assert.equal(await phone.run('refreshFlightPlans()'),false);
      assert.match(phone.elements.get('flightPlanSyncStatus').textContent,/Sign in to the same FlightOps account/);
      assert.equal(phone.elements.get('refreshFlightPlansBtn').disabled,false);phone.configure({override:null});
    });
    await t.test('an edit made during upload stays queued and reaches a new device on the next pass',async()=>{
      let edited=false;
      const before=ipad.drafts().find(r=>r.id==='offline-f900b');before.state.marker='first send';before.updated_at=new Date().toISOString();ipad.putDraft(before);ipad.queue(before.id);
      ipad.configure({override:async(route,options)=>{
        if(!edited&&options.method==='PUT'){
          edited=true;
          const result=await fetch(base+route,{...options,headers:{...options.headers,Cookie:(await session())}});
          const latest=ipad.drafts().find(r=>r.id===before.id);latest.state.marker='edit during upload';latest.updated_at=new Date().toISOString();ipad.putDraft(latest);ipad.queue(latest.id);return result;
        }return null;
      }});
      await ipad.run('flushMissionSyncQueue()');assert.equal(ipad.run('getMissionSyncQueue().length'),1);
      assert.equal(ipad.drafts().find(r=>r.id===before.id).server_sync_state,'queued');
      ipad.configure({override:null});await ipad.run('flushMissionSyncQueue()');
      const cleanPhone=device(base,await session());await cleanPhone.run('refreshFlightPlans()');
      assert.equal(cleanPhone.drafts().find(r=>r.id===before.id).state.marker,'edit during upload');
    });
    await t.test('another account-owned local plan is never uploaded into the signed-in account',async()=>{
      const other={...record('other-owner'),server_owner_user_id:'synthetic-other-user'};ipad.putDraft(other);ipad.queue(other.id);
      await ipad.run('refreshFlightPlans()');
      assert.equal(ipad.drafts().find(r=>r.id===other.id).server_sync_state,'wrong_account');
      const clean=device(base,await session());await clean.run('refreshFlightPlans()');assert.equal(clean.drafts().some(r=>r.id===other.id),false);
    });
    await t.test('foreground return has a cloud refresh hook',async()=>{
      const count=phone.calls.length;await phone.hooks.get('focus')();await phone.run('flightPlanRefreshInFlight');
      assert(phone.calls.length>count);assert(phone.hooks.has('visibilitychange'));
    });
    await t.test('storage failure rolls back a downloaded archive/draft transition',async()=>{
      const limited=device(base,await session());limited.putDraft(record('local-only-backup'));
      const before={drafts:limited.drafts(),archive:limited.archive()};let failed=false;
      limited.configure({storageFailure:key=>{if(!failed&&key==='kusaFlightOpsDrafts'){failed=true;return true;}return false;}});
      await assert.rejects(limited.run('hydrateCloudDrafts()'),/storage quota/);
      assert.deepEqual({drafts:limited.drafts(),archive:limited.archive()},before);
    });
    await t.test('a lost create response retries without duplicating a cloud plan',async()=>{
      const cookie=await session(),spotty=device(base,cookie);spotty.putDraft(record('lost-create-response'));spotty.queue('lost-create-response');
      let lost=false;
      spotty.configure({override:async(route,options)=>{
        if(!lost&&route==='/api/missions'&&options.method==='POST'){
          lost=true;await fetch(base+route,{...options,headers:{...options.headers,Cookie:cookie}});throw new Error('Lost response after save');
        }return null;
      }});
      await spotty.run('refreshFlightPlans()');assert.equal(spotty.run('getMissionSyncQueue().length'),1);
      spotty.configure({override:null});await spotty.run('refreshFlightPlans()');
      assert.equal(spotty.drafts().find(r=>r.id==='lost-create-response').server_sync_state,'synced');
      const cloud=await(await fetch(base+'/api/missions?status=draft',{headers:{Cookie:cookie}})).json();
      assert.equal(cloud.missions.filter(m=>m.payload.local_mission_id==='lost-create-response').length,1);
    });
    await t.test('a lost archive response is recognized as already completed on retry',async()=>{
      const cookie=await session(),spotty=device(base,cookie);await spotty.run('refreshFlightPlans()');
      const plan=spotty.drafts().find(r=>r.id==='lost-create-response');plan.completed=true;plan.completed_at=new Date().toISOString();plan.updated_at=new Date().toISOString();spotty.putArchive(plan);spotty.queue(plan.id,'archive');
      let lost=false;
      spotty.configure({override:async(route,options)=>{
        if(!lost&&route.endsWith('/archive')&&options.method==='POST'){
          lost=true;await fetch(base+route,{...options,headers:{...options.headers,Cookie:cookie}});throw new Error('Lost archive acknowledgement');
        }return null;
      }});
      await spotty.run('refreshFlightPlans()');assert.equal(spotty.run('getMissionSyncQueue().length'),1);
      spotty.configure({override:null});await spotty.run('refreshFlightPlans()');
      assert.equal(spotty.archive().find(r=>r.id===plan.id).server_sync_state,'synced');
      assert.equal(spotty.run('getMissionSyncQueue().length'),0);
    });
    await t.test('a remote update cannot silently replace the plan currently open on another device',async()=>{
      const open=device(base,await session());open.putDraft(record('active-plan'));open.queue('active-plan');await open.run('refreshFlightPlans()');
      open.context.window.currentMissionMeta={id:'active-plan',completed:false};
      const editor=device(base,await session());await editor.run('refreshFlightPlans()');
      const changed=editor.drafts().find(r=>r.id==='active-plan');changed.state.marker='remote update';changed.updated_at=new Date().toISOString();editor.putDraft(changed);editor.queue(changed.id);await editor.run('refreshFlightPlans()');
      await open.run('refreshFlightPlans()');
      assert.equal(open.drafts().find(r=>r.id==='active-plan').state.marker,'initial');
      assert.equal(open.drafts().find(r=>r.id==='active-plan').server_sync_state,'conflict');
    });
    await t.test('offline delete detaches an active draft, retries online and disappears on another device',async()=>{
      ipad.putDraft(record('delete-me'));ipad.queue('delete-me');await ipad.run('refreshFlightPlans()');await phone.run('refreshFlightPlans()');
      ipad.context.window.currentMissionMeta={id:'delete-me',completed:false};
      ipad.context.navigator.onLine=false;ipad.run('requestMissionDeletion("delete-me")');
      assert.equal(ipad.context.window.currentMissionMeta,null);
      assert.equal(ipad.drafts().find(r=>r.id==='delete-me').server_delete_pending,true);
      assert.equal(await ipad.run('refreshFlightPlans()'),false);
      // A stale offline edit cannot resurrect the deleted cloud plan.
      const stale=phone.drafts().find(r=>r.id==='delete-me');stale.state.marker='offline edit';stale.updated_at=new Date().toISOString();phone.putDraft(stale);phone.queue(stale.id);
      ipad.context.navigator.onLine=true;await ipad.run('refreshFlightPlans()');await phone.run('refreshFlightPlans()');
      assert.equal(ipad.drafts().some(r=>r.id==='delete-me'),false);
      assert.equal(phone.drafts().some(r=>r.id==='delete-me'),false);
      await ipad.run('refreshFlightPlans()');assert.equal(ipad.drafts().some(r=>r.id==='delete-me'),false);
      // Capture the real autosave guard: a stale tab must stop before capturing/re-saving inputs.
      const saveCode=html.slice(html.indexOf('function saveCurrentDraft(){'),html.indexOf('function scheduleDraftSave(){'));
      vm.runInContext(saveCode,phone.context);phone.context.draftRecord=()=>{throw new Error('Deleted form must not autosave')};
      phone.context.window.currentMissionMeta={id:'delete-me'};phone.run('saveCurrentDraft()');assert.equal(phone.context.window.currentMissionMeta,null);
    });
    await t.test('lost delete acknowledgement is resolved by the server tombstone',async()=>{
      ipad.putDraft(record('delete-lost'));ipad.queue('delete-lost');await ipad.run('refreshFlightPlans()');
      const cookie=await session();let lost=false;
      ipad.configure({override:async(route,options)=>{
        if(options.method==='DELETE'&&!lost){lost=true;await fetch(base+route,{...options,headers:{Cookie:cookie}});throw new Error('Lost delete acknowledgement')}
      }});
      ipad.run('requestMissionDeletion("delete-lost")');await ipad.run('refreshFlightPlans()');ipad.configure({override:null});
      assert(lost);assert.equal(ipad.drafts().some(r=>r.id==='delete-lost'),false);
      await phone.run('refreshFlightPlans()');assert.equal(phone.drafts().some(r=>r.id==='delete-lost'),false);
    });
    await t.test('delete resolves a lost create acknowledgement without leaving a cloud draft',async()=>{
      ipad.putDraft(record('delete-lost-create'));ipad.queue('delete-lost-create');
      const cookie=await session();let lost=false;
      ipad.configure({override:async(route,options)=>{
        if(route==='/api/missions'&&options.method==='POST'&&!lost){lost=true;await fetch(base+route,{...options,headers:{...options.headers,Cookie:cookie}});throw new Error('Lost create acknowledgement')}
      }});
      await ipad.run('flushMissionSyncQueue()');assert.equal(ipad.drafts().find(r=>r.id==='delete-lost-create').server_mission_id,undefined);
      ipad.configure({override:null});ipad.run('requestMissionDeletion("delete-lost-create")');await ipad.run('refreshFlightPlans()');await phone.run('refreshFlightPlans()');
      assert.equal(phone.drafts().some(r=>r.id==='delete-lost-create'),false);
      const dead=await fetch(base+'/api/missions?status=deleted',{headers:{Cookie:cookie}}).then(r=>r.json());
      assert.equal(dead.missions.filter(m=>m.local_mission_id==='delete-lost-create').length,1);
    });
    await t.test('a late upload acknowledgement cannot cancel a pending deletion',async()=>{
      ipad.putDraft(record('delete-during-upload'));ipad.queue('delete-during-upload');await ipad.run('refreshFlightPlans()');
      const edit=ipad.drafts().find(r=>r.id==='delete-during-upload');edit.state.marker='pending';ipad.putDraft(edit);ipad.queue(edit.id);
      let requested=false;ipad.configure({override:async(route,options)=>{
        if(options.method==='PUT'&&!requested){requested=true;ipad.run('requestMissionDeletion("delete-during-upload")')}
      }});
      await ipad.run('refreshFlightPlans()');ipad.configure({override:null});await ipad.run('refreshFlightPlans()');await phone.run('refreshFlightPlans()');
      assert(requested);assert.equal(ipad.drafts().some(r=>r.id==='delete-during-upload'),false);assert.equal(phone.drafts().some(r=>r.id==='delete-during-upload'),false);
    });
    await t.test('completed plans delete across device archive stores too',async()=>{
      const archived=ipad.archive()[0];assert(archived);ipad.run(`requestMissionDeletion(${JSON.stringify(archived.id)})`);
      await ipad.run('refreshFlightPlans()');await phone.run('refreshFlightPlans()');
      assert.equal(ipad.archive().some(r=>r.id===archived.id),false);assert.equal(phone.archive().some(r=>r.id===archived.id),false);
    });
    await t.test('deletion requires authentication, isolates owners, and cannot be undone by stale archive/create calls',async()=>{
      ipad.putDraft(record('delete-security'));ipad.queue('delete-security');await ipad.run('refreshFlightPlans()');
      const plan=ipad.drafts().find(r=>r.id==='delete-security'),cookie=await session();
      assert.equal((await fetch(base+'/api/missions/'+plan.server_mission_id,{method:'DELETE'})).status,401);
      const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(path.join(temp,'test.sqlite'));
      db.prepare("INSERT INTO users(id,email,display_name,password_salt,password_hash,status,created_at,updated_at) SELECT 'other-delete-user','other@flightops.invalid','Other',password_salt,password_hash,status,created_at,updated_at FROM users WHERE email=?").run(email);db.close();
      const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'other@flightops.invalid',password})});
      const otherCookie=login.headers.get('set-cookie').split(';')[0];
      assert.equal((await fetch(base+'/api/missions/'+plan.server_mission_id,{method:'DELETE',headers:{Cookie:otherCookie}})).status,404);
      for(let attempt=0;attempt<2;attempt++)assert.equal((await fetch(base+'/api/missions/'+plan.server_mission_id,{method:'DELETE',headers:{Cookie:cookie}})).status,200);
      assert.equal((await fetch(base+'/api/missions/'+plan.server_mission_id+'/archive',{method:'POST',headers:{Cookie:cookie}})).status,410);
      const aircraft=await fetch(base+'/api/aircraft',{headers:{Cookie:cookie}}).then(r=>r.json());
      const recreate=await fetch(base+'/api/missions',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify({aircraft_id:aircraft.aircraft.find(a=>a.registration==='N33AP').id,payload:{local_mission_id:plan.id}})});
      assert.equal(recreate.status,410);
      const hidden=await fetch(base+'/api/missions?status=deleted',{headers:{Cookie:otherCookie}}).then(r=>r.json());assert.equal(hidden.missions.length,0);
    });
  } finally {
    if(child.exitCode===null){const exited=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child.kill('SIGKILL'),2000);try{await exited;}finally{clearTimeout(timer);}}
    fs.rmSync(temp,{recursive:true,force:true});
  }
});
