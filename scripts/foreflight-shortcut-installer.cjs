'use strict';
const config=require('../data/foreflight-shortcut-installer.json');
function validateInstaller(value){
 if(value?.schema!=='kusa.foreflight.shortcut-installer.v1'||value.name!=='Create KUSA Trip'||!Number.isInteger(value.template_version)||value.template_version<1||value.target_origin!=='https://flightops.kusaaviation.com')throw Error('Invalid ForeFlight installer configuration');
 if(value.url===null&&value.workflow_sha256===null)return false;
 const url=new URL(value.url);
 if(url.protocol!=='https:'||!['www.icloud.com','icloud.com'].includes(url.hostname)||!/^\/shortcuts\/[a-f0-9]{32}$/.test(url.pathname)||url.port||url.username||url.password||url.search||url.hash||!/^[a-f0-9]{64}$/.test(value.workflow_sha256||''))throw Error('Invalid reviewed Apple Shortcut installer');
 return true;
}
function installerInfo(host,value=config){
 const configured=validateInstaller(value),preview=String(host||'').toLowerCase().includes('.preview.');
 return {available:configured&&!preview,reason:preview?'LIVE_SETUP_REQUIRED':configured?null:'INSTALLER_NOT_CONFIGURED',name:value.name,template_version:value.template_version,url:configured&&!preview?value.url:null,live_setup_url:value.target_origin+'/foreflight.html',upload_url:value.target_origin+'/api/foreflight/upload'};
}
module.exports={validateInstaller,installerInfo};
