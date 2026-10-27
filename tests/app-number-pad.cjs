'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/\s+on(?:focus|click|input|change|blur)="[^"]*"/gi,'');
const rules=source.slice(source.indexOf('function numericEntryRules('),source.indexOf('function operationalGateState('));
const pad=fs.readFileSync(path.join(root,'public/numeric-entry.js'),'utf8'),css=fs.readFileSync(path.join(root,'public/numeric-entry.css'),'utf8');
(async()=>{
 const browser=await webkit.launch({headless:true});let checks=0;
 try{
  for(const desktopMode of [false,true]){
   const context=await browser.newContext({viewport:{width:834,height:1194},isMobile:true,hasTouch:true,userAgent:desktopMode?'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15':'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
   await context.route('**/*',route=>route.abort());const page=await context.newPage();await page.setContent(html);await page.addStyleTag({content:css});
   await page.evaluate(desktopMode=>{
    if(desktopMode){Object.defineProperty(navigator,'platform',{value:'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5})}
    for(const id of ['homeView','newtripView','opsView','toldView','f900bmissionView','f900bView','archiveView'])document.getElementById(id).style.display=id==='newtripView'?'block':'none';
    window.entryEvents={input:0,change:0};
    for(const name of ['input','change'])document.getElementById('homeFOB').addEventListener(name,()=>entryEvents[name]++);
    document.getElementById('homeFOB').value='8000';document.getElementById('homeMissionFuel').value='2000';
   },desktopMode);
   await page.addScriptTag({content:rules});await page.addScriptTag({content:pad});
   const fob=page.locator('#homeFOB'),dialog=page.getByRole('dialog'),key=value=>page.locator('#flightopsNumberPad [data-key="'+value+'"]');
   assert.equal(await fob.getAttribute('inputmode'),'none');assert.equal(await fob.getAttribute('data-app-number-pad'),'true');checks++;
   const top=await fob.boundingBox(),next=await page.locator('#homeMissionFuel').boundingBox();
   assert(Math.abs(top.y-next.y)<=1,'FOB and trip-fuel entries align on iPad');assert(!source.includes('FROM NEW TRIP'));checks++;
   await fob.tap();assert(await dialog.isVisible());assert.match(await page.locator('#flightopsNumberPadTitle').innerText(),/FOB/);
   assert(await key('.').isDisabled());assert(await key('sign').isDisabled());checks++;
   await page.evaluate(()=>{configureNumericKeypads();configureNumericKeypads()});assert.equal(await page.locator('#flightopsNumberPad').count(),1);checks++;
   await key('9').tap();for(let i=0;i<3;i++)await key('0').tap();
   assert.equal(await fob.inputValue(),'8000');assert.deepEqual(await page.evaluate(()=>entryEvents),{input:0,change:0});checks++;
   await key('done').tap();assert.equal(await fob.inputValue(),'9000');assert(!(await dialog.isVisible()));
   assert.deepEqual(await page.evaluate(()=>entryEvents),{input:1,change:1});assert.equal(await page.locator('#homeMissionFuel').inputValue(),'2000');checks++;
   await fob.tap();await key('4').tap();await key('cancel').tap();assert.equal(await fob.inputValue(),'9000');assert.deepEqual(await page.evaluate(()=>entryEvents),{input:1,change:1});checks++;
   await fob.tap();for(let i=0;i<6;i++)await key('9').tap();await key('done').tap();assert(await dialog.isVisible());assert.match(await page.locator('.pad-error').innerText(),/15514/);assert.equal(await fob.inputValue(),'9000');await key('cancel').tap();checks++;
   await fob.tap();await key('2').tap();await key('backspace').tap();assert.equal(await page.locator('#flightopsNumberPadValue').innerText(),'—');await page.keyboard.press('Escape');assert.equal(await fob.inputValue(),'9000');checks++;
   await fob.tap();await key('1').tap();await key('keyboard').tap();assert(!(await dialog.isVisible()));assert.equal(await fob.inputValue(),'9000');assert.equal(await fob.getAttribute('inputmode'),'numeric');checks++;
   await fob.blur();assert.equal(await fob.getAttribute('inputmode'),'none');await fob.tap();
   await page.keyboard.type('8500');await page.keyboard.press('Enter');assert.equal(await fob.inputValue(),'8500');assert(!(await dialog.isVisible()));checks++;
   // Decimal/sign controls apply to signed weather fields, without changing their value on Cancel.
   await page.evaluate(()=>{document.getElementById('newtripView').style.display='none';document.getElementById('f900bmissionView').style.display='block';document.getElementById('f9ManualWxOAT').value='20'});
   const oat=page.locator('#f9ManualWxOAT');await oat.tap();await key('clear').tap();await key('1').tap();await key('2').tap();await key('.').tap();await key('5').tap();await key('sign').tap();
   assert.equal(await oat.inputValue(),'20');await key('done').tap();assert.equal(await oat.inputValue(),'-12.5');checks++;
   await page.evaluate(()=>document.getElementById('f9ManualWxOAT').value='20');await oat.tap();await key('sign').tap();await key('1').tap();await key('2').tap();await key('done').tap();assert.equal(await oat.inputValue(),'-12');checks++;
   await page.evaluate(()=>{const el=document.createElement('input');el.type='number';el.min='0';el.id='pad-dynamic';document.body.append(el);configureNumericKeypads()});
   await page.locator('#pad-dynamic').tap();assert(await dialog.isVisible());await key('cancel').tap();checks++;
   assert.equal(await page.locator('#perfTOW').getAttribute('data-app-number-pad'),null);checks++;
   if(!desktopMode){
    const out=process.env.FLIGHTOPS_QA_DIR||path.join(os.tmpdir(),'flightops-numeric-qa');fs.mkdirSync(out,{recursive:true});
    await page.evaluate(()=>{document.getElementById('f900bmissionView').style.display='none';document.getElementById('newtripView').style.display='block';window.scrollTo(0,0)});
    await fob.tap();await page.screenshot({path:path.join(out,'ipad-app-number-pad-v52626.png')});
    for(const size of [{width:320,height:568},{width:1194,height:834}]){
     await page.setViewportSize(size);const bounds=await dialog.boundingBox();assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=size.width+1&&bounds.y+bounds.height<=size.height+1);checks++;
    }
    await key('cancel').click();
   }
   for(const width of [744,768,834,1024]){
    await page.setViewportSize({width,height:1194});
    for(const spec of [{view:'newtripView',fob:'homeFOB',burn:'homeMissionFuel'},{view:'opsView',fob:'fuel',burn:'missionFuel'},{view:'f900bmissionView',fob:'f9mFOB',burn:'f9mMissionFuel'}]){
     await page.evaluate(spec=>{for(const id of ['homeView','newtripView','opsView','toldView','f900bmissionView','f900bView','archiveView'])document.getElementById(id).style.display=id===spec.view?'block':'none'},spec);
     const fields=await page.evaluate(spec=>{const a=document.getElementById(spec.fob),b=document.getElementById(spec.burn),al=a.parentElement.querySelector('label'),bl=b.parentElement.querySelector('label');return {a:a.getBoundingClientRect().top,b:b.getBoundingClientRect().top,al:al.getBoundingClientRect().top,bl:bl.getBoundingClientRect().top,ah:al.getBoundingClientRect().height,bh:bl.getBoundingClientRect().height,ac:getComputedStyle(al).minHeight,bc:getComputedStyle(bl).minHeight}},spec);
     if(Math.abs(fields.al-fields.bl)<1)assert(Math.abs(fields.a-fields.b)<1,'FOB row alignment '+spec.view+' at '+width+' '+JSON.stringify(fields));
     checks++;
    }
   }
   await context.close();
  }
  const desktop=await browser.newPage({viewport:{width:1280,height:900}});await desktop.route('**/*',route=>route.abort());await desktop.setContent(html);
  await desktop.addScriptTag({content:rules});await desktop.addScriptTag({content:pad});
  assert.equal(await desktop.locator('#homeFOB').getAttribute('inputmode'),'numeric');assert.equal(await desktop.locator('#homeFOB').getAttribute('data-app-number-pad'),null);checks++;await desktop.close();
  console.log('PASS app number pad: '+checks+' checks; iPad touch, desktop-mode iPad, desktop fallback, Done/Cancel, validation, events and responsive layout.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
