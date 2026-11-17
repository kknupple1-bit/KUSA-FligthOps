'use strict';
// Conservative extraction: absent/conflicting fields remain empty for pilot review.
function extractPlan(text) {
  if(typeof text!=='string'||text.length>120000)throw Error('DOCUMENT_TEXT_LIMIT');
  const source=text.replace(/\r/g,'').replace(/[\u00a0\t]+/g,' ');
  if(!/foreflight|nav\s*log|navigation\s*log|\(\s*FPL-/i.test(source))throw Error('NOT_A_FLIGHT_PLAN_DOCUMENT');
  const warnings=[],fields={},evidence={},candidates={};
  function put(name,values,label){
    candidates[name]=[...(candidates[name]||[]),...values];
    const unique=[...new Set(candidates[name].filter(v=>v!==null&&v!==undefined&&v!==''))];
    fields[name]=unique.length===1?unique[0]:null;
    evidence[name]=unique.length===1?label:unique.length>1?'Conflicting values':'Not found';
    if(unique.length>1)warnings.push(`Conflicting ${name.replaceAll('_',' ')}; enter it after checking the PDF.`);
  }
  const matches=re=>[...source.matchAll(re)].map(m=>m[1].trim());
  const headers=[...source.matchAll(/(?:^|\n)\s*([A-Z]{4})\s*(?:[–—-]|to)\s*([A-Z]{4})\s*\(([^)\n]{1,80})\)\s+in\s+(N[0-9][A-Z0-9]{0,5})\b/gi)];
  put('registration',matches(/\b(?:Aircraft(?:\s+(?:ID|Identification|Registration))?|Registration|Tail(?:\s+Number)?)\s*[:#]?\s*(N[0-9][A-Z0-9]{0,5})\b/gi).concat(matches(/\(\s*FPL-([A-Z0-9]{2,7})-/g),headers.map(m=>m[4])).map(v=>v.toUpperCase()),'Aircraft / Navlog header / ICAO flight plan');
  for(const [name,label] of [['departure','Departure|Origin|From'],['destination','Destination|To'],['alternate','Alternate(?:\s+1)?']])
    put(name,matches(new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*[:]?\\s*([A-Z]{4})\\b`,'gi')).map(v=>v.toUpperCase()),'Labeled airport');
  if(headers.length){put('departure',headers.map(m=>m[1].toUpperCase()),'Navlog route/date/tail header');put('destination',headers.map(m=>m[2].toUpperCase()),'Navlog route/date/tail header');}
  // ICAO message fields are extracted only from a complete FPL message.
  const messages=source.match(/\(\s*FPL-[\s\S]*?\)/g)||[];
  const dep=[],dest=[],alt=[],dof=[];
  for(const msg of messages){
    const parts=msg.replace(/\s+/g,' ').split('-').map(v=>v.trim());
    if(parts.length>=8){
      const d=parts[5]?.match(/^([A-Z]{4})\d{4}\b/),a=parts[7]?.match(/^([A-Z]{4})\d{4}(?:\s+([A-Z]{4}))?/);
      if(d)dep.push(d[1]);if(a){dest.push(a[1]);if(a[2])alt.push(a[2]);}
    }
    for(const m of msg.matchAll(/\bDOF\/(\d{6})\b/g))dof.push(`20${m[1].slice(0,2)}-${m[1].slice(2,4)}-${m[1].slice(4)}`);
  }
  for(const [name,values]of [['departure',dep],['destination',dest],['alternate',alt]])if(values.length)put(name,[fields[name],...values],'Labeled airport / ICAO message');
  const monthNames=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const headerDates=headers.flatMap(h=>{const m=h[3].match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s|$)/);if(!m)return [];const month=monthNames.indexOf(m[1].slice(0,3).toLowerCase())+1;return month?[`${m[3]}-${String(month).padStart(2,'0')}-${m[2].padStart(2,'0')}`]:[];});
  put('date',matches(/(?:^|\n)\s*(?:Flight Date|Date|Departure Date)\s*:?\s*(\d{4}-\d{2}-\d{2})\b/gi).concat(dof,headerDates),'Navlog date / ISO date / ICAO DOF (verify local trip date)');
  if(fields.date&&!validDate(fields.date)){fields.date=null;evidence.date='Invalid date';}
  for(const [name,label] of [['fob_lb','Ramp Fuel|Fuel on Board|FOB'],['block_fuel_lb','Block Fuel'],['trip_lb','Flight Fuel|Trip Fuel(?: Burn)?'],['taxi_lb','Taxi Fuel|Taxi Burn']]){
    const pattern=new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*:?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)\\s*(?:lb|lbs|pounds)\\b`,'gi');
    put(name,matches(pattern).map(v=>Number(v.replaceAll(',',''))),'Explicitly labeled pounds; verify fuel definition');
  }
  put('route',matches(/(?:^|\n)\s*Route\s*:\s*([^\n]{1,500})/gi),'Labeled route');
  warnings.push('Check every field against the ForeFlight PDF. Dates may be UTC; confirm the intended local trip date.');
  warnings.push('FOB is ramp fuel. Trip burn excludes taxi, reserves and fuel remaining at landing. Confirm the ForeFlight fuel definitions before creating the trip.');
  if(fields.block_fuel_lb!==null)warnings.push('ForeFlight Block Fuel is reference only and is NOT automatically treated as ramp FOB. Enter/confirm actual ramp fuel, including the separate taxi allowance.');
  warnings.push('Crew, passengers, baggage, runways, weather and all pilot acknowledgments are not imported.');
  return {fields,evidence,warnings};
}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
module.exports={extractPlan,validDate};
