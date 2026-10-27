'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const start=html.indexOf('(function installPullToRefresh(){'),end=html.indexOf('\n})();',start)+6;assert(start>0&&end>start);
function gesture({online=true,active=true,result=true,throws=false,interactive=false}={}){
 const history=[],calls=[],handlers={};let label='';
 const indicator={style:{},set textContent(v){label=v;history.push(v)},get textContent(){return label}};
 const context=vm.createContext({$:id=>id==='pullRefreshIndicator'?indicator:null,navigator:{onLine:online},
 window:{ontouchstart:null,scrollY:0,currentMissionMeta:active?{id:'synthetic',completed:false}:null,location:{reload(){calls.push('reload')}}},
 document:{addEventListener:(event,fn)=>{handlers[event]=fn}},console:{warn(){}},setTimeout(fn){fn();return 1},
 recalculate(){calls.push('recalculate')},updateToldCard(){},f9UpdateOperationalGate(){},saveCurrentDraft(){calls.push('save')},persistRefreshContext(){calls.push('persist')},
 refreshToldOperationalData:async()=>{calls.push('refresh');if(throws)throw new Error('Simulated network failure');return result}});
 vm.runInContext(html.slice(start,end),context);
 const point=(y,x=0)=>({touches:[{clientY:y,clientX:x}],target:{closest:()=>interactive?{}:null},cancelable:true,preventDefault(){calls.push('prevent')}});
 return {history,calls,handlers,indicator,point,async pull(distance=120){handlers.touchstart(point(0));handlers.touchmove(point(distance));handlers.touchend();for(let i=0;i<12;i++)await Promise.resolve();}};
}
test('pull above threshold saves the active draft and refreshes without reloading',async()=>{const d=gesture();await d.pull();assert.deepEqual(d.calls.filter(c=>c!=='prevent'),['save','refresh']);assert(d.history.includes('Release to refresh'));assert(d.history.some(x=>x.startsWith('Refresh finished')));assert.equal(d.indicator.style.opacity,'0');});
test('short pull cancels without refreshing',async()=>{const d=gesture();await d.pull(40);assert(!d.calls.includes('refresh'));});
test('input gestures do not trigger refresh',async()=>{const d=gesture({interactive:true});await d.pull();assert(!d.calls.includes('refresh'));});
test('offline pull never claims a live refresh',async()=>{const d=gesture({online:false});await d.pull();assert(!d.calls.includes('refresh'));assert(d.history.includes('Offline — live refresh unavailable'));assert(!d.history.some(x=>x.startsWith('Refresh finished')));});
for(const options of [{result:false},{throws:true}])test('operational failure shows failure '+JSON.stringify(options),async()=>{const d=gesture(options);await d.pull();assert(d.history.some(x=>x.startsWith('Refresh failed')));assert(!d.history.some(x=>x.startsWith('Refresh finished')));});
test('without an active mission the gesture preserves context before reload',async()=>{const d=gesture({active:false});await d.pull();assert.deepEqual(d.calls.filter(c=>c!=='prevent'),['persist','reload']);});
test('touch cancellation never triggers operational refresh',()=>{const d=gesture();d.handlers.touchstart(d.point(0));d.handlers.touchmove(d.point(120));d.handlers.touchcancel();d.handlers.touchend();assert(!d.calls.includes('refresh'));});
test('shipped F50 wrapper propagates a caught refresh failure',async()=>{
 const a=html.indexOf('async function refreshToldOperationalData(){'),b=html.indexOf('\nfunction ',a+20);const alerts=[];
 const ctx=vm.createContext({window:{currentMissionMeta:{aircraft:'N33AP'}},$:()=>({value:''}),loadMission:async()=>{throw new Error('Simulated load failure')},alert:x=>alerts.push(x)});
 vm.runInContext(html.slice(a,b),ctx);assert.equal(await vm.runInContext('refreshToldOperationalData()',ctx),false);assert.equal(alerts.length,1);
});
