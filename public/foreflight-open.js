'use strict';
window.addEventListener('load',async()=>{
 const q=new URLSearchParams(location.search),mid=q.get('foreflightMission');
 if(q.get('airoShareToken'))for(const link of document.querySelectorAll('a[href="/foreflight.html"]')){const u=new URL(link.href);u.searchParams.set('airoShareToken',q.get('airoShareToken'));link.href=u.href;}
 if(!mid)return;
 try{
  if(!/^mis_[a-f0-9]+$/.test(mid))throw Error('Invalid incoming trip link.');
  await ensureCloudSyncUser();await hydrateCloudDrafts({render:true});
  const ix=getMissionDrafts().findIndex(r=>r.server_mission_id===mid);
  if(ix<0)throw Error('Trip is unavailable. Check the signed-in account and aircraft assignment.');
  const r=getMissionDrafts()[ix];if(r.server_sync_state==='conflict'||r.server_sync_state==='pending')throw Error('This trip has local changes. Open Flight Plans to resolve them before loading the incoming trip.');
  await openDraftFlightPlan(ix);q.delete('foreflightMission');history.replaceState(null,'',location.pathname+(q.size?'?'+q:'')+location.hash);
 }catch(e){alert('Incoming ForeFlight trip was not opened: '+e.message);}
});
