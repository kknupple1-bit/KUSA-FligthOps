'use strict';
// Conservative extraction: absent/conflicting fields remain empty for pilot review.
function extractPlan(text) {
  if(typeof text!=='string'||text.length>120000)throw Error('DOCUMENT_TEXT_LIMIT');
  const source=text.replace(/\r/g,'').replace(/[\u00a0\t]+/g,' ');
  if(!/foreflight/i.test(source))throw Error('NOT_A_FOREFlIGHT_DOCUMENT');
  const warnings=[],fields={},evidence={},candidates={};
  function put(name,values,label){
    candidates[name]=[...(candidates[name]||[]),...values];
    const unique=[...new Set(candidates[name].filter(v=>v!==null&&v!==undefined&&v!==''))];
    fields[name]=unique.length===1?unique[0]:null;
    evidence[name]=unique.length===1?label:unique.length>1?'Conflicting values':'Not found';
    if(unique.length>1)warnings.push(`Conflicting ${name.replaceAll('_',' ')}; enter it after checking the PDF.`);
  }
  const matches=re=>[...source.matchAll(re)].map(m=>m[1].trim());
  put('registration',matches(/\b(?:Aircraft(?:\s+(?:ID|Identification|Registration))?|Registration|Tail(?:\s+Number)?)\s*[:#]?\s*(N[0-9][A-Z0-9]{0,5})\b/gi).concat(matches(/\(\s*FPL-([A-Z0-9]{2,7})-/g)).map(v=>v.toUpperCase()),'Aircraft / ICAO flight plan');
  for(const [name,label] of [['departure','Departure|Origin|From'],['destination','Destination|To'],['alternate','Alternate(?:\s+1)?']])
    put(name,matches(new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*[:]?\\s*([A-Z]{4})\\b`,'gi')).map(v=>v.toUpperCase()),'Labeled airport');
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
  put('date',matches(/(?:^|\n)\s*(?:Flight Date|Date|Departure Date)\s*:?\s*(\d{4}-\d{2}-\d{2})\b/gi).concat(dof),'ISO date / ICAO DOF (verify local trip date)');
  if(fields.date&&!validDate(fields.date)){fields.date=null;evidence.date='Invalid date';}
  for(const [name,label] of [['fob_lb','Block Fuel|Ramp Fuel|Fuel on Board'],['trip_lb','Flight Fuel|Trip Fuel(?: Burn)?'],['taxi_lb','Taxi Fuel|Taxi Burn']]){
    const pattern=new RegExp(`(?:^|\\n)\\s*(?:${label})\\s*:?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)\\s*(?:lb|lbs|pounds)\\b`,'gi');
    put(name,matches(pattern).map(v=>Number(v.replaceAll(',',''))),'Explicitly labeled pounds; verify fuel definition');
  }
  put('route',matches(/(?:^|\n)\s*Route\s*:\s*([^\n]{1,500})/gi),'Labeled route');
  warnings.push('Check every field against the ForeFlight PDF. Dates may be UTC; confirm the intended local trip date.');
  warnings.push('FOB is ramp fuel. Trip burn excludes taxi, reserves and fuel remaining at landing. Confirm the ForeFlight fuel definitions before creating the trip.');
  warnings.push('Crew, passengers, baggage, runways, weather and all pilot acknowledgments are not imported.');
  return {fields,evidence,warnings};
}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
module.exports={extractPlan,validDate};
