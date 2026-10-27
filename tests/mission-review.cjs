'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webkit}=require('playwright'),{fn,html:source}=require('./helpers/f50-gate-harness.cjs');
const root=path.resolve(__dirname,'..');
const html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
async function requestTests(){
 let calls=0;
 const context=vm.createContext({setTimeout,clearTimeout,AbortController,TypeError,fetch:async()=>{calls++;return {ok:calls>1,status:calls>1?200:502,json:async()=>calls>1?{ok:true,items:[]}:{ok:false,message:'temporary upstream failure'}}}});
 vm.runInContext(fn('requestAirportNotams'),context);
 assert.equal((await vm.runInContext('requestAirportNotams("KABI")',context)).ok,true);assert.equal(calls,2);
 calls=0;context.fetch=async()=>{calls++;return{ok:false,status:401,json:async()=>({ok:false,message:'Authentication failed'})}};
 await assert.rejects(vm.runInContext('requestAirportNotams("KABI")',context),/Authentication failed.*401/);assert.equal(calls,1);
 calls=0;context.fetch=async()=>{calls++;throw new TypeError('Connection lost')};
 await assert.rejects(vm.runInContext('requestAirportNotams("KABI")',context),/Connection lost/);assert.equal(calls,2);
 calls=0;context.fetch=async()=>{calls++;return{ok:false,status:429,json:async()=>({ok:false,message:'Rate limited'})}};
 await assert.rejects(vm.runInContext('requestAirportNotams("KABI")',context),/Rate limited/);assert.equal(calls,1);
 context.fetch=async()=>({ok:true,status:200,json:async()=>{throw new SyntaxError('invalid')}});
 await assert.rejects(vm.runInContext('requestAirportNotams("KABI")',context),/unreadable response/);
}
async function refreshTests(){
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{textContent:'',className:'',value:id==='dest'?'KABI':'',innerHTML:''});return elements.get(id)};
 const c=vm.createContext({$,cleanICAO:x=>x,checkNotamConnection:async()=>{},selectedLandingRunway:()=>({runway_id:'17L'}),currentNotams:{},requestAirportNotams:async()=>({ok:true,items:[{text:'<script>NOTAM & text</script>'}],source:'FAA NMS'}),parseRunwayClosureFromNotams:()=>({state:'OPEN',usable:null}),runwayImpactSummary:()=>'',updateLandingRunwayAssessment(){},applyLandingRunwayGateToStatus(){},updateToldCard(){},scheduleDraftSave(){}});
 vm.runInContext(fn('escapeNotamText')+'\n'+fn('refreshNotams'),c);
 await vm.runInContext('refreshNotams()',c);assert.equal(c.currentNotams.status,'CHECKED');assert.match($('notamList').innerHTML,/&lt;script&gt;NOTAM &amp; text/);
 c.requestAirportNotams=async()=>{throw Error('HTTP 502')};await vm.runInContext('refreshNotams()',c);assert.equal(c.currentNotams.status,'UNAVAILABLE');assert.match($('notamSource').textContent,/KABI: NOTAM retrieval failed.*502/);
 c.requestAirportNotams=async()=>({ok:true,items:[]});c.parseRunwayClosureFromNotams=()=>{throw Error('Cannot evaluate payload')};await vm.runInContext('refreshNotams()',c);assert.equal(c.currentNotams.status,'UNAVAILABLE');assert.match($('notamSource').textContent,/assessment failed/);
}
(async()=>{
 await requestTests();await refreshTests();const browser=await webkit.launch({headless:true});let checks=8;
 try{
  const page=await browser.newPage({viewport:{width:834,height:1194},isMobile:true,hasTouch:true});await page.route('**/*',route=>route.abort());await page.setContent(html);
  await page.addStyleTag({content:fs.readFileSync(path.join(root,'public/mission-review.css'),'utf8')});
  await page.addScriptTag({content:`var departureNotams={status:'CHECKED',runway_state:'OPEN'},currentNotams={status:'UNAVAILABLE'};
   var actionCalls=[];function showPlatformView(view){actionCalls.push(view)}
   function syncF900BMissionToTOLD(){actionCalls.push('sync')}
   async function refreshDepartureNotams(){actionCalls.push('dep')}
   async function refreshNotams(){actionCalls.push('dest')}
   async function refreshF900BMission(){actionCalls.push('f9')}
   function f9RenderMissionParity(){}function f9RenderCanonicalParityFields(){}
  `+fn('operationalGateState')+'\n'+fn('classifyOperationalGates')});
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'public/mission-review.js'),'utf8')});
  for(const aircraft of ['f50','f9']){
   const view=aircraft==='f50'?'opsView':'f900bmissionView';
   await page.evaluate(view=>{for(const id of ['homeView','newtripView','opsView','toldView','f900bmissionView','f900bView','archiveView'])document.getElementById(id).style.display=id===view?'block':'none';},view);
   for(const [status,state,tone]of [['CHECKED','OPEN','clear'],['CHECKED','CLOSED','stop'],['CHECKED','RESTRICTED','caution'],['NOT_CHECKED',null,'caution'],['CHECKING',null,'caution'],['UNAVAILABLE',null,'caution']]){
    await page.evaluate(({aircraft,status,state})=>{departureNotams={status,runway_state:state};syncMissionNotamGate(aircraft+'CanonDepNotam','dep');classifyOperationalGates();},{aircraft,status,state});
    assert(await page.locator('#'+aircraft+'CanonDepNotam').evaluate((el,tone)=>el.parentElement.classList.contains('gate-'+tone),tone));checks++;
   }
   for(const kind of ['takeoff','landing','dep','dest']){
    const gate=page.locator('[aria-controls="'+aircraft+'Review_'+kind+'"]');await gate.click();
    assert.equal(await page.locator('#'+aircraft+'Review_'+kind).getAttribute('open'),'');
    assert.equal(await page.evaluate(()=>actionCalls.length),0,'opening a gate must not evaluate or change status');checks++;
   }
   assert.match(await page.locator('[aria-controls="'+aircraft+'Review_takeoff"]').textContent(),/SOURCE VERIFIED/);checks++;
   const panel=page.locator('#'+aircraft+'Review_dest');await panel.getByRole('button',{name:'Refresh / Evaluate NOTAMs',exact:true}).click();
   const actions=await page.evaluate(()=>actionCalls.splice(0));assert.deepEqual(actions,aircraft==='f50'?['dest']:['sync','dest','f9']);checks++;
   for(const width of [320,700,744,834,1024,1194]){
    await page.setViewportSize({width,height:1024});const button=page.locator('#'+view+' .mission-told-float');
    for(const scroll of [0,1800,100000]){
     await page.evaluate(y=>window.scrollTo(0,y),scroll);
     const b=await button.boundingBox();assert(b&&b.x>=0&&b.x+b.width<=width+1&&b.y>=0&&b.y+b.height<=1024,'floating TOLD stays in viewport');
     const hit=await button.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===el});assert(hit,'floating TOLD remains tappable above navigation');checks++;
    }
   }
   await page.locator('#'+view+' .mission-told-float').click();assert.deepEqual(await page.evaluate(()=>actionCalls.splice(0)),['told']);checks++;
  }
  await page.setViewportSize({width:834,height:1194});await page.evaluate(()=>{document.getElementById('opsView').style.display='block';document.getElementById('f900bmissionView').style.display='none';document.querySelectorAll('.mission-gate-review').forEach(el=>el.open=false);departureNotams={status:'CHECKED',runway_state:'OPEN'};syncMissionNotamGate('f50CanonDepNotam','dep');syncMissionNotamGate('f50CanonDestNotam','dest');classifyOperationalGates();document.getElementById('f50CanonicalPerformanceCard').scrollIntoView();});
  await page.screenshot({path:path.join(root,'../../artifacts/mission-review-v52627.png')});
  console.log('PASS mission review: '+checks+' navigation, status, retry and floating-button checks');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
