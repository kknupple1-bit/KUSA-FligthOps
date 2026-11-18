'use strict';
(()=>{
 const $=id=>document.getElementById(id),query=new URLSearchParams(location.search),iid=query.get('import');
 const status=t=>{$('status').textContent=t;};
 let readerReady=false,previewInstaller=false,installerReady=false;
 const updateConnect=()=>{$('connect').disabled=!readerReady||previewInstaller;};
 const appleTouch=/iPad|iPhone|iPod/i.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 for(const id of ['fob_lb','trip_lb','taxi_lb']){
  const input=$(id);input.setAttribute('inputmode','decimal');input.setAttribute('enterkeyhint','done');input.setAttribute('autocomplete','off');
  if(appleTouch){input.type='text';window.KUSANumberPad?.configure(input);}
 }
 async function api(url,method='GET',body){const r=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-FlightOps-Action':'foreflight'},...(body?{body:JSON.stringify(body)}:{})});const j=await r.json().catch(()=>({}));const messages={CONNECTION_REVOKED_CREATE_NEW:'This connection was revoked. Create a new connection and install the shortcut again.',CONNECTION_NOT_FOUND:'This connection is no longer available.',REVOKE_AN_OLD_CONNECTION:'Five connections are already active. Revoke an unused one before reconnecting.',AIRCRAFT_ACCESS_DENIED:'Your account needs aircraft upload access. Contact your Flight Department administrator.',AUTH_REQUIRED:'Sign in again before reconnecting.'};if(!r.ok||!j.ok)throw Error(j.message||messages[j.error]||j.error||'Connection failed. Sign in and try again.');return j;}
 function withPreview(path){const u=new URL(path,location.origin);if(query.get('airoShareToken'))u.searchParams.set('airoShareToken',query.get('airoShareToken'));return u;}
 function openMission(mid){location.assign(withPreview('/?foreflightMission='+encodeURIComponent(mid)));}
 async function installer(){
  const {installer:i}=await api('/api/foreflight/installer');previewInstaller=i.reason==='LIVE_SETUP_REQUIRED';installerReady=!!i.available;
  $('installShortcut').hidden=!i.available;if(i.available)$('installShortcut').href=i.url;
  $('installerState').textContent=i.available?'Ready-made shortcut available. Create a connection, copy its key and tap Install.':previewInstaller?'Use Live FlightOps to install the pilot shortcut. Preview connections are separate.':'The ready-made shortcut is being finalized. Existing pilots can reconnect below.';
  $('liveSetupLink').hidden=!previewInstaller;$('liveSetupLink').href=i.live_setup_url;updateConnect();
 }
 async function checkReader(){
  $('previewGateway').hidden=!location.hostname.includes('.preview.');
  for(let attempt=0;attempt<12;attempt++){
   const j=await api('/api/foreflight/reader-status');
   if(j.reader.status==='ready'){$('readerStatus').textContent='PDF importing is available.';readerReady=true;updateConnect();return;}
   if(j.reader.status!=='checking'){$('readerStatus').textContent='PDF importing is temporarily unavailable on this server. Keep your existing Shortcut and connection; no settings change is needed.';return;}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  $('readerStatus').textContent='The server is still checking PDF importing. Reload this page shortly.';
 }
 async function connections(){
  const j=await api('/api/foreflight/connections');$('connections').replaceChildren();let target;
  for(const c of j.connections){
   const div=document.createElement('div'),text=document.createElement('span'),reconnect=document.createElement('button'),revoke=document.createElement('button');
   div.id='connection-'+c.id;if(query.get('reconnect')===c.id){div.classList.add('reconnect-target');target=c;}
   text.textContent=`${c.label} — ${c.revoked_at?'revoked':new Date(c.expires_at)<=new Date()?'expired':'expires '+new Date(c.expires_at).toLocaleString()} `;
   reconnect.textContent='Reconnect';reconnect.disabled=!!c.revoked_at;reconnect.setAttribute('aria-label','Reconnect '+c.label);
   reconnect.onclick=async()=>{if(!confirm('Reconnect this iPad for up to seven days? Its existing Shortcut and key will keep working.'))return;reconnect.disabled=true;try{await api('/api/foreflight/connections/'+encodeURIComponent(c.id)+'/reconnect','POST');await connections();status('Reconnected. Keep the same Shortcut and key. Share the PDF again from ForeFlight.');}catch(e){status(e.message);reconnect.disabled=false;}};
   revoke.textContent='Revoke';revoke.disabled=!!c.revoked_at;revoke.setAttribute('aria-label','Revoke '+c.label);
   revoke.onclick=async()=>{if(!confirm('Revoke this iPad upload connection? Reconnect will not restore a revoked key.'))return;try{await api('/api/foreflight/connections/'+encodeURIComponent(c.id),'DELETE');await connections();}catch(e){status(e.message);}};
   div.append(text,reconnect,revoke);$('connections').append(div);
  }
  return target;
 }
 $('connect').onclick=async()=>{if(!confirm('Create a seven-day, upload-only connection for your iPad Shortcut? Anyone holding its key can submit PDFs as you, but cannot read missions or create trips.'))return;$('connect').disabled=true;try{const j=await api('/api/foreflight/connections','POST',{label:$('deviceLabel').value});$('uploadUrl').value=withPreview('/api/foreflight/upload').href;$('uploadKey').value=j.upload_key;$('expiry').textContent='Expires '+new Date(j.connection.expires_at).toLocaleString();$('credentials').hidden=false;await connections();status(installerReady?'Connection created. Copy your key, then tap Install Create KUSA Trip.':'Connection created. The ready-made shortcut is being finalized. Keep this key private.');}catch(e){status(e.message);}finally{updateConnect();}};
 for(const [button,input]of [['copyUrl','uploadUrl'],['copyKey','uploadKey']])$(button).onclick=async()=>{try{await navigator.clipboard.writeText($(input).value);status('Copied to your clipboard. Paste only into your own Shortcut.');}catch{status('Clipboard unavailable. Select and copy the field on this iPad.');}};
 $('hideKey').onclick=()=>{$('uploadKey').value='';$('credentials').hidden=true;};
 let importData;
 $('aircraft').onchange=()=>{$('defaults').textContent=$('aircraft').selectedOptions[0]?.textContent.includes('N699BG')?'New trip starts with 170 / 170 lb crew. Review actual loading.':'New trip starts with 190 / 190 lb crew. Review actual loading.';};
 $('tripForm').onsubmit=async event=>{event.preventDefault();$('createTrip').disabled=true;try{const body={aircraft_id:$('aircraft').value,date:$('date').value,reviewed:$('reviewed').checked};for(const k of ['departure','destination','alternate'])body[k]=$(k).value.trim().toUpperCase();for(const k of ['fob_lb','trip_lb','taxi_lb']){if($(k).value==='')throw Error('Enter the missing fuel values in pounds.');body[k]=Number($(k).value);}const j=await api('/api/foreflight/imports/'+encodeURIComponent(iid)+'/create','POST',body);openMission(j.mission_id);}catch(e){status(e.message);$('createTrip').disabled=false;}};
 (async()=>{try{
  if(!iid){$('setup').hidden=false;await installer();const target=await connections();status(query.get('reconnect')?(target?(target.revoked_at?'This connection was revoked. Create a new connection and install the shortcut again.':'Sign-in complete. Tap Reconnect on the highlighted iPad connection, then share the PDF again.'):'This connection is not listed for this account. Sign in with the account used to set up this iPad.'):'Signed in. Set up Create KUSA Trip on this iPad.');await checkReader();return;}
  const j=await api('/api/foreflight/imports/'+encodeURIComponent(iid));importData=j.import;$('review').hidden=false;
  $('source').textContent=`ForeFlight PDF • ${importData.pages} page(s) • received ${new Date(importData.created_at).toLocaleString()}`;
  $('warnings').textContent=importData.warnings.join(' ');
  for(const [k,v]of Object.entries(importData.fields)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=k.replaceAll('_',' ');dd.textContent=`${v??'Not found — enter after review'} (${importData.evidence[k]})`;$('evidence').append(dt,dd);}
  for(const a of j.aircraft){if(importData.fields.registration&&a.registration!==importData.fields.registration)continue;const option=document.createElement('option');option.value=a.id;option.textContent=a.registration+' • '+a.model;$('aircraft').append(option);}
  for(const k of ['date','departure','destination','alternate','fob_lb','trip_lb','taxi_lb'])$(k).value=importData.fields[k]??(k==='taxi_lb'?200:'');
  if(importData.fields.taxi_lb===null)$('evidence').append(Object.assign(document.createElement('p'),{textContent:'Taxi burn 200 lb is the configured aircraft default, not extracted from this PDF. Confirm or change it.'}));
  $('aircraft').dispatchEvent(new Event('change'));
  if(!j.aircraft.length||!$('aircraft').options.length){$('createTrip').disabled=true;status('No matching authorized aircraft. Check your assignment and the tail number on the PDF.');return;}
  if(importData.mission_id){$('tripForm').hidden=true;$('existing').hidden=false;$('existing').href=withPreview('/?foreflightMission='+encodeURIComponent(importData.mission_id));status('This PDF already has a trip. Re-sharing will not create a duplicate.');}
  else status('Review the extracted details. No trip has been created and no pilot review is recorded.');
 }catch(e){status(e.message);}})();
})();
