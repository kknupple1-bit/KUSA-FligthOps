'use strict';
// Runtime loader paths are needed on managed hosting. Never inherit app secrets
// or NODE_OPTIONS into the constrained document subprocess.
function workerEnvironment(source=process.env){
 return Object.fromEntries(['PATH','SystemRoot','SYSTEMROOT','TEMP','TMP','NODE_PATH','LD_LIBRARY_PATH'].filter(k=>typeof source[k]==='string').map(k=>[k,source[k]]));
}
const reasons=new Set(['MODULE_MISSING','NATIVE_LIBRARY_UNAVAILABLE','DOM_API_UNAVAILABLE','MODULE_FORMAT','SPAWN_DENIED','SPAWN_NOT_FOUND','IPC_FAILED','OTHER']);
const safeReason=value=>reasons.has(value)?value:'OTHER';
function startupReason(error){
 if(error?.code==='MODULE_NOT_FOUND'||error?.code==='ERR_MODULE_NOT_FOUND')return 'MODULE_MISSING';
 if(error?.code==='ERR_DLOPEN_FAILED'||/Cannot find native binding/.test(String(error?.message)))return 'NATIVE_LIBRARY_UNAVAILABLE';
 if(error?.name==='ReferenceError'&&/\b(?:DOMMatrix|ImageData|Path2D) is not defined\b/.test(String(error?.message)))return 'DOM_API_UNAVAILABLE';
 if(error?.code==='ERR_REQUIRE_ESM')return 'MODULE_FORMAT';
 if(['EACCES','EPERM','ERR_ACCESS_DENIED'].includes(error?.code))return 'SPAWN_DENIED';
 if(error?.code==='ENOENT')return 'SPAWN_NOT_FOUND';
 return 'OTHER';
}
function probePdf(){
 const content='BT /F1 12 Tf 40 760 Td (KUSA_PDF_READER_PROBE) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`];
 let out='%PDF-1.4\n',offsets=[];
 objects.forEach((s,i)=>{offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${s}\nendobj\n`;});
 const xref=Buffer.byteLength(out);
 out+='xref\n0 6\n0000000000 65535 f \n'+offsets.map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return Buffer.from(out);
}
module.exports={workerEnvironment,startupReason,safeReason,probePdf};
