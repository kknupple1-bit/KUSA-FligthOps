'use strict';
const {startupReason}=require('./foreflight-pdf-runtime.cjs');
process.once('message',async encoded=>{
 let parser,stage='startup';
 try{
  // Upstream's managed-host bootstrap installs DOMMatrix/Path2D/ImageData before
  // pdf-parse evaluates its bundled PDF.js code. Normal CJS loading is used here
  // rather than depending on PDF.js's optional automatic createRequire loader.
  const {CanvasFactory,getData}=require(process.argv[3]);
  // Resolve in the parent, which already passed the deployment dependency gate.
  // The worker must not rediscover packages via a different host module path.
  const {PDFParse}=require(process.argv[2]);
  PDFParse.setWorker(getData());
  stage='document';
  parser=new PDFParse({data:new Uint8Array(Buffer.from(encoded,'base64')),CanvasFactory,isEvalSupported:false,useSystemFonts:false,disableFontFace:true,stopAtErrors:true});
  const info=await parser.getInfo();
  if(info.total<1||info.total>20)throw Object.assign(Error(),{code:'PDF_PAGE_LIMIT'});
  const result=await parser.getText();
  const text=result.pages.map(page=>page.text).join('\n');
  if(!text.trim())throw Object.assign(Error(),{code:'PDF_NO_TEXT'});
  if(text.length>120000)throw Object.assign(Error(),{code:'PDF_TEXT_LIMIT'});
  process.send({ok:true,text,pages:info.total});
 }catch(error){
  const known=['PDF_PAGE_LIMIT','PDF_NO_TEXT','PDF_TEXT_LIMIT'];
  const code=known.includes(error.code)?error.code:stage==='startup'?'PDF_READER_UNAVAILABLE':error.name==='PasswordException'?'PDF_PASSWORD_REQUIRED':error.name==='InvalidPDFException'?'PDF_INVALID':'PDF_NOT_READABLE';
  process.send({ok:false,error:code,...(stage==='startup'?{reason:startupReason(error)}:{})});
 }
 finally{if(parser)await parser.destroy().catch(()=>{});}
});
