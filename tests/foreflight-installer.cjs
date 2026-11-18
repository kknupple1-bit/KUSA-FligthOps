'use strict';
// Real setup UI, invented identities/keys and fully intercepted offline requests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),assets={'/foreflight.html':'text/html','/foreflight.css':'text/css','/numeric-entry.css':'text/css','/foreflight.js':'text/javascript','/numeric-entry.js':'text/javascript'};
const template='https://www.icloud.com/shortcuts/'+'1'.repeat(32),key='K'.repeat(43);
(async()=>{
 const browser=await webkit.launch({headless:true});let checks=0;
 try{
  for(const mode of ['live','preview','pending']){
   const context=await browser.newContext({viewport:{width:834,height:1194},isMobile:true,hasTouch:true});
   await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>{window.syntheticClipboard=value;}}}));
   let connections=[{id:'expired',label:'This iPad',expires_at:'2000-01-01',revoked_at:null},{id:'revoked',label:'Old iPad',expires_at:'2000-01-01',revoked_at:'2000-01-01'}],posts=[];
   await context.route('**/*',route=>{
    const u=new URL(route.request().url()),method=route.request().method();
    const json=body=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    if(assets[u.pathname])return route.fulfill({status:200,contentType:assets[u.pathname],body:fs.readFileSync(path.join(root,'public',u.pathname.slice(1)))});
    if(u.pathname==='/api/foreflight/installer')return json({ok:true,installer:{available:mode==='live',reason:mode==='preview'?'LIVE_SETUP_REQUIRED':mode==='pending'?'INSTALLER_NOT_CONFIGURED':null,url:mode==='live'?template:null,live_setup_url:'https://flightops.kusaaviation.com/foreflight.html'}});
    if(u.pathname==='/api/foreflight/reader-status')return json({ok:true,reader:{status:'ready'}});
    if(u.pathname==='/api/foreflight/connections'&&method==='GET')return json({ok:true,connections});
    if(method==='POST')posts.push(u.pathname);
    if(u.pathname==='/api/foreflight/connections'&&method==='POST'){
     const created={id:'new',label:'New iPad',expires_at:'2099-01-01',revoked_at:null};connections.push(created);return json({ok:true,connection:created,upload_key:key});
    }
    if(u.pathname==='/api/foreflight/connections/expired/reconnect'&&method==='POST'){
     connections=connections.map(c=>c.id==='expired'?{...c,expires_at:'2099-01-01'}:c);return json({ok:true,connection:connections[0]});
    }
    return route.abort();
   });
   const page=await context.newPage(),errors=[];let accept=true;page.on('pageerror',error=>errors.push(error.message));page.on('dialog',async dialog=>accept?dialog.accept():dialog.dismiss());
   const host=mode==='preview'?'test.preview.c37.airoapp.ai':'flightops.invalid';
   await page.goto('http://'+host+'/foreflight.html?reconnect=expired');await page.getByText('PDF importing is available.',{exact:true}).waitFor();
   assert.equal(await page.locator('.reconnect-target').count(),1);assert.equal(await page.getByRole('button',{name:'Reconnect Old iPad',exact:true}).isDisabled(),true);checks+=2;
   const renew=page.getByRole('button',{name:'Reconnect This iPad',exact:true});
   accept=false;await renew.click();assert.equal(posts.length,0,'declining renewal makes no write');accept=true;
   await renew.click();await page.getByText('Reconnected. Keep the same Shortcut and key.',{exact:false}).waitFor();
   assert.deepEqual(posts,['/api/foreflight/connections/expired/reconnect']);assert.equal(await page.locator('#uploadKey').inputValue(),'','Reconnect never exposes/replaces a key');checks+=3;
   assert.equal(await page.getByText('Advanced manual setup',{exact:true}).evaluate(el=>el.parentElement.open),false);checks++;
   if(mode==='preview'){
    assert(await page.locator('#connect').isDisabled());assert(await page.locator('#installShortcut').isHidden());assert(await page.locator('#liveSetupLink').isVisible());checks+=3;
   }else{
    assert(await page.locator('#connect').isEnabled());await page.locator('#connect').click();await page.locator('#credentials').waitFor({state:'visible'});
    assert.equal(await page.locator('#uploadKey').inputValue(),key);await page.locator('#copyKey').click();assert.equal(await page.evaluate(()=>window.syntheticClipboard),key);checks+=2;
    if(mode==='live'){assert(await page.locator('#installShortcut').isVisible());assert.equal(await page.locator('#installShortcut').getAttribute('href'),template);assert(!template.includes(key));checks+=3;}
    else{assert(await page.locator('#installShortcut').isHidden());assert((await page.locator('#installerState').innerText()).includes('being finalized'));checks+=2;}
    await page.locator('#hideKey').click();assert.equal(await page.locator('#uploadKey').inputValue(),'');assert(await page.locator('#credentials').isHidden());checks+=2;
   }
   for(const width of [390,834,1194]){await page.setViewportSize({width,height:1194});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks++;}
   await page.waitForLoadState('networkidle');assert.deepEqual(errors,[]);await context.close();
  }
  console.log(`PASS ForeFlight installer/Reconnect UI: ${checks} checks; keyless Apple link, copy-once key, no action editing, renewal/cancel, revoked refusal, hidden manual setup, Preview separation, pending installer and responsive layout.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
