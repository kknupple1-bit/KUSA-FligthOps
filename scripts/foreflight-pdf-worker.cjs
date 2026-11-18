'use strict';
const {startupReason}=require('./foreflight-pdf-runtime.cjs');
const {pathToFileURL}=require('node:url');
// Only getText is exposed. A complete JS geometry implementation is sufficient
// for PDF.js module initialization; never substitute a fake matrix or renderer.
class TextOnlyCanvasFactory{
 create(){throw Error('PDF_RENDERING_DISABLED');}
 reset(){throw Error('PDF_RENDERING_DISABLED');}
 destroy(){throw Error('PDF_RENDERING_DISABLED');}
}
process.once('message',async encoded=>{
 let parser,stage='startup';
 try{
  // Load the pinned canvas package's JS-only geometry module directly. Loading
  // its rendering entry point requires native libraries unavailable on some hosts.
  const {DOMMatrix}=require(process.argv[3]);
  globalThis.DOMMatrix=DOMMatrix;
  // Resolve in the parent, which already passed the deployment dependency gate.
  // The worker must not rediscover packages via a different host module path.
  const {PDFParse}=require(process.argv[2]);
  PDFParse.setWorker(pathToFileURL(process.argv[4]).href);
  stage='document';
  parser=new PDFParse({data:new Uint8Array(Buffer.from(encoded,'base64')),CanvasFactory:TextOnlyCanvasFactory,isEvalSupported:false,isOffscreenCanvasSupported:false,isImageDecoderSupported:false,useSystemFonts:false,disableFontFace:true,stopAtErrors:true});
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
