'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const code=html.slice(html.indexOf('const APP_UPDATE_BUILD='),html.indexOf('async function startupCheck('));
function app({online=true,failSave=false}={}){
 const elements=new Map(),calls=[],records=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{hidden:true,disabled:false,textContent:''});return elements.get(id)};
 const context=vm.createContext({$:element,navigator:{onLine:online},document:{addEventListener(){}},console,
  window:{currentMissionMeta:{id:'existing-draft',completed:false},location:{reload(){calls.push('reload')}}},
  saveCurrentDraft(){calls.push('save');if(failSave)throw new Error('Storage full');records.set('existing-draft',{id:'existing-draft',state:{fuel:8000}})},
  findLocalMissionRecord:id=>records.get(id),persistRefreshContext(){calls.push('context')},
  apiUrl:x=>x,fetchJsonWithTimeout:async()=>({build:'99.0.0'})});
 vm.runInContext(code,context);return {elements,calls,records,run:source=>vm.runInContext(source,context)};
}
test('a build mismatch displays actionable update and sign-in instructions',()=>{
 const a=app();a.run('setAppUpdateNotice("99.0.0")');assert.equal(a.elements.get('appUpdateNotice').hidden,false);
 assert.match(a.elements.get('appUpdateMessage').textContent,/Update Now/);assert.match(a.elements.get('appUpdateMessage').textContent,/Sign in again/);
 a.run('setAppUpdateNotice(APP_UPDATE_BUILD)');assert.equal(a.elements.get('appUpdateNotice').hidden,true);
});
test('Update Now saves the existing draft and refresh context before reload',async()=>{
 const a=app();assert.equal(await a.run('updateFlightOpsApp()'),true);
 assert.deepEqual(a.calls,['save','context','reload']);assert.equal(a.records.get('existing-draft').state.fuel,8000);
});
test('offline update stays on the current page with reconnection guidance',async()=>{
 const a=app({online:false});assert.equal(await a.run('updateFlightOpsApp()'),false);assert.deepEqual(a.calls,[]);
 assert.match(a.elements.get('appUpdateMessage').textContent,/Connect to the internet/);
});
test('a failed draft save prevents update/reload',async()=>{
 const a=app({failSave:true});assert.equal(await a.run('updateFlightOpsApp()'),false);assert.deepEqual(a.calls,['save']);
 assert.equal(a.elements.get('appUpdateNowBtn').disabled,false);assert.match(a.elements.get('appUpdateMessage').textContent,/Keep this page open/);
});
test('a foreground version check exposes the update without reloading or signing out',async()=>{
 const a=app();await a.run('checkAppVersion()');assert.equal(a.elements.get('appUpdateNotice').hidden,false);assert.deepEqual(a.calls,[]);
});
