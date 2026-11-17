'use strict';
process.once('message',async encoded=>{
 let parser;
 try{
  const {PDFParse}=require('pdf-parse');
  parser=new PDFParse({data:new Uint8Array(Buffer.from(encoded,'base64')),isEvalSupported:false,useSystemFonts:false,disableFontFace:true,stopAtErrors:true});
  const info=await parser.getInfo();
  if(info.total<1||info.total>20)throw Error('PDF_PAGE_LIMIT');
  const result=await parser.getText();
  if(!result.text?.trim()||result.text.length>120000)throw Error('PDF_TEXT_UNAVAILABLE');
  process.send({ok:true,text:result.text,pages:info.total});
 }catch{process.send({ok:false,error:'PDF_NOT_READABLE'});}
 finally{if(parser)await parser.destroy().catch(()=>{});}
});
