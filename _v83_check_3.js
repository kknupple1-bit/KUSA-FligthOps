
(function(){
 function el(id){return document.getElementById(id)}
 function read(id){const x=el(id); if(!x)return '—'; if(x.tagName==='SELECT'){const o=x.options[x.selectedIndex]; return (o&&o.textContent||x.value||'—').trim()} if('value' in x && x.tagName!=='B' && x.tagName!=='SPAN' && x.tagName!=='TD'){return String(x.value||'—').trim()} return String(x.textContent||'—').trim()}
 function put(id,v,suffix=''){const x=el(id); if(x)x.textContent=(v&&v!=='—')?v+suffix:'—'}
 function sync(){
  put('f50CanonDepNotam',read('depNotamStatus')); put('f50CanonDestNotam',read('notamStatus'));
  put('f50CanonToConfig',read('toConfig')); put('f50CanonToAI',read('toAntiIce')); put('f50CanonToSurface',read('toRunwayCondition')); put('f50CanonToRunway',read('depNotamRunwaySelect'));
  put('f50CanonTOW',read('perfTOW'),' lb'); put('f50CanonBFL',read('perfBFL'),' ft'); put('f50CanonV1',read('perfV1'),' kt'); put('f50CanonVR',read('perfVR'),' kt'); put('f50CanonGrad',read('perfGrad'),'%'); put('f50CanonToMargin',read('toRwyMargin')); put('f50CanonToStatus',read('toStatus'));
  put('f50CanonLdgConfig',read('landConfig')); put('f50CanonLdgAI',read('landAntiIce')); put('f50CanonLdgSurface',read('landRunwayCondition')); put('f50CanonLdgRunway',read('destNotamRunwaySelect')); put('f50CanonLDW',read('landWt'),' lb'); put('f50CanonLFL',read('landFieldLen'),' ft'); put('f50CanonVREF',read('landVref'),' kt'); put('f50CanonLdgMargin',read('landRwyMargin')); put('f50CanonLdgStatus',read('landStatus'));
  put('f9CanonDepNotam',read('f9DepNotamStatusCanonical')); put('f9CanonDestNotam',read('f9DestNotamStatusCanonical'));
  put('f9CanonToConfig',read('f9mToConfig')); put('f9CanonToAI',read('f9mToAI')); put('f9CanonToSurface',read('f9mToSurface')); put('f9CanonToRunway',read('f9DepRunwayCanonical')); put('f9CanonTOW',read('f9CalcTOW')); put('f9CanonBFL',read('f9pBFL')!=='—'?read('f9pBFL'):read('f9mBFL')); put('f9CanonV1',read('f9pV1')); put('f9CanonVR',read('f9pVR')); put('f9CanonGrad',read('f9mGCLB2')); put('f9CanonToMargin',read('f9mToMargin')); put('f9CanonToStatus',read('f9mToStatus'));
  put('f9CanonLdgConfig',read('f9mAbnormalConfigSummary')!=='—'?read('f9mAbnormalConfigSummary'):'40° Flaps + Slats'); put('f9CanonLdgAI',read('f9mLdgAI')); put('f9CanonLdgSurface','DRY / SOURCE'); put('f9CanonLdgRunway',read('f9DestRunwayCanonical')); put('f9CanonLDW',read('f9sLDW')); put('f9CanonLFL',read('f9mLdgRequired')); put('f9CanonVREF',read('f9mLdgVref')); put('f9CanonLdgMargin',read('f9mLdgMargin')); put('f9CanonLdgStatus',read('f9mLdgStatus'));
 }
 document.addEventListener('DOMContentLoaded',()=>{sync();setInterval(sync,500)}); document.addEventListener('input',()=>setTimeout(sync,0)); document.addEventListener('change',()=>setTimeout(sync,0));
})();
try{installF50PilotReviewPanel();}catch(e){}
