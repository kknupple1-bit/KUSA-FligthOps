'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../../public/index.html'),'utf8');
function fn(name){let start=html.indexOf('function '+name+'(');assert(start>=0,name);if(html.slice(start-6,start)==='async ')start-=6;const next=html.slice(start+15).search(/\n(?:async )?function /);assert(next>=0,name);return html.slice(start,start+15+next);}
function device({today=false,weather=true,source=true,ai='OFF',temp=20,conflict=false,climbFail=false,closed=false,notams=true,serverStatus='GO'}={}){
 const events=[];const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',className:'',style:{}});return elements.get(id);};
 Object.entries({toConfig:'S20',toAntiIce:ai,toRunwayCondition:'DRY',perfObs:'true',perfBFL:1000,perfV1:100,perfVR:110}).forEach(([id,value])=>$(id).value=value);
 const ctx=vm.createContext({$,console,missionData:{},isCurrentTripToday:()=>today,currentTripDate:()=>today?'2026-10-26':'2026-10-30',tripDateDisplay:x=>x,
 perfTakeoffPA:()=>weather?0:null,perfTakeoffTemp:()=>weather?temp:null,perfTakeoffWeightLb:()=>30000,perfTakeoffRunwayLen:()=>7002,perfIsManual:()=>false,
 formatWeatherSource:()=> 'LIVE • test weather',f50Dash4TakeoffN1:()=>source?{side:95.5,center:95.5,source:'bounded test table'}:null,F50_DASH4_N1_SOURCE:{OFF:'source',ON:'source'},
 autoTO:()=>({cfg:'S20',v1:100,vr:110,vfr:125,v15vs:150,bfl:1000}),autoFieldLimitedWeight:()=>40000,
 autoClimbAssessment:()=>({limit:35000,pass:!climbFail,noLimitation:false,gradient:5,ai}),takeoffFieldSourceCeilingLb:()=>40780,
 effectiveDepartureRunwayAssessment:()=>({state:closed?'CLOSED':'OPEN',usable:7002}),departureNotams:{status:notams?'CHECKED':'UNAVAILABLE'},
 effectiveObstacleReview:()=>({cleared:!conflict,state:conflict?'CONFLICT':'REVIEWED_NO_CONFLICT'}),departureObstacleReview:{status:'FLAGGED',items:[{}]},
 FS_PERF:{takeoff:{S20:{label:'Slats + Flaps 20°'}}},QRH_CLIMB_MIN_GROSS:3,
 valueOrNull:id=>Number($(id).value),updateRunwayConditionWarnings(){},refreshDepartureObstacleReview:async()=>{},updateDepartureRunwayAssessment(){},renderDepartureObstacleReview(){},updateToldCard(){events.push("told")},scheduleDraftSave(){events.push("save")},
 apiUrl:x=>x,fetch:async()=>({json:async()=>({status:serverStatus,source_evaluated_max_takeoff_weight_lb:35000,max_allowable_takeoff_weight_lb:35000,weight_margin_lb:5000,runway_margin_ft:6002})})});
 for(const name of ['obstacleBaselineClimbReady','f50N1PendingLabel','f50PendingTakeoffStatus','f50N1Attention','f50N1OnlyPending','currentF50TakeoffN1','syncTakeoffSection','evaluateTakeoff'])vm.runInContext(fn(name),ctx);
 return {ctx,$,events,run:code=>vm.runInContext(code,ctx)};
}

module.exports={device,fn,html};
