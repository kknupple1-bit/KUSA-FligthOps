'use strict';
// Navigation opens the review only. Existing evaluation functions control status.
function openMissionGateReview(aircraft,kind){
 const detail=document.getElementById(aircraft+'Review_'+kind);
 if(!detail)return;
 detail.open=true;
 detail.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 detail.querySelector('summary').focus({preventScroll:true});
}
function syncMissionNotamGate(id,which){
 const el=document.getElementById(id);if(!el)return;
 const report=which==='dep'?departureNotams:currentNotams;
 const checked=report.status==='CHECKED',closed=checked&&report.runway_state==='CLOSED';
 const reviewed=checked&&missionNotamReviewed(which),unresolved=checked&&report.runway_state==='RESTRICTED'&&!Number.isFinite(report.usable_length_ft);
 el.textContent=closed?'CHECKED • CLOSED':unresolved?'RESTRICTION UNRESOLVED':reviewed?'REVIEWED':checked?'PILOT REVIEW REQUIRED':report.status==='UNAVAILABLE'?'NOT AVAILABLE':report.status==='CHECKING'?'CHECKING…':'NOT CHECKED';
 el.className=closed?'bad':reviewed&&!unresolved?'ok':'warn';
}
// Acknowledgments are never taken from another pilot's mission payload.
const individualMissionReviews=new Map();
function missionNotamContext(which){
 const report=which==='dep'?departureNotams:currentNotams;
 const runway=selectedRunwayObj(which);
 return {mission_id:window.currentMissionMeta?.id,airport:cleanICAO($(which==='dep'?'dep':'dest')?.value||''),
  runway:runway?.runway_id||null,checked_at:report.checked_at,status:report.status,
  runway_state:report.runway_state,usable_length_ft:report.usable_length_ft,
  items:report.items||[],obstacle_items:which==='dep'?(departureObstacleReview?.items||[]):[],
  inputs:Object.fromEntries(['captWt','foWt','fuel','taxiFuel','missionFuel','toConfig','toAntiIce','toRunwayCondition','f9mCaptainWt','f9mFOWt','f9mFOB','f9mTaxiFuel','f9mMissionFuel','f9mToConfig','f9mToAI','f9mToSurface'].map(id=>[id,$(id)?.value]))};
}
function individualReviewKey(kind,context){return JSON.stringify([cloudSyncUser?.id,kind,context]);}
function currentIndividualReview(kind,context){
 const review=individualMissionReviews.get(individualReviewKey(kind,context));
 const record=findLocalMissionRecord(window.currentMissionMeta?.id);
 return review&&review.user_id===cloudSyncUser?.id&&review.revision===record?.server_revision?review:null;
}
function individualObstacleDisposition(){return !!currentIndividualReview('obstacle_review',missionNotamContext('dep'));}
function missionPilotContext(){return {departure:missionNotamContext('dep'),destination:missionNotamContext('dest')};}
function missionNotamReviewed(which){
 const report=which==='dep'?departureNotams:currentNotams;
 if(report.status!=='CHECKED'||report.runway_state==='CLOSED'||(report.runway_state==='RESTRICTED'&&!Number.isFinite(report.usable_length_ft)))return false;
 return !!currentIndividualReview(which==='dep'?'departure_notam':'destination_notam',missionNotamContext(which));
}
function missionReviewSyncError(record){
 if(!record)return 'The active mission was not found in local drafts. Reopen the saved mission before recording review.';
 const state=record.server_sync_state,detail=String(record.server_sync_error||'');
 if(state==='conflict')return 'A newer shared mission revision conflicts with this local copy. Open Flight Plans, preserve/download your local recovery copy and reconcile the latest shared revision before reviewing.';
 if(state==='auth_required')return 'Cloud session expired. Sign in to your FlightOps account, then retry the mission review.';
 if(state==='wrong_account')return 'This mission belongs to a different signed-in account. Use an authorized aircraft account before recording review.';
 if(record.server_permissions?.write===false)return 'Your account has read-only access to this mission. An authorized aircraft pilot or manager must record this review.';
 if(!record.server_mission_id)return 'The mission has not been created in the shared cloud workspace. Local data is retained. Check cloud sync status and retry after upload succeeds'+(detail?' ('+detail+')':'')+'.';
 if(state==='queued'||state==='queued_offline')return 'Mission changes are still awaiting cloud synchronization. Local data is retained. Check network/server sync and retry'+(detail?' ('+detail+')':'')+'.';
 return 'Mission review requires the current cloud-synced mission revision. Sync status: '+String(state||'unknown')+(detail?' ('+detail+')':'')+'.';
}
function missionReviewCurrentContext(kind){
 return kind==='pilot_review'?missionPilotContext():missionNotamContext(kind==='destination_notam'?'dest':'dep');
}
async function recordIndividualSignoff(kind,outcome,context){
 if(!navigator.onLine)throw new Error('Reconnect to record your individual review.');
 await ensureCloudSyncUser(true);
 const activeId=window.currentMissionMeta?.id;
 if(!activeId)throw new Error('Open a saved mission before recording review.');
 if(typeof draftSaveTimer!=='undefined')clearTimeout(draftSaveTimer);
 saveCurrentDraft();await flushMissionSyncQueue();
 const record=findLocalMissionRecord(activeId);
 if(window.currentMissionMeta?.id!==activeId)throw new Error('The active mission changed during synchronization. Reopen the intended mission.');
 if(!record?.server_mission_id||record.server_sync_state!=='synced')throw new Error(missionReviewSyncError(record));
 if(!Number.isInteger(record.server_revision))throw new Error('Cloud mission revision is missing. Refresh the shared mission before recording review.');
 if(JSON.stringify(context)!==JSON.stringify(missionReviewCurrentContext(kind)))throw new Error('Mission data or runway changed before recording. Review the current plan again.');
 const response=await fetch(`/api/missions/${encodeURIComponent(record.server_mission_id)}/signoffs`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({expected_revision:record.server_revision,kind,outcome,context})});
 const body=await response.json().catch(()=>({}));
 if(!response.ok){
  if(response.status===409||body.error==='REVISION_CONFLICT')throw new Error('The shared mission was changed by another session. Reopen the latest revision and review again; no signoff was recorded.');
  throw new Error(body.error||'Review could not be recorded (HTTP '+response.status+').');
 }
 if(JSON.stringify(context)!==JSON.stringify(missionReviewCurrentContext(kind)))throw new Error('Mission data or runway changed while review was being recorded. Reopen the current plan and record a fresh review.');
 updateLocalMissionRecord(record.id,{server_signoffs:body.mission.signoffs});
 const own=body.mission.signoffs.filter(s=>s.user_id===cloudSyncUser.id&&s.kind===kind&&s.revision===record.server_revision).at(-1);
 if(!own)throw new Error('Server did not return an individual review for your account and mission revision.');
 individualMissionReviews.set(individualReviewKey(kind,context),own);
 return body.mission;
}
async function recordMissionPilotReview(){
 const restricted=[departureNotams,currentNotams].some(r=>r.status!=='CHECKED'||r.runway_state==='CLOSED'||r.runway_state==='RESTRICTED');
 try{await recordIndividualSignoff('pilot_review',restricted?'reviewed_restriction':'reviewed_no_conflict',missionPilotContext());alert('Your mission review was recorded for this revision. All operational gates remain in effect.');}
 catch(e){alert('Mission review was not recorded: '+e.message);}
}
function showMissionReviewHistory(){
 const record=findLocalMissionRecord(window.currentMissionMeta?.id);
 const reviews=record?.server_signoffs||[];
 alert(reviews.length?reviews.map(s=>`${s.display_name} • ${new Date(s.created_at).toLocaleString()} • revision ${s.revision}${s.revision===record.server_revision?' (current)':' (earlier)'} • ${s.kind} • ${s.outcome}`).join('\n'):'No individual pilot reviews recorded for this plan.');
}
async function acknowledgeMissionNotams(which){
 const report=which==='dep'?departureNotams:currentNotams;
 const context=missionNotamContext(which);
 if(report.status!=='CHECKED'||!context.runway){alert('Retrieve current NOTAMs and select a runway before review.');return;}
 const hardStop=report.runway_state==='CLOSED'||(report.runway_state==='RESTRICTED'&&!Number.isFinite(report.usable_length_ft));
 try{
  await recordIndividualSignoff(which==='dep'?'departure_notam':'destination_notam',hardStop?'reviewed_restriction':'reviewed_no_conflict',context);
  if(hardStop)alert('Review recorded. The runway closure or unresolved restriction remains blocking.');
  updateDepartureRunwayAssessment();syncTakeoffSection();updateToldCard();
  if(window.currentMissionMeta?.aircraft==='F900B'){f9UpdateOperationalGate();f9RenderCanonicalParityFields();}
  for(const aircraft of ['f50','f9'])syncMissionNotamGate(aircraft+'Canon'+(which==='dep'?'Dep':'Dest')+'Notam',which);
  classifyOperationalGates();
 }catch(e){alert('Review was not cleared: '+e.message);}
}
async function evaluateMissionNotams(aircraft,which){
 const detail=document.getElementById(aircraft+'Review_'+which),button=detail?.querySelector('button');
 if(button){button.disabled=true;button.textContent='Checking…';}
 try{
  if(aircraft==='f9')syncF900BMissionToTOLD();
  if(which==='dep')await refreshDepartureNotams(true);else await refreshNotams();
  if(aircraft==='f9'){await refreshF900BMission();f9RenderMissionParity();f9RenderCanonicalParityFields();}
 }finally{if(button){button.disabled=false;button.textContent='Refresh / Evaluate NOTAMs';}classifyOperationalGates();}
}
function installMissionGateReviews(){
 document.querySelectorAll('.source-verification-card .source-gate').forEach(gate=>gate.dataset.reviewKind='source');
 for(const aircraft of ['f50','f9']){
  const card=document.getElementById(aircraft==='f50'?'f50CanonicalPerformanceCard':'f9CanonicalPerformanceCard');if(!card||card.dataset.reviewsInstalled)return;
  card.dataset.reviewsInstalled='true';
  const gates=[...card.querySelector('.canonical-perf-source').children];
  const group=document.createElement('div');group.className='mission-gate-reviews';
  card.querySelector('.canonical-perf-source').after(group);
  const sign=document.createElement('button');sign.type='button';sign.textContent='Record my mission review';sign.addEventListener('click',recordMissionPilotReview);group.append(sign);
  const history=document.createElement('button');history.type='button';history.textContent='View pilot review history';history.addEventListener('click',showMissionReviewHistory);group.append(history);
  const sources=aircraft==='f50'?['Falcon 50-4 AFMS / DTM813 takeoff source package','Falcon 50 DTM813 landing source package']:['Falcon 900B QRH1 Rev02 + DTM9823 takeoff source package','Falcon 900B QRH1 landing source package'];
  ['takeoff','landing','dep','dest'].forEach((kind,index)=>{
   const gate=gates[index],title=gate.querySelector('.small').textContent;
   gate.dataset.reviewKind=index<2?'source':'notam';gate.classList.add('mission-review-link');gate.tabIndex=0;gate.setAttribute('role','button');
   gate.setAttribute('aria-controls',aircraft+'Review_'+kind);gate.setAttribute('aria-label',title+' — open review');
   gate.addEventListener('click',()=>openMissionGateReview(aircraft,kind));
   gate.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openMissionGateReview(aircraft,kind);}});
   const action=document.createElement('span');action.className='small gate-action';action.textContent=index<2?'View source →':'Review / Evaluate →';gate.append(action);
   const detail=document.createElement('details');detail.className='mission-gate-review';detail.id=aircraft+'Review_'+kind;
   const summary=document.createElement('summary');summary.textContent=title+' — review details';summary.tabIndex=0;detail.append(summary);
   const body=document.createElement('div');body.className='mission-gate-review-body';detail.append(body);group.append(detail);
   if(index<2){
    const reference=document.createElement('p');reference.textContent=sources[index]+'.';body.append(reference);
    const note=document.createElement('p');note.textContent='SOURCE VERIFIED confirms the reference package is loaded. It does not clear runway availability, NOTAMs, weather, loading, or the mission. Review the selected configuration and calculated results in section 7 and TOLD. Missing or source-bounded results remain unavailable.';body.append(note);
   }else{
    const panel=document.getElementById(aircraft==='f50'?(kind==='dep'?'missionDepartureRunwayReview':'missionDestinationRunwayReview'):(kind==='dep'?'f9MissionDepartureRunwayReview':'f9MissionDestinationRunwayReview'));
    if(panel){body.append(panel);const refresh=panel.querySelector('button');if(refresh){refresh.removeAttribute('onclick');refresh.textContent='Refresh / Evaluate NOTAMs';refresh.addEventListener('click',()=>evaluateMissionNotams(aircraft,kind));}}
    const acknowledge=document.createElement('button');acknowledge.type='button';acknowledge.textContent='Record my NOTAM review';acknowledge.addEventListener('click',()=>acknowledgeMissionNotams(kind));body.append(acknowledge);
    const personal=document.createElement('p');personal.className='small';personal.textContent='Your review is recorded with your name, time, mission revision, selected runway and current notices. New notices or a runway change require a new review. Closures, unresolved restrictions and performance limits remain in effect.';body.append(personal);
    const note=document.createElement('p');note.className='small';note.textContent='This check applies to the selected airport and runway. CHECKED means data was retrieved; review all notices and runway restrictions below. Opening this panel does not complete the check.';body.prepend(note);
   }
  });
 }
}
installMissionGateReviews();
