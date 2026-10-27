'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const test=require('node:test'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
function fn(name){const start=html.indexOf('function '+name+'('),end=html.indexOf('\nfunction ',start+10);assert(start>=0&&end>start,name);return html.slice(start,end);}
function f50(fob,taxi,trip,verified=true){
 const elements=new Map();
 const $=id=>{if(!elements.has(id))elements.set(id,{value:0,checked:false,textContent:'',className:'',style:{},appendChild(){}});return elements.get(id);};
 for(const [id,value] of Object.entries({fuel:fob,taxiFuel:taxi,missionFuel:trip,captWt:190,foWt:189.7}))$(id).value=value;
 $('fobVerified').checked=verified;
 const context=vm.createContext({console,$,num:id=>Number($(id).value),passengers:[],seatAssignments:Array(9).fill(null),latestCalc:null,
 baggageLoadsFromUI:()=>[0,0,0],perfIsManual:()=>false,document:{createElement:()=>({})},
 selectedRunwayChanged(){},syncTakeoffSection(){},syncLandingSection(){},updateVSpeedCard(){},drawTrace(){},updateFOBVerifyLabel(){},updateToldCard(){}});
 vm.runInContext(html.slice(html.indexOf('const emptyWeight='),html.indexOf('const QRH_CLIMB_GCLB2=')),context);
 for(const name of ['pctMacFromArm','interp','fuelMomentThousand','fuelMomentLbIn','getPassenger','recalculate'])vm.runInContext(fn(name),context);
 vm.runInContext('recalculate()',context);
 return {c:context.latestCalc,$};
}
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
for(const [label,fob,taxi,trip,expected,valid] of [
 ['reported 69 lb trip burn',9000,200,69,8731,true],
 ['taxi burn only',9000,200,0,8800,true],
 ['normal trip burn',9000,200,3000,5800,true],
 ['no taxi burn',9000,0,3000,6000,true],
 ['exact exhaustion',9000,200,8800,0,true],
 ['trip exceeds post-taxi fuel',9000,200,8900,0,false],
 ['taxi exceeds FOB',100,200,0,0,false],
 ['zero fuel',0,0,0,0,true]
])test('F50 '+label,()=>{
 const {c,$}=f50(fob,taxi,trip);
 close(c.zfw,21859);close(c.ramp,21859+fob);close(c.tow,21859+fob-taxi);
 close(c.landingFuel,expected);close(c.landing,21859+expected);close(c.reserve,fob-taxi-trip);
 assert.equal(c.fuelOK,valid);
 if(valid&&fob>=taxi){assert(c.burnPath.length>=3);close(c.burnPath[0].fuel,fob-taxi);close(c.burnPath.at(-1).fuel,expected);close(c.burnPath.at(-1).weight,c.landing);close(c.burnPath.at(-1).pct,c.landingPct);assert(c.landing<=c.tow+1e-8);}
 if(!valid){assert.equal(c.wbOK,false);assert.match($('envStatus').textContent,/INSUFFICIENT FUEL/);assert.equal($('fuelStatusSide').className,'bad');}
 close(Number($('landWt').value),Math.round(c.landing));
 assert.equal($('landingFuelCalc').textContent,expected.toLocaleString()+' lb');
 // Independently calculate the interpolated F50 moment for the reported case.
 if(trip===69){const moment=-55+(expected-8500)*4/500;const expectedCG=25+(127185.96-379.7*275.88+moment*1000)/(21859+expected)/1.1177;close(c.landingPct,expectedCG);close(c.landing,30590);}
});
test('F50 FOB confirmation alone cannot clear W&B',()=>assert.equal(f50(9000,200,69,false).c.wbOK,false));
test('TOLD fuel status consumes validity and shows the reason for invalid plans',()=>{
 const code=fn('updateToldCard');
 const start=code.indexOf('const fuelReady='),end=code.indexOf('$("toldPrepRunways")',start);
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);};
 for(const valid of [false,true]){
  vm.runInNewContext(code.slice(start,end),{$,fobVerified:true,c:{fuelOK:valid,lowLandingFuel:false,lowLandingFuelConfirmed:true}});
  assert.equal($('toldPrepFuel').className,valid?'told-pill ok':'told-pill bad');
  assert.match($('toldPrepFuel').textContent,valid?/VERIFIED/:/TAXI \+ TRIP EXCEEDS FOB/);
 }
 assert(code.includes('label:"TAXI + TRIP BURN EXCEEDS FUEL ON BOARD",severity:"bad"'));
});
test('both aircraft label trip burn as excluding taxi',()=>{
 for(const id of ['homeMissionFuel','missionFuel','f9mMissionFuel'])assert(new RegExp('<label[^>]*>Trip Fuel Burn lb \\(excludes taxi\\)</label>\\s*<input[^>]*id="'+id+'"').test(html),id);
});
// Run the existing 900B fuel accounting lines unchanged, for parity against F50.
for(const [taxi,trip,expected,valid] of [[200,69,8731,true],[200,0,8800,true],[200,8900,0,false],[9100,0,0,false]])test(`900B accounting taxi ${taxi} trip ${trip}`,()=>{
 const code=fn('f9RecalcWB'),start=code.indexOf('const fob=n('),end=code.indexOf('const fmr=',start);
 const values={f9wbFuel:9000,f9wbTaxi:taxi,f9wbTripBurn:trip};
 const c={n:id=>values[id],d:{limits:{fuel_capacity_lb:19165}},loadOK:true};
 vm.runInNewContext(code.slice(start,end)+';result={toFuel,ldgFuel,loadOK};',c);
 close(c.result.ldgFuel,expected);assert.equal(c.result.loadOK,valid);
});
