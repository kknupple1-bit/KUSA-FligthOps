'use strict';
process.once('message',async encoded=>{
 let parser,stage='startup';
 try{
  const {PDFParse}=require('pdf-parse');
  stage='document';
  parser=new PDFParse({data:new Uint8Array(Buffer.from(encoded,'base64')),isEvalSupported:false,useSystemFonts:false,disableFontFace:true,stopAtErrors:true});
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
  process.send({ok:false,error:code});
 }
 finally{if(parser)await parser.destroy().catch(()=>{});}
});
