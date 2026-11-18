'use strict';
(()=>{
 const $=id=>document.getElementById(id),query=new URLSearchParams(location.search),iid=query.get('import');
 const status=t=>{$('status').textContent=t;};
 async function api(url,method='GET',body){const r=await fetch(url,{method,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-FlightOps-Action':'foreflight'},...(body?{body:JSON.stringify(body)}:{})});const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw Error(j.error||'Connection failed. Sign in and try again.');return j;}
 function withPreview(path){const u=new URL(path,location.origin);if(query.get('airoShareToken'))u.searchParams.set('airoShareToken',query.get('airoShareToken'));return u;}
 function openMission(mid){location.assign(withPreview('/?foreflightMission='+encodeURIComponent(mid)));}
 async function checkReader(){
  $('previewGateway').hidden=!location.hostname.includes('.preview.');
  for(let attempt=0;attempt<12;attempt++){
   const j=await api('/api/foreflight/reader-status');
   if(j.reader.status==='ready'){$('readerStatus').textContent='PDF importing is available.';$('connect').disabled=false;return;}
   if(j.reader.status!=='checking'){$('readerStatus').textContent='PDF importing is temporarily unavailable on this server. Keep your existing Shortcut and connection; no settings change is needed.';return;}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  $('readerStatus').textContent='The server is still checking PDF importing. Reload this page shortly.';
 }
 async function connections(){const j=await api('/api/foreflight/connections');$('connections').replaceChildren();for(const c of j.connections){const div=document.createElement('div'),text=document.createElement('span'),button=document.createElement('button');text.textContent=`${c.label} — ${c.revoked_at?'revoked':new Date(c.expires_at)<=new Date()?'expired':'expires '+new Date(c.expires_at).toLocaleString()} `;button.textContent='Revoke';button.disabled=!!c.revoked_at;button.onclick=async()=>{if(!confirm('Revoke this iPad upload connection?'))return;try{await api('/api/foreflight/connections/'+encodeURIComponent(c.id),'DELETE');await connections();}catch(e){status(e.message);}};div.append(text,button);$('connections').append(div);}}
 $('connect').onclick=async()=>{if(!confirm('Create a seven-day, upload-only connection for your iPad Shortcut? Anyone holding its key can submit PDFs as you, but cannot read missions or create trips.'))return;$('connect').disabled=true;try{const j=await api('/api/foreflight/connections','POST',{label:$('deviceLabel').value});$('uploadUrl').value=withPreview('/api/foreflight/upload').href;$('uploadKey').value=j.upload_key;$('expiry').textContent='Expires '+new Date(j.connection.expires_at).toLocaleString();$('credentials').hidden=false;await connections();status('Connection created. Complete the one-time Shortcut setup below.');}catch(e){status(e.message);}finally{$('connect').disabled=false;}};
 for(const [button,input]of [['copyUrl','uploadUrl'],['copyKey','uploadKey']])$(button).onclick=async()=>{try{await navigator.clipboard.writeText($(input).value);status('Copied to your clipboard. Paste only into your own Shortcut.');}catch{status('Clipboard unavailable. Select and copy the field on this iPad.');}};
 $('hideKey').onclick=()=>{$('uploadKey').value='';$('credentials').hidden=true;};
 let importData;
 $('aircraft').onchange=()=>{$('defaults').textContent=$('aircraft').selectedOptions[0]?.textContent.includes('N699BG')?'New trip starts with 170 / 170 lb crew. Review actual loading.':'New trip starts with 190 / 190 lb crew. Review actual loading.';};
 $('tripForm').onsubmit=async event=>{event.preventDefault();$('createTrip').disabled=true;try{const body={aircraft_id:$('aircraft').value,date:$('date').value,reviewed:$('reviewed').checked};for(const k of ['departure','destination','alternate'])body[k]=$(k).value.trim().toUpperCase();for(const k of ['fob_lb','trip_lb','taxi_lb']){if($(k).value==='')throw Error('Enter the missing fuel values in pounds.');body[k]=Number($(k).value);}const j=await api('/api/foreflight/imports/'+encodeURIComponent(iid)+'/create','POST',body);openMission(j.mission_id);}catch(e){status(e.message);$('createTrip').disabled=false;}};
 (async()=>{try{
  if(!iid){$('setup').hidden=false;await connections();status('Signed in. Set up Create KUSA Trip on this iPad.');await checkReader();return;}
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
