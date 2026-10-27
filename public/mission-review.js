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
 const checked=report.status==='CHECKED',closed=checked&&report.runway_state==='CLOSED',restricted=checked&&report.runway_state==='RESTRICTED';
 el.textContent=closed?'CHECKED • CLOSED':restricted?'CHECKED • RESTRICTED':checked?'CHECKED':report.status==='UNAVAILABLE'?'NOT AVAILABLE':report.status==='CHECKING'?'CHECKING…':'NOT CHECKED';
 el.className=closed?'bad':checked&&!restricted?'ok':'warn';
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
    const note=document.createElement('p');note.className='small';note.textContent='This check applies to the selected airport and runway. CHECKED means data was retrieved; review all notices and runway restrictions below. Opening this panel does not complete the check.';body.prepend(note);
   }
  });
 }
}
installMissionGateReviews();
