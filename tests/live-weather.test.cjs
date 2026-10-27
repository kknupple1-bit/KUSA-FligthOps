'use strict';
const fs=require('node:fs'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const math=require('../public/weather-math'),{fn}=require('./helpers/f50-gate-harness.cjs');
const server=fs.readFileSync(require('node:path').join(__dirname,'../server.js'),'utf8');
function serverFn(name){let start=server.indexOf('function '+name+'(');if(server.slice(start-6,start)==='async ')start-=6;const next=server.slice(start+15).search(/\n(?:async )?function /);assert(start>=0&&next>=0,name);return server.slice(start,start+15+next);}
for(const value of [null,undefined,'','  ',false,true,{},[],NaN,Infinity,'not known'])test('unknown weather value remains missing: '+String(value),()=>{assert.equal(math.number(value),null);assert.equal(math.pressureAlt(value,30.1),null);});
test('zero and negative altitudes/temperatures remain valid',()=>{assert.equal(math.number(0),0);assert.equal(math.number('0'),0);assert.equal(math.pressureAlt(0,29.92),0);assert.equal(math.pressureAlt(-100,29.92),-100);assert.equal(math.densityAlt(0,0),-1800);});
test('METAR altimeter is converted from documented hPa units',()=>{assert(Math.abs(math.hpaToInhg(1013.25)-29.92126)<0.0001);assert.equal(math.hpaToInhg(29.92),null);assert.equal(math.hpaToInhg(''),null);assert.equal(math.pressureAlt(642.8,null),null);});
function serverHarness({elevation=642.8,lookupFails=false,icao='KDTO',metarMissing=false}={}){
 let lookups=0,altim=1019.3;
 const context=vm.createContext({URL,AbortSignal,Date,weatherNumber:math.number,...math,NASR_AIRPORTS:'https://example.test/airports',airportElevationCache:new Map(),runwayDb:{},
  fetch:async url=>{lookups++;if(lookupFails)throw Error('Offline');return{ok:true,json:async()=>({features:[{attributes:{ICAO_ID:icao,ARPT_ID:'DTO',ELEV:elevation,EFF_DATE:'2026/10/01',ARPT_ELEV_SOURCE:'SURVEY'}}]})}},
  nasrRunwayLookup:async()=>({airport:{ident:'KDTO',name:'Denton'},runways:[{runway_id:'18L',heading:180,length_ft:7002}]}),
  first:x=>Array.isArray(x)?x[0]:x,normMetar:x=>x,normTaf:x=>x,windComponents:()=>({headwind_kt:0}),
  awc:async name=>name==='metar'?(metarMissing?null:[{altimeter_hpa:altim,temp_c:27.8}]):null});
 vm.runInContext(serverFn('nasrAirportElevation')+'\n'+serverFn('airportBundle'),context);
 return {context,run:code=>vm.runInContext(code,context),lookups:()=>lookups,setAltim:value=>altim=value};
}
test('runway-only FAA data gains a sourced airport elevation and live pressure altitude',async()=>{const d=serverHarness();const p=await d.run('airportBundle("KDTO")');assert.equal(p.airport.elevation_ft,642.8);assert.match(p.airport.elevation_source,/FAA NASR/);assert.equal(p.pressure_altitude_ft,Math.round(math.pressureAlt(642.8,math.hpaToInhg(1019.3))));assert(Number.isFinite(p.density_altitude_ft));});
test('each weather refresh recalculates altitude while airport elevation is cached',async()=>{const d=serverHarness();const first=await d.run('airportBundle("KDTO")');d.setAltim(1000);const second=await d.run('airportBundle("KDTO")');assert.notEqual(first.pressure_altitude_ft,second.pressure_altitude_ft);assert.equal(d.lookups(),1);});
test('missing elevation and failed lookup do not invent sea-level performance',async()=>{const d=serverHarness({lookupFails:true});const p=await d.run('airportBundle("KDTO")');assert.equal(p.pressure_altitude_ft,null);assert.equal(p.density_altitude_ft,null);assert.equal(p.runways.length,1);});
test('an empty FAA elevation is not sea level',async()=>{const d=serverHarness({elevation:''});const p=await d.run('airportBundle("KDTO")');assert.equal(p.pressure_altitude_ft,null);});
test('a valid FAA zero elevation is accepted',async()=>{const d=serverHarness({elevation:0});const p=await d.run('airportBundle("KDTO")');assert.equal(p.airport.elevation_ft,0);assert(Number.isFinite(p.pressure_altitude_ft));});
test('a different ICAO airport cannot supply this elevation',async()=>{const d=serverHarness({icao:'OTHER'});const p=await d.run('airportBundle("KDTO")');assert.equal(p.pressure_altitude_ft,null);});
test('missing METAR leaves pressure altitude unavailable despite known elevation',async()=>{const d=serverHarness({metarMissing:true});const p=await d.run('airportBundle("KDTO")');assert.equal(p.airport.elevation_ft,642.8);assert.equal(p.pressure_altitude_ft,null);});
function frontend(raw){
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:''});return elements.get(id)};
 $('toConfig').value='S20';$('toRunwayCondition').value='DRY';$('toAntiIce').value='OFF';$('perfV1').value='OLD';$('perfBFL').value='OLD';
 let calls=0;
 const context=vm.createContext({$,weatherNumber:math.number,missionData:{departure:{pressure_altitude_ft:raw},destination:{pressure_altitude_ft:raw}},perfIsManual:()=>false,valueOrNull:()=>null,
  FS_PERF:{takeoff:{S20:{tables:{0:{}},vr:{},v15vs:{}}}},perfTakeoffWeightLb:()=>30000,perfTakeoffTemp:()=>27.8,interpScalarN:()=>111,f50VfrFromVr:()=>126,f50VftFromWeight:()=>170,
  fsTakeoff:()=>{calls++;return{v1:96,bfl:3468}},kN:x=>Object.keys(x).map(Number)});
 for(const name of ['perfTakeoffPA','perfLandingPA','f9Num','autoTO'])vm.runInContext(fn(name),context);
 return {$,run:code=>vm.runInContext(code,context),calls:()=>calls};
}
test('missing mission altitude blocks F50 V1/BFL and clears previous values',()=>{const d=frontend(null);assert.equal(d.run('perfTakeoffPA()'),null);assert.equal(d.run('perfLandingPA()'),null);const result=d.run('autoTO()');assert.match(result.msg,/pressure altitude unavailable/);assert.equal(result.v1,null);assert.equal(d.$('perfV1').value,'');assert.equal(d.$('perfBFL').value,'');assert.equal(d.calls(),0);});
test('actual sea-level mission still evaluates with explicit zero altitude',()=>{const d=frontend(0);assert.equal(d.run('autoTO().v1'),96);assert.equal(d.calls(),1);});
test('F900 input reader rejects blank pressure altitude but accepts explicit zero',()=>{const d=frontend(null);assert.equal(d.run('f9Num("f9ToPA")'),null);d.$('f9ToPA').value='0';assert.equal(d.run('f9Num("f9ToPA")'),0);});
