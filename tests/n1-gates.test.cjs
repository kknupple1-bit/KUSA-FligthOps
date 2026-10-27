'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const test=require('node:test'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const {device,fn}=require('./helpers/f50-gate-harness.cjs');
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
 await d.run('evaluateTakeoff()');assert(d.events.includes('told')&&d.events.includes('save'),'TOLD and draft are synchronized');assert.match(d.$('toStatus').textContent,expected);assert.equal(d.$('toStatus').className,'warn');assert.doesNotMatch(d.$('toStatus').textContent,/OBSTACLE.*REQUIRED|OBSTACLE.*INCOMPLETE/);
 d.run('syncTakeoffSection()');assert.equal(d.$('toStatus').textContent,before);assert.equal(d.$('toStatus').className,'warn');
});
test('same-day source/weather pass clears N1 pending without bypassing other gates',async()=>{
 const d=device({today:true});assert.equal(d.run('currentF50TakeoffN1()').ok,true);assert.equal(d.run('f50N1Attention(currentF50TakeoffN1())'),null);await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').className,'ok');assert.match(d.$('toStatus').textContent,/PASS.*EXCEPTION REVIEW COMPLETE/);
});
for(const [label,options,expected] of [
 ['obstacle conflict',{conflict:true},/OBSTACLE CONFLICT/],['climb failure',{climbFail:true},/SECOND-SEGMENT CLIMB/],['runway closure',{closed:true},/RUNWAY CLOSED/],['server no-go',{serverStatus:'NO-GO'},/NO-GO/]
])test(`N1 planning status never masks ${label}`,async()=>{const d=device(options);await d.run('evaluateTakeoff()');assert(d.events.includes('told')&&d.events.includes('save'),'TOLD and draft are synchronized');assert.match(d.$('toStatus').textContent,expected);assert.equal(d.$('toStatus').className,'bad');});
test('N1-only attention names the actual requirement and opens weather, not obstacles',()=>{
 const d=device(),status=d.run('f50PendingTakeoffStatus([f50N1PendingLabel(currentF50TakeoffN1())])');d.ctx.takeoffN1=d.run('currentF50TakeoffN1()');d.ctx.issues=[];d.ctx.obsEff={cleared:true};d.ctx.textOf=()=>status;
 const body=fn('updateToldCard'),start=body.indexOf('const ts=textOf("toStatus")'),end=body.indexOf('const lts=',start);d.run(body.slice(start,end));
 assert.equal(d.ctx.issues.length,1);assert.match(d.ctx.issues[0].label,/N1 DAY-OF-FLIGHT/);assert.equal(d.ctx.issues[0].target,'manualWeatherCard');assert.equal(d.ctx.issues[0].focus,'manualWxActionBtn');
 const a=body.indexOf('let takeoffTarget=null'),b=body.indexOf('const landingActionable=',a);let action;d.ctx.setToldActionableStatus=(el,target,focus)=>{action={target,focus};};d.run(body.slice(a,b));assert.equal(action.target,'manualWeatherCard');assert.equal(action.focus,'manualWxActionBtn');
});

test('evaluation errors synchronize the visible TOLD state',async()=>{
 const d=device();d.ctx.fetch=async()=>{throw new Error('Simulated network error')};await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').textContent,'EVALUATION ERROR');assert.equal(d.$('toStatus').className,'bad');assert.deepEqual(d.events,['told','save']);
});
