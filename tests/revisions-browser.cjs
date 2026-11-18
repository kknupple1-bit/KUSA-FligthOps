'use strict';
// Run the complete shipped browser scripts against a disposable authenticated server.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),net=require('node:net');
const {spawn}=require('node:child_process'),{once}=require('node:events'),{setTimeout:delay}=require('node:timers/promises');
const assert=require('node:assert/strict'),{webkit}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'flightops-browser-'));
 const reservation=net.createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const base=`http://127.0.0.1:${port}`,email='browser@flightops.invalid',password=crypto.randomBytes(24).toString('hex');
 const child=spawn(process.execPath,['server.js'],{cwd:root,env:{PATH:process.env.PATH,NODE_ENV:'test',PORT:String(port),FLIGHTOPS_AUTH_REQUIRED:'true',FLIGHTOPS_DB_PATH:path.join(temp,'test.sqlite'),FLIGHTOPS_ADMIN_EMAIL:email,FLIGHTOPS_ADMIN_PASSWORD:password},stdio:'ignore'});
 let browser;
 try{
  let ready=false;for(let i=0;i<100;i++){try{ready=(await fetch(base+'/api/health')).ok;}catch{}if(ready)break;await delay(100);}assert(ready);
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie').split(';')[0].split('=');
  browser=await webkit.launch({headless:true});
  const context=await browser.newContext({viewport:{width:834,height:1194},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.addCookies([{name:cookie[0],value:cookie[1],url:base}]);
  let notices=[],noticeTime='2026-11-15T12:00:00Z';
  const airport=icao=>({icao,airport:{ident:icao,name:'Synthetic test airport',elevation_ft:0},pressure_altitude_ft:0,density_altitude_ft:0,temperature_c:15,oat_c:15,altimeter_inhg:29.92,
    metar:{raw:`${icao} 151200Z 00000KT 10SM CLR 15/10 A2992`,temp:15,altim:1013.25,wdir:0,wspd:0},taf:{raw:''},
    runways:[{runway_id:'12/30',length_ft:10000,width_ft:150,heading:120,le_ident:'12',he_ident:'30',le_heading_degT:120,he_heading_degT:300,surface:'ASPH',wind_components:{headwind_kt:0,tailwind_kt:0,crosswind_kt:0}}]});
  await context.route('**/*',route=>{
   const u=new URL(route.request().url());if(u.origin!==base)return route.abort();
   const json=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/api/mission')return json({ok:true,departure:airport('KBPT'),destination:airport('KDTO'),alternate:null});
   if(u.pathname==='/api/notams')return json({ok:true,source:'SYNTHETIC TEST',items:notices,checked_at:noticeTime});
   if(u.pathname.startsWith('/api/notams/'))return json({ok:true,connected:true,configured:true,authenticated:true,status:'ONLINE',source:'SYNTHETIC TEST'});
   return route.continue();
  });
  const page=await context.newPage(),errors=[],dialogs=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
  await page.goto(base);await page.waitForFunction(()=>typeof startNewTrip==='function'&&typeof missionNotamReviewed==='function');
  await page.waitForFunction(()=>typeof cloudSyncUser!=='undefined'&&cloudSyncUser?.id);
  assert.deepEqual(errors,[],'complete application startup');
  // A previous mission's overrides must never seed a new mission.
  await page.evaluate(()=>{$('captWt').value=230;$('foWt').value=220;$('taxiFuel').value=500;resetMissionForNewTrip();});
  assert.deepEqual(await page.evaluate(()=>['captWt','foWt','taxiFuel'].map(id=>Number($(id).value))),[190,190,200]);
  await page.evaluate(()=>{$('homeAircraft').value='N33AP';$('homeDep').value='KBPT';$('homeDest').value='KDTO';$('homeFOB').value=9000;$('homeMissionFuel').value=3000;startNewTrip();});
  await page.waitForFunction(()=>departureNotams.status==='CHECKED'&&!!selectedRunwayObj('dep'));
  await page.evaluate(async()=>{saveCurrentDraft();await flushMissionSyncQueue();});
  assert.equal(await page.evaluate(()=>missionNotamReviewed('dep')),false);
  await page.evaluate(()=>acknowledgeMissionNotams('dep'));
  assert.equal(await page.evaluate(()=>missionNotamReviewed('dep')),true,'own authenticated NOTAM acknowledgment clears review');
  assert.equal(dialogs.length,0,dialogs.join('\n'));
  assert.deepEqual(await page.evaluate(()=>({tow:latestCalc.tow,landing:latestCalc.landing,fuel:latestCalc.landingFuel,taxi:Number($('taxiFuel').value)})),{tow:30659.3,landing:27659.3,fuel:5800,taxi:200});
  const signoff=await page.evaluate(()=>findLocalMissionRecord(window.currentMissionMeta.id).server_signoffs.at(-1));
  assert.equal(signoff.kind,'departure_notam');assert.equal(signoff.context.airport,'KBPT');assert(signoff.created_at&&signoff.user_id);
  const signedRevision=await page.evaluate(()=>findLocalMissionRecord(window.currentMissionMeta.id).server_revision);
  await page.evaluate(async()=>{saveCurrentDraft();await flushMissionSyncQueue();});
  assert.equal(await page.evaluate(()=>findLocalMissionRecord(window.currentMissionMeta.id).server_revision),signedRevision,'cache timestamp alone must not advance revision');
  assert.equal(await page.evaluate(()=>missionNotamReviewed('dep')),true,'routine autosave retains acknowledgment');
  await page.evaluate(()=>acknowledgeMissionNotams('dest'));
  assert.equal(await page.evaluate(()=>missionNotamReviewed('dep')&&missionNotamReviewed('dest')),true,'departure and destination reviews coexist on one revision');
  assert.equal(dialogs.length,0,dialogs.join('\n'));
  await page.evaluate(()=>{$('taxiFuel').value=250;recalculate();});assert.equal(await page.evaluate(()=>missionNotamReviewed('dep')),false,'new fuel plan invalidates review');
  notices=[{text:'!BPT 11/001 BPT RWY 12/30 CLSD'}];noticeTime='2026-11-15T12:01:00Z';
  await page.evaluate(()=>refreshDepartureNotams(true));await page.evaluate(()=>acknowledgeMissionNotams('dep'));
  assert.equal(await page.evaluate(()=>missionNotamReviewed('dep')),false,'acknowledgment cannot clear runway closure');
  assert.equal(await page.evaluate(()=>effectiveDepartureRunwayAssessment().state),'CLOSED');
  assert(dialogs.some(s=>s.includes('remains blocking')),dialogs.join('\n'));dialogs.length=0;
  await page.evaluate(async()=>{
   const record={...draftRecord(),id:newMissionId(),state:{...captureCurrentPlanState(),captain_weight_lb:212,fo_weight_lb:205,taxi_fuel_lb:0}};
   await restoreArchivedFlightPlan(record,0,{fromDraft:true});
  });
  assert.deepEqual(await page.evaluate(()=>['captWt','foWt','taxiFuel'].map(id=>Number($(id).value))),[212,205,0]);
  assert.equal(await page.evaluate(()=>latestCalc.landingFuel),6000);
  await page.evaluate(async()=>{
   const record={...draftRecord(),id:newMissionId(),state:{...captureCurrentPlanState(),captain_weight_lb:null,fo_weight_lb:'',taxi_fuel_lb:null}};
   await restoreArchivedFlightPlan(record,0,{fromDraft:true});
  });
  assert.deepEqual(await page.evaluate(()=>['captWt','foWt','taxiFuel'].map(id=>Number($(id).value))),[190,190,200]);
  await page.evaluate(async()=>{await startF900BTrip('KBPT','KDTO','');});
  assert.deepEqual(await page.evaluate(()=>['f9mCaptainWt','f9mFOWt','f9wb_pilot','f9wb_copilot','f9mTaxiFuel','f9wbTaxi'].map(id=>Number($(id).value))),[170,170,170,170,200,200]);
  await page.evaluate(()=>{applyF900BPlanState({dep:'KBPT',dest:'KDTO',f900b:{fob_lb:9000,mission_fuel_lb:3000,captain_weight_lb:215,first_officer_weight_lb:201,taxi_fuel_lb:0}});});
  assert.deepEqual(await page.evaluate(()=>['f9wb_pilot','f9wb_copilot','f9wbTaxi'].map(id=>Number($(id).value))),[215,201,0]);
  assert.equal(await page.evaluate(()=>window.f900bWBLatest.ldgFuel),6000);
  assert.deepEqual(errors,[],'no uncaught runtime errors in either aircraft');
  // Finish the synthetic background NOTAM requests before unloading this
  // document; Linux WebKit reports cancelled routed requests as access errors.
  await page.waitForLoadState('networkidle');
  await page.goto(base+'/foreflight.html');
  await page.getByText('PDF importing is available.',{exact:true}).waitFor();
  assert.equal(await page.locator('#connect').isEnabled(),true);
  assert.equal(await page.locator('#previewGateway').isVisible(),false,'Live/local help must not show private Preview gateway instructions');
  assert(!(await page.locator('body').innerText()).includes('Keep the Preview URL'));
  const {pdf,plan,mobilePlan}=require('./foreflight-fixtures.cjs');
  await page.waitForLoadState('networkidle');
  const connection=await context.request.post(base+'/api/foreflight/connections',{headers:{'X-FlightOps-Action':'foreflight'},data:{label:'Synthetic browser test'}});
  assert.equal(connection.status(),201);const pairing=await connection.json();
  for(const [tail,fob]of [['N33AP',9000],['N699BG',15000]]){
   const mobile=tail==='N33AP';
   const incoming=await context.request.post(base+'/api/foreflight/upload',{headers:{'Content-Type':'application/pdf','X-FlightOps-Upload-Key':pairing.upload_key},data:pdf(mobile?mobilePlan(tail):plan(tail).replace('9,000 lbs',fob+' lbs'))});
   assert.equal(incoming.status(),201);const link=await incoming.json();
   await page.goto(link.open_url);
   await page.getByRole('button',{name:'Create trip and open FlightOps',exact:true}).waitFor({state:'visible'});
   assert.equal(await page.locator('#fob_lb').inputValue(),mobile?'':String(fob));
   if(mobile){assert.equal(await page.locator('#trip_lb').inputValue(),'2500');assert.equal(await page.locator('#taxi_lb').inputValue(),'200');await page.locator('#fob_lb').fill(String(fob));}
   assert.equal(await page.locator('#departure').inputValue(),'KDTO');
   for(const width of [390,834,1194]){
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'incoming review has no horizontal overflow');
   }
   await page.setViewportSize({width:834,height:1194});
   await page.locator('#reviewed').check();
   const creating=page.waitForResponse(r=>r.url().includes('/api/foreflight/imports/')&&r.url().endsWith('/create')&&r.request().method()==='POST');
   await page.getByRole('button',{name:'Create trip and open FlightOps',exact:true}).click();
   const created=await (await creating).json();
   await page.waitForFunction(mid=>window.currentMissionMeta?.server_mission_id===mid,created.mission_id);
   assert.equal(await page.evaluate(()=>window.currentMissionMeta.aircraft),tail==='N699BG'?'F900B':'N33AP');
   if(tail==='N33AP')assert.deepEqual(await page.evaluate(()=>['captWt','foWt','taxiFuel'].map(id=>Number($(id).value))),[190,190,200]);
   else assert.deepEqual(await page.evaluate(()=>['f9mCaptainWt','f9mFOWt','f9mTaxiFuel'].map(id=>Number($(id).value))),[170,170,200]);
   assert.equal(await page.evaluate(()=>missionNotamReviewed('dep')),false,'import never inherits pilot acknowledgment');
   if(mobile)assert.equal(await page.evaluate(()=>Number($('missionFuel').value)),2500,'airborne trip burn excludes the separate taxi burn');
   await page.waitForLoadState('networkidle');
   await page.goto(link.open_url);await page.getByText('This PDF already has a trip.',{exact:false}).waitFor();
   assert.equal(await page.locator('#tripForm').isVisible(),false,'re-sharing cannot create duplicate');
  }
  assert.deepEqual(errors,[],'no uncaught ForeFlight review or trip-opening errors');
  console.log('PASS ForeFlight direct handoff: actual PDF extraction, review, both aircraft, responsive review form, trip opens in full app, configured defaults, no signoff inheritance, duplicate protection. iPad Shortcut and GoDaddy gateway remain physical acceptance checks.');
  console.log('PASS complete WebKit app: defaults, saved crew/taxi overrides, W&B/fuel flow, authenticated NOTAM acknowledgment, closure hard stop, individual audit record, both aircraft, no uncaught runtime errors. Synthetic NOTAM/weather only.');
 }finally{
  if(browser)await browser.close();if(child.exitCode===null){const done=once(child,'exit');child.kill();await done;}
  fs.rmSync(temp,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
