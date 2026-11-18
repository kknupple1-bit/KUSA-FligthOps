'use strict';
const plan=tail=>`ForeFlight Navlog\nAircraft: ${tail}\nDeparture: KDTO\nDestination: KBPT\nAlternate: KIAH\nFlight Date: 2026-11-17\nRamp Fuel: 9,000 lbs\nBlock Fuel: 8,800 lbs\nTrip Fuel: 3,000 lbs\nTaxi Fuel: 200 lbs\nRoute: KDTO DIRECT KBPT`;
function pdf(text){
 const stream='BT /F1 12 Tf 40 760 Td '+text.split('\n').map((s,i)=>(i?'0 -18 Td ':'')+'('+s.replace(/[\\()]/g,'\\$&')+') Tj').join('\n')+' ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let out='%PDF-1.4\n',offsets=[0];objects.forEach((s,i)=>{offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${s}\nendobj\n`;});const xref=Buffer.byteLength(out);out+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(out);
}
// Invented values and route, reproducing the Mobile export's label/order shape.
// Never commit user PDFs, extracted pilot/contact details or original routes.
const mobilePlan=tail=>`ETE\n1h10m\nTOW\n30000 lbs\nELW\n27500 lbs\nBlock Fuel\n8000 lbs\nTaxi Fuel\n200 lbs\nFlight Fuel\n2700 lbs\nLanding Fuel\n5300 lbs\nKDTO - KBPT (Nov 17, 2026) in ${tail} (TEST) IFR\nSUMMARY & TIMES\nTail\t${tail}\nFUEL & WEIGHTS\nBlock Fuel\t8000 lbs\nTaxi Fuel\t200 lbs\nFlight Fuel\t2700 lbs\nTOW\t30000 lbs\nELW\t27500 lbs\nICAO FLIGHT PLAN\n(FPL ─ TEST123 ─ I G)`;
module.exports={pdf,plan,mobilePlan};
