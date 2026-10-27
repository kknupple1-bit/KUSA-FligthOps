'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const markup=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/\s+on(?:focus|click|input|change|blur)="[^"]*"/gi,'');
const code=source.slice(source.indexOf('function numericEntryRules('),source.indexOf('function operationalGateState('));
const fastCode=source.slice(source.indexOf('function enableFastNumericEntry(){'),source.indexOf('document.addEventListener("DOMContentLoaded",enableFastNumericEntry);'));
(async()=>{
 const browser=await webkit.launch({headless:true});let cases=0;
 try{
  for(const desktopMode of [false,true]){
   const context=await browser.newContext({viewport:{width:834,height:1194},isMobile:true,hasTouch:true,
    userAgent:desktopMode?'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15':'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
   await context.route('**/*',route=>route.abort());const page=await context.newPage();await page.setContent(markup);
   await page.evaluate(desktopMode=>{if(desktopMode){Object.defineProperty(navigator,'platform',{value:'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5})}},desktopMode);
   await page.addScriptTag({content:code});await page.addScriptTag({content:fastCode});
   await page.evaluate(()=>{configureNumericKeypads();enableFastNumericEntry()});
   for(const id of ['homeFOB','homeMissionFuel','fuel','missionFuel','paxRequested','f9mFOB','f9mMissionFuel','f9ToWeight','manualRunwayLength']){
    const info=await page.locator('#'+id).evaluate(el=>({type:el.type,mode:el.getAttribute('inputmode'),pattern:el.getAttribute('pattern'),hint:el.getAttribute('enterkeyhint')}));
    assert.deepEqual(info,{type:'text',mode:'numeric',pattern:'[0-9]*',hint:'done'});cases++;
   }
   for(const id of ['manualWxOAT','f9ManualWxOAT','f9ToWind','f9ToSlope']){
    assert.equal(await page.locator('#'+id).getAttribute('inputmode'),'decimal');assert.equal(await page.locator('[data-sign-for="'+id+'"]').count(),1);cases++;
   }
   await page.evaluate(()=>{configureNumericKeypads();configureNumericKeypads()});
   assert.equal(await page.locator('[data-sign-for="f9ToSlope"]').count(),1);cases++;
   await page.evaluate(()=>{
    for(const id of ['homeView','newtripView','opsView','toldView','f900bmissionView','f900bView','archiveView'])document.getElementById(id).style.display=id==='f900bmissionView'?'block':'none';
    document.querySelectorAll('details').forEach(el=>el.open=true);
   });
   await page.locator('#f9ManualWxOAT').fill('12,5');assert.equal(await page.locator('#f9ManualWxOAT').inputValue(),'12.5');
   await page.locator('[data-sign-for="f9ManualWxOAT"]').click();assert.equal(await page.locator('#f9ManualWxOAT').inputValue(),'-12.5');cases++;
   await page.locator('#f9mFOB').fill('8000');assert.equal(await page.locator('#f9mFOB').inputValue(),'8000');cases++;
   await page.locator('#f9mFOB').focus();assert.equal(await page.locator('#f9mFOB').getAttribute('inputmode'),'numeric');cases++;
   await page.evaluate(()=>{const input=document.createElement('input');input.id='dynamic-weight';input.type='number';input.min='0';document.body.append(input);configureNumericKeypads()});
   assert.equal(await page.locator('#dynamic-weight').getAttribute('inputmode'),'numeric');assert.equal(await page.locator('#dynamic-weight').getAttribute('type'),'text');cases++;
   assert.equal(await page.locator('#perfTOW').getAttribute('type'),'number');cases++;
   if(!desktopMode){
    const output=process.env.FLIGHTOPS_QA_DIR||path.join(os.tmpdir(),'flightops-numeric-qa');fs.mkdirSync(output,{recursive:true});
    await page.screenshot({path:path.join(output,'ipad-numeric-fields-v52625.png')});
    await page.evaluate(()=>{window.$=id=>document.getElementById(id);for(const id of ['homeView','newtripView','opsView','toldView','f900bmissionView','f900bView','archiveView'])document.getElementById(id).style.display=id==='homeView'?'block':'none';window.scrollTo(0,0)});
    await page.addScriptTag({content:source.slice(source.indexOf('const APP_UPDATE_BUILD='),source.indexOf('async function startupCheck('))});
    await page.evaluate(()=>setAppUpdateNotice('5.26.26'));
    const update=page.getByRole('button',{name:'Update Now',exact:true});assert(await update.isVisible());
    const box=await update.boundingBox();assert(box.height>=44&&box.x>=0&&box.x+box.width<=834);cases++;
    await page.screenshot({path:path.join(output,'update-notice-preview-v52625.png')});
   }
   await context.close();
  }
  console.log('PASS iPad numeric-entry configuration: '+cases+' checks, iPad and desktop-mode iPad. Native on-screen keyboard still requires physical-device acceptance.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
