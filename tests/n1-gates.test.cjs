'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const test=require('node:test'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
function fn(name){let start=html.indexOf('function '+name+'(');assert(start>=0,name);if(html.slice(start-6,start)==='async ')start-=6;const end=html.indexOf('\nfunction ',start+15);return html.slice(start,end);}
function device({today=false,weather=true,source=true,ai='OFF',temp=20,conflict=false,climbFail=false,closed=false,notams=true,serverStatus='GO'}={}){
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',className:'',style:{}});return elements.get(id);};
 Object.entries({toConfig:'S20',toAntiIce:ai,toRunwayCondition:'DRY',perfObs:'true',perfBFL:1000,perfV1:100,perfVR:110}).forEach(([id,value])=>$(id).value=value);
 const ctx=vm.createContext({$,console,missionData:{},isCurrentTripToday:()=>today,currentTripDate:()=>today?'2026-10-26':'2026-10-30',tripDateDisplay:x=>x,
 perfTakeoffPA:()=>weather?0:null,perfTakeoffTemp:()=>weather?temp:null,perfTakeoffWeightLb:()=>30000,perfTakeoffRunwayLen:()=>7002,perfIsManual:()=>false,
 formatWeatherSource:()=> 'LIVE • test weather',f50Dash4TakeoffN1:()=>source?{side:95.5,center:95.5,source:'bounded test table'}:null,F50_DASH4_N1_SOURCE:{OFF:'source',ON:'source'},
 autoTO:()=>({cfg:'S20',v1:100,vr:110,vfr:125,v15vs:150,bfl:1000}),autoFieldLimitedWeight:()=>40000,
 autoClimbAssessment:()=>({limit:35000,pass:!climbFail,noLimitation:false,gradient:5,ai}),takeoffFieldSourceCeilingLb:()=>40780,
 effectiveDepartureRunwayAssessment:()=>({state:closed?'CLOSED':'OPEN',usable:7002}),departureNotams:{status:notams?'CHECKED':'UNAVAILABLE'},
 effectiveObstacleReview:()=>({cleared:!conflict,state:conflict?'CONFLICT':'REVIEWED_NO_CONFLICT'}),departureObstacleReview:{status:'FLAGGED',items:[{}]},
 FS_PERF:{takeoff:{S20:{label:'Slats + Flaps 20°'}}},QRH_CLIMB_MIN_GROSS:3,
 valueOrNull:id=>Number($(id).value),updateRunwayConditionWarnings(){},refreshDepartureObstacleReview:async()=>{},updateDepartureRunwayAssessment(){},renderDepartureObstacleReview(){},updateToldCard(){},
 apiUrl:x=>x,fetch:async()=>({json:async()=>({status:serverStatus,source_evaluated_max_takeoff_weight_lb:35000,max_allowable_takeoff_weight_lb:35000,weight_margin_lb:5000,runway_margin_ft:6002})})});
 for(const name of ['f50N1PendingLabel','f50PendingTakeoffStatus','f50N1Attention','f50N1OnlyPending','currentF50TakeoffN1','syncTakeoffSection','evaluateTakeoff'])vm.runInContext(fn(name),ctx);
 return {ctx,$,run:code=>vm.runInContext(code,ctx)};
}
test('future trip keeps operational N1 withheld and explicitly labels planning',()=>{
 const d=device(),n=d.run('currentF50TakeoffN1()');assert.equal(n.ok,false);assert.equal(n.reason,'DAY_OF_PENDING');assert.match(n.text,/N1 DAY-OF-FLIGHT VERIFICATION PENDING/);assert.match(n.source,/PLANNING ONLY/);assert.equal(n.side,undefined);assert.equal(n.center,undefined);
});
for(const [label,options,expected] of [
 ['future date',{today:false},/PLANNING ONLY — N1 DAY-OF-FLIGHT VERIFICATION PENDING/],
 ['missing weather',{today:true,weather:false},/TAKEOFF N1 DEPARTURE WEATHER REQUIRED/],
 ['source locked',{today:true,source:false},/TAKEOFF N1 SOURCE COVERAGE REQUIRED/],
 ['anti-ice prohibited',{today:true,ai:'ON',temp:20},/TAKEOFF N1 \/ A-I CONDITION NOT PERMITTED|A\/I ON.*SOURCE LOCKED/],
 ['multiple pending items',{today:false,notams:false},/DEPARTURE NOTAM REVIEW.*N1 DAY-OF-FLIGHT/]
])test(`Evaluate then TOLD refresh cannot turn ${label} green`,async()=>{
 const d=device(options);d.run('syncTakeoffSection()');const before=d.$('toStatus').textContent;assert.match(before,expected);assert.equal(d.$('toStatus').className,'warn');
 await d.run('evaluateTakeoff()');assert.match(d.$('toStatus').textContent,expected);assert.equal(d.$('toStatus').className,'warn');assert.doesNotMatch(d.$('toStatus').textContent,/OBSTACLE.*REQUIRED|OBSTACLE.*INCOMPLETE/);
 d.run('syncTakeoffSection()');assert.equal(d.$('toStatus').textContent,before);assert.equal(d.$('toStatus').className,'warn');
});
test('same-day source/weather pass clears N1 pending without bypassing other gates',async()=>{
 const d=device({today:true});assert.equal(d.run('currentF50TakeoffN1()').ok,true);assert.equal(d.run('f50N1Attention(currentF50TakeoffN1())'),null);await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').className,'ok');assert.match(d.$('toStatus').textContent,/PASS.*PILOT OBSTACLE REVIEW COMPLETE/);
});
for(const [label,options,expected] of [
 ['obstacle conflict',{conflict:true},/OBSTACLE CONFLICT/],['climb failure',{climbFail:true},/SECOND-SEGMENT CLIMB/],['runway closure',{closed:true},/RUNWAY CLOSED/],['server no-go',{serverStatus:'NO-GO'},/NO-GO/]
])test(`N1 planning status never masks ${label}`,async()=>{const d=device(options);await d.run('evaluateTakeoff()');assert.match(d.$('toStatus').textContent,expected);assert.equal(d.$('toStatus').className,'bad');});
test('N1-only attention names the actual requirement and opens weather, not obstacles',()=>{
 const d=device(),status=d.run('f50PendingTakeoffStatus([f50N1PendingLabel(currentF50TakeoffN1())])');d.ctx.takeoffN1=d.run('currentF50TakeoffN1()');d.ctx.issues=[];d.ctx.obsEff={cleared:true};d.ctx.textOf=()=>status;
 const body=fn('updateToldCard'),start=body.indexOf('const ts=textOf("toStatus")'),end=body.indexOf('const lts=',start);d.run(body.slice(start,end));
 assert.equal(d.ctx.issues.length,1);assert.match(d.ctx.issues[0].label,/N1 DAY-OF-FLIGHT/);assert.equal(d.ctx.issues[0].target,'manualWeatherCard');assert.equal(d.ctx.issues[0].focus,'manualWxActionBtn');
 const a=body.indexOf('let takeoffTarget=null'),b=body.indexOf('const landingActionable=',a);let action;d.ctx.setToldActionableStatus=(el,target,focus)=>{action={target,focus};};d.run(body.slice(a,b));assert.equal(action.target,'manualWeatherCard');assert.equal(action.focus,'manualWxActionBtn');
});
