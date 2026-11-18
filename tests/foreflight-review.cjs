'use strict';
// Isolated WebKit rendering of the real import page with invented data only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),{extractPlan}=require('../foreflight-parser'),{mobilePlan}=require('./foreflight-fixtures.cjs');
const widths=[320,375,390,430,560,561,600,700,744,768,810,820,834,1000,1024,1100,1180,1194,1366,1440];
const assets={'/foreflight.html':'text/html','/foreflight.css':'text/css','/numeric-entry.css':'text/css','/foreflight.js':'text/javascript','/numeric-entry.js':'text/javascript'};
(async()=>{
 const browser=await webkit.launch({headless:true});let cases=0;
 try{
  for(const locale of ['en-US','de-DE'])for(const desktopMode of [false,true]){
   const context=await browser.newContext({viewport:{width:834,height:1194},locale,isMobile:true,hasTouch:true,userAgent:desktopMode?'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15':'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
   if(desktopMode)await context.addInitScript(()=>{Object.defineProperty(navigator,'platform',{value:'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{value:5});});
   const methods=[];
   await context.route('**/*',route=>{
    const url=new URL(route.request().url());methods.push(route.request().method());
    if(assets[url.pathname])return route.fulfill({status:200,contentType:assets[url.pathname],body:fs.readFileSync(path.join(root,'public',url.pathname.slice(1)))});
    if(url.pathname==='/api/foreflight/imports/test')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,import:{id:'test',pages:4,created_at:'2026-11-17T12:00:00Z',...extractPlan(mobilePlan('N33AP'))},aircraft:[{id:'test-aircraft',registration:'N33AP',model:'FA50'}]})});
    return route.abort();
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://flightops.invalid/foreflight.html?import=test');await page.locator('#fob_lb').waitFor({state:'visible'});
   assert.equal(await page.locator('#fob_lb').inputValue(),'8000');assert.equal(await page.locator('#reviewed').isChecked(),false);
   for(const width of widths){
    await page.setViewportSize({width,height:1194});await page.locator('#date').scrollIntoViewIfNeeded();
    const g=await page.evaluate(()=>{
     const date=document.getElementById('date'),dep=document.getElementById('departure');
     const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
     const d=rect(date);return {d,p:rect(date.parentElement),dep:rect(dep),hit:document.elementFromPoint(d.left+d.width/2,d.top+d.height/2)?.id,appearance:getComputedStyle(date).webkitAppearance,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    const label=`${locale} ${desktopMode?'desktop iPad':'iPad'} ${width}`;
    assert(!g.overflow,label+' horizontal overflow');assert(g.d.width>0&&g.d.height>=44,label+' touch size');
    assert(g.d.left>=g.p.left-1&&g.d.right<=g.p.right+1,label+' date exceeds cell');
    const sameRow=g.d.top<g.dep.bottom&&g.dep.top<g.d.bottom;
    assert(!sameRow||g.d.right<=g.dep.left-8||g.dep.right<=g.d.left-8,label+' date overlaps departure');
    assert.equal(g.appearance,'none',label+' intrinsic date sizing');assert.equal(g.hit,'date',label+' date hit target');cases++;
   }
   await page.setViewportSize({width:834,height:1194});
   const screenshot=process.env.FLIGHTOPS_REVIEW_SCREENSHOT;
   if(screenshot&&locale==='en-US'&&!desktopMode){fs.mkdirSync(path.dirname(screenshot),{recursive:true});await page.locator('#tripForm').screenshot({path:screenshot});}
   const dialog=page.locator('#flightopsNumberPad'),key=value=>dialog.locator('[data-key="'+value+'"]');
   for(const [id,value]of [['fob_lb','8000'],['trip_lb','2500.5'],['taxi_lb','0']]){
    const input=page.locator('#'+id),original=await input.inputValue();
    assert.equal(await input.getAttribute('inputmode'),'none');assert.equal(await input.getAttribute('type'),'text');
    await input.tap();assert(await dialog.isVisible());assert(!(await key('.').isDisabled()));assert(await key('sign').isDisabled());
    await key('9').tap();assert.equal(await input.inputValue(),original,'no premature commit');await key('cancel').tap();assert.equal(await input.inputValue(),original);
    await input.tap();for(const digit of value)await key(digit).tap();await key('done').tap();assert.equal(await input.inputValue(),value);assert(!(await dialog.isVisible()));
   }
   const fob=page.locator('#fob_lb');await fob.tap();await key('clear').tap();await key('done').tap();assert(await dialog.isVisible());
   await key('0').tap();await key('done').tap();assert(await dialog.isVisible());assert((await dialog.locator('.pad-error').innerText()).includes('1'));await key('cancel').tap();
   await fob.tap();await key('keyboard').tap();assert.equal(await fob.getAttribute('inputmode'),'decimal');await fob.fill('8100');await page.locator('#departure').tap();assert.equal(await fob.getAttribute('inputmode'),'none');
   await fob.tap();assert(await dialog.isVisible());
   if(screenshot&&locale==='en-US'&&!desktopMode)await dialog.screenshot({path:screenshot.replace(/\.png$/,'-keypad.png')});
   await key('cancel').tap();assert.deepEqual(errors,[]);assert(methods.every(m=>m==='GET'),'render/keypad checks never create a trip');await context.close();
  }
  console.log(`PASS ForeFlight review: ${cases} date/cell/hit/overflow cases, 2 locales, iPad and desktop-mode iPad; migrated FOB and all three shared keypads, Done/Cancel, decimals, zero taxi, required/range and keyboard fallback.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
