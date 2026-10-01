
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js?v=5.25.83",{scope:"/"});
    } catch(e) { console.warn("FlightOps service worker registration failed",e); }
  });
}

try{enableUppercaseEntry();updateManualWeatherStationLabels();syncToldRunwaySelectors();}catch(e){}

window.addEventListener("DOMContentLoaded",()=>{setTimeout(f9InitSeatMover,0)});

// v5.25.73 canonical Falcon 900 mission fallback/parity helpers
function f9SelectedMissionRunway(which){
  const sel=$(which==='DEP'?'f9mDepRunway':'f9mDestRunway');
  const id=String(sel?.value||'');
  const point=which==='DEP'?missionData?.dep:missionData?.dest;
  const arr=directionalRunwayOptions(point?.runways||[]);
  return arr.find(r=>String(r.runway_id||r.id||'')===id)||null;
}
function f9PopulateFallbackRunwayOptions(){
  const target=$('f9ManualRunwayTarget')?.value||'DEP', sel=$('f9ManualRunwayOption'); if(!sel)return;
  const point=target==='DEP'?missionData?.dep:missionData?.dest; const arr=directionalRunwayOptions(point?.runways||[]);
  sel.innerHTML='<option value="">MANUAL ENTRY</option>'+arr.map(r=>`<option value="${r.runway_id||r.id||''}">RWY ${r.runway_id||r.id||''} • ${Math.round(Number(r.length_ft||r.length||0)).toLocaleString()} ft</option>`).join('');
  f9FallbackRunwayChanged();
}
function f9FallbackRunwayChanged(){
  const target=$('f9ManualRunwayTarget')?.value||'DEP', val=$('f9ManualRunwayOption')?.value||'';
  const point=target==='DEP'?missionData?.dep:missionData?.dest; const arr=directionalRunwayOptions(point?.runways||[]); const r=arr.find(x=>String(x.runway_id||x.id||'')===val);
  if(!r)return;
  if($('f9ManualRunwayId')) $('f9ManualRunwayId').value=r.runway_id||r.id||'';
  if($('f9ManualRunwayLen')) $('f9ManualRunwayLen').value=Math.round(Number(r.length_ft||r.length||0))||'';
  if($('f9ManualRunwayHdg')) $('f9ManualRunwayHdg').value=Math.round(Number(r.heading||r.heading_deg||0))||'';
  if($('f9ManualRunwayWidth')) $('f9ManualRunwayWidth').value=Math.round(Number(r.width_ft||r.width||0))||'';
  if($('f9ManualRunwaySurface')) $('f9ManualRunwaySurface').value=r.surface||'';
}
function f9ProcessFallbackRunway(){
  const target=$('f9ManualRunwayTarget')?.value||'DEP'; const len=Number($('f9ManualRunwayLen')?.value||0); const hdg=Number($('f9ManualRunwayHdg')?.value||0);
  const point=target==='DEP'?missionData?.dep:missionData?.dest; const met=point?.metar||{}; const windDir=Number(met.wdir??met.wind_dir_degrees??NaN), windSpd=Number(met.wspd??met.wind_speed_kt??0);
  let hw=0,xw=0;if(Number.isFinite(windDir)&&Number.isFinite(hdg)){const a=(windDir-hdg)*Math.PI/180;hw=windSpd*Math.cos(a);xw=Math.abs(windSpd*Math.sin(a));}
  if($('f9FallbackWind')) $('f9FallbackWind').textContent=Number.isFinite(windDir)?`HW ${Math.max(0,hw).toFixed(1)} • TW ${Math.max(0,-hw).toFixed(1)} • XW ${xw.toFixed(1)} kt`:'Wind unavailable';
  const pa=target==='DEP'?Number($('f9mToPA')?.value):Number($('f9mLdgPA')?.value), oat=target==='DEP'?Number($('f9mToTemp')?.value):Number($('f9mLdgTemp')?.value);
  if($('f9FallbackWx')) $('f9FallbackWx').textContent=`PA ${Number.isFinite(pa)?Math.round(pa)+' ft':'—'} • OAT ${Number.isFinite(oat)?oat.toFixed(1)+'°C':'—'}`;
  const req=target==='DEP'?parseFloat(String($('f9mBFL')?.textContent||'').replace(/[^0-9.-]/g,'')):parseFloat(String($('f9mLdgRequired')?.textContent||'').replace(/[^0-9.-]/g,''));
  if($('f9FallbackField')) $('f9FallbackField').textContent=Number.isFinite(req)?`${Math.round(req).toLocaleString()} ft`:'—';
  if($('f9FallbackFieldNote')) $('f9FallbackFieldNote').textContent=target==='DEP'?'Calculated takeoff requirement.':'Calculated landing comparison.';
  const ok=len>0&&Number.isFinite(req)&&req<=len; if($('f9FallbackStatus')){ $('f9FallbackStatus').textContent=ok?'GO':'NOT EVALUATED'; $('f9FallbackStatus').className=ok?'ok':'bad';} if($('f9FallbackStatusBox')) $('f9FallbackStatusBox').className=ok?'wx ok':'wx bad';
  if($('f9FallbackStatusNote')) $('f9FallbackStatusNote').textContent=len>0&&Number.isFinite(req)?`Runway ${Math.round(len-req).toLocaleString()} ft ${ok?'remaining':'short'}.`:'Enter/select runway and obtain a source-valid performance result.';
}
function f9RenderCanonicalParityFields(){
  try{
    const dep=f9SelectedMissionRunway('DEP'), dest=f9SelectedMissionRunway('DEST');
    const dSel=$('f9mDepRunway'), aSel=$('f9mDestRunway');
    if($('f9DepRunwayCanonical')) $('f9DepRunwayCanonical').textContent=dSel?.selectedOptions?.[0]?.textContent||'—';
    if($('f9DestRunwayCanonical')) $('f9DestRunwayCanonical').textContent=aSel?.selectedOptions?.[0]?.textContent||'—';
    if($('f9DepPublishedCanonical')) $('f9DepPublishedCanonical').textContent=dep?`${Math.round(Number(dep.length_ft||dep.length||0)).toLocaleString()} ft`:'—';
    if($('f9DestPublishedCanonical')) $('f9DestPublishedCanonical').textContent=dest?`${Math.round(Number(dest.length_ft||dest.length||0)).toLocaleString()} ft`:'—';
    const depUs=$('f9mDepUsableDetail')?.textContent||'—', destUs=$('f9mDestUsableDetail')?.textContent||'—';
    if($('f9DepUsableCanonical')) $('f9DepUsableCanonical').textContent=(depUs.match(/[0-9,]+\s*ft/i)||[])[0]||'—';
    if($('f9DestUsableCanonical')) $('f9DestUsableCanonical').textContent=(destUs.match(/[0-9,]+\s*ft/i)||[])[0]||'—';
    if($('f9DepNotamStatusCanonical')) $('f9DepNotamStatusCanonical').textContent=(($('f9mDepNotamDetail')?.textContent||'').match(/CHECKED|UNAVAILABLE|NOT CHECKED/i)||['—'])[0].toUpperCase();
    if($('f9DestNotamStatusCanonical')) $('f9DestNotamStatusCanonical').textContent=(($('f9mDestNotamDetail')?.textContent||'').match(/CHECKED|UNAVAILABLE|NOT CHECKED/i)||['—'])[0].toUpperCase();
    if($('f9CanonicalTOW')) $('f9CanonicalTOW').value=Math.round(Number(window.f900bWBLatest?.tow||0))||'';
    const fob=Math.max(0,Number($('f9mFOB')?.value)||0),mission=Math.max(0,Number($('f9mMissionFuel')?.value)||0),taxi=Math.max(0,Number($('f9mTaxiFuel')?.value)||0);
    const wb=window.f900bWBLatest,landing=Number.isFinite(Number(wb?.ldgFuel))?Number(wb.ldgFuel):Math.max(0,fob-taxi-mission);
    f9Put('f9FuelCheckFOB',`${Math.round(fob).toLocaleString()} lb`);f9Put('f9FuelCheckMission',`${Math.round(mission).toLocaleString()} lb`);f9Put('f9FuelCheckTaxi',`${Math.round(taxi).toLocaleString()} lb`);f9Put('f9FuelCheckReserve',`${Math.round(landing).toLocaleString()} lb`);
    const fuelPlanOK=fob>0&&taxi>=0&&mission>=0&&(taxi+mission)<=fob;f9SetTone('f9FuelCheckStatus',fuelPlanOK?'SUFFICIENT':'CHECK FUEL PLAN',fuelPlanOK?'ok':'bad');
    f9PopulateFallbackRunwayOptions();
  }catch(e){}
}
