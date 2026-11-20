'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{webkit}=require('playwright');
(async()=>{const browser=await webkit.launch({headless:true});let checks=0;
try{for(const mode of ['ready','missing','preview']){
 const context=await browser.newContext(),posts=[];let send='uncertain';
 await context.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.pathname==='/admin-users.html')return route.fulfill({contentType:'text/html',body:fs.readFileSync('public/admin-users.html','utf8')});
 let j={},status=200;if(u.pathname==='/api/me')j={user:{id:'test-admin'},aircraft:[{id:'a',organization_id:'dept',registration:'N33AP',model:'Falcon 50'},{id:'b',organization_id:'dept',registration:'N699BG',model:'Falcon 900B'}]};
 else if(u.pathname==='/api/admin/users')j={organizations:[{organization_id:'dept',name:'Test department',role:'administrator'}],users:[]};
 else if(u.pathname==='/api/admin/invitation-mail')j={mail:{configured:mode==='ready',from:'kusa@kusaaviation.com',reason:mode==='preview'?'PREVIEW_EMAIL_DISABLED':null}};
 else if(u.pathname==='/api/admin/invitations'){posts.push({body:req.postDataJSON(),headers:req.headers()});status=send==='uncertain'?502:200;j={ok:send==='accepted',delivery:{status:send},message:send==='accepted'?'Microsoft 365 accepted the invitation for sending. Final delivery is not yet confirmed.':'The email service did not confirm the result. Check the recipient or Sent Items before sending another invitation.'};}
 else j={audit:[]};return route.fulfill({status,contentType:'application/json',body:JSON.stringify(j)});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:834,height:1100});await page.goto('https://flightops.invalid/admin-users.html');await page.getByText('Administrator authorization verified.',{exact:true}).waitFor();
 if(mode==='ready'){
  await page.getByLabel('Email',{exact:true}).fill('test-pilot@example.invalid');await page.getByRole('button',{name:'Send invitation',exact:true}).click();await page.getByText('The email service did not confirm the result.',{exact:false}).waitFor();assert.equal(posts.length,1);assert.equal(posts[0].headers['x-flightops-action'],'invitation');assert.equal(posts[0].body.delivery,'email');checks+=3;
  send='accepted';await page.getByRole('button',{name:'Check send status',exact:true}).click();await page.getByText('Microsoft 365 accepted the invitation for sending.',{exact:false}).waitFor();assert.equal(posts.length,2);assert.equal(posts[0].body.request_id,posts[1].body.request_id);assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'');assert(!(await page.locator('#inviteResult').innerText()).includes('token='));checks+=4;
 }else{assert(await page.getByRole('button',{name:'Send invitation',exact:true}).isDisabled());assert.equal(posts.length,0);checks+=2;}
 for(const width of [390,768,834,1194,1440]){await page.setViewportSize({width,height:1100});const v=await page.evaluate(()=>{const r=document.getElementById('inviteEmail').getBoundingClientRect(),g=document.querySelector('.invitation-grid').getBoundingClientRect();return {width:r.width,inside:r.left>=g.left&&r.right<=g.right+1,overflow:document.documentElement.scrollWidth>innerWidth};});assert(v.inside&&!v.overflow);if(width===834)assert(v.width>=650);checks++;if(width===834&&mode==='ready'&&process.env.FLIGHTOPS_UI_PROOF)await page.screenshot({path:process.env.FLIGHTOPS_UI_PROOF,fullPage:true});}
 assert.deepEqual(errors,[]);await context.close();
}console.log('PASS Admin invitation UI: '+checks+' send/retry/disabled-state and responsive checks; mocked mail only.');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
