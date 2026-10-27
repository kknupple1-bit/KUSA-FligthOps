'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {device,fn,html}=require('./helpers/f50-gate-harness.cjs');
function mission(status='REVIEWED',pilot='',options={}){
 const d=device({today:true,...options});d.$('perfObs').value=pilot;
 d.ctx.departureObstacleReview={status,airport:'KDTO',items:status==='FLAGGED'?[{text:'CRANE'}]:[]};
 for(const name of ['effectiveObstacleReview','renderDepartureObstacleReview'])d.run(fn(name));
 return d;
}
test('clear screen plus passing climb clears without pilot acknowledgement and hides control',async()=>{
 const d=mission();assert.equal(d.run('effectiveObstacleReview().state'),'BASELINE_CLEAR');assert.equal(d.run('effectiveObstacleReview().cleared'),true);
 d.run('renderDepartureObstacleReview()');assert.equal(d.$('pilotObstacleReviewControl').style.display,'none');assert.match(d.$('autoObstacleReview').textContent,/NO OBSTACLE NOTAM FLAG/);
 d.run('syncTakeoffSection()');assert.equal(d.$('toStatus').className,'ok');await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').className,'ok');assert.match(d.$('toStatus').textContent,/NOTAM SCREEN CLEAR/);
});
for(const status of ['FLAGGED','UNAVAILABLE'])test(status+' requires exception review until pilot disposition',async()=>{
 const d=mission(status);assert.equal(d.run('effectiveObstacleReview().cleared'),false);d.run('renderDepartureObstacleReview()');assert.equal(d.$('pilotObstacleReviewControl').style.display,'');
 await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').className,'warn');d.run('syncTakeoffSection()');assert.equal(d.$('toStatus').className,'warn');
 d.$('perfObs').value='true';assert.equal(d.run('effectiveObstacleReview().state'),'REVIEWED_NO_CONFLICT');await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').className,'ok');
});
for(const status of ['REVIEWED','FLAGGED','UNAVAILABLE','NOT_CHECKED'])test(status+' explicit conflict remains NO-GO in Evaluate and refresh',async()=>{
 const d=mission(status,'false');await d.run('evaluateTakeoff()');assert.match(d.$('toStatus').textContent,/NO-GO.*CONFLICT/);assert.equal(d.$('toStatus').className,'bad');
 d.run('syncTakeoffSection()');assert.match(d.$('toStatus').textContent,/NO-GO.*CONFLICT/);assert.equal(d.$('toStatus').className,'bad');
});
for(const status of ['NOT_CHECKED','CHECKING','UNKNOWN'])test(status+' never falls through to a green result even with a saved pilot disposition',async()=>{
 const d=mission(status,'true');assert.equal(d.run('effectiveObstacleReview().cleared'),false);await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').className,'warn');assert.match(d.$('toStatus').textContent,/SCREEN NOT CHECKED/);
 d.run('syncTakeoffSection()');assert.equal(d.$('toStatus').className,'warn');assert.match(d.$('toStatus').textContent,/SCREEN NOT CHECKED/);
});
for(const pilot of ['', 'true'])test('missing climb gradient stays pending, pilot '+JSON.stringify(pilot),async()=>{
 const d=mission(pilot?'FLAGGED':'REVIEWED',pilot);d.ctx.autoClimbAssessment=()=>({limit:35000,pass:true,gradient:null,ai:'OFF'});
 await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').className,'warn');assert.match(d.$('toStatus').textContent,/OEI CLIMB CHECK PENDING/);
 d.run('syncTakeoffSection()');assert.equal(d.$('toStatus').className,'warn');assert.match(d.$('toStatus').textContent,/OEI CLIMB CHECK PENDING/);
});
test('missing climb limit cannot be presented as baseline ready',()=>{const d=mission();d.ctx.autoClimbAssessment=()=>({pass:true,gradient:5,limit:null});assert.equal(d.run('effectiveObstacleReview().state'),'CLIMB_PENDING');});
test('failed climb remains NO-GO despite clean screen or pilot no-conflict',async()=>{for(const pilot of ['', 'true']){const d=mission('REVIEWED',pilot,{climbFail:true});await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').className,'bad');d.run('syncTakeoffSection()');assert.equal(d.$('toStatus').className,'bad');}});
test('clean screen leaves future N1 pending independently',async()=>{const d=mission('REVIEWED','',{today:false});await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').className,'warn');assert.match(d.$('toStatus').textContent,/N1 DAY-OF-FLIGHT/);assert.doesNotMatch(d.$('toStatus').textContent,/OBSTACLE.*REQUIRED/);});
for(const options of [{closed:true},{serverStatus:'NO-GO'}])test('clean screen does not override '+JSON.stringify(options),async()=>{const d=mission('REVIEWED','',options);await d.run('evaluateTakeoff()');assert.equal(d.$('toStatus').className,'bad');});
test('TOLD never colors a performance-pass-with-review-required status green',()=>{
 const body=fn('updateToldCard'),start=body.indexOf('const takeoffStatusText='),end=body.indexOf('\n}',start);
 const d=mission();for(const [status,tone] of [['PERFORMANCE PASS • OBSTACLE NOTAM REVIEW REQUIRED','warn'],['PERFORMANCE PASS • OBSTACLE NOTAM SCREEN UNAVAILABLE','warn'],['NO-GO • PILOT OBSTACLE CONFLICT','bad'],['PASS • TAKEOFF PERFORMANCE • NOTAM SCREEN CLEAR','ok']]){d.ctx.textOf=()=>status;d.run('{'+body.slice(start,end)+'}');assert.equal(d.$('opTakeoffStatus').className,'told-op-status '+tone);}
});
