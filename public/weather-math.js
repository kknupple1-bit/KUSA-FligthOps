(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KUSAWeatherMath=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 function number(value){
  if(value==null||typeof value==='boolean'||(typeof value!=='number'&&typeof value!=='string')||String(value).trim()==='')return null;
  const n=Number(value);return Number.isFinite(n)?n:null;
 }
 function hpaToInhg(value){const n=number(value);return n!==null&&n>=500&&n<=1200?n*0.0295299830714:null;}
 function pressureAlt(elevationFt,altimeterInhg){const e=number(elevationFt),a=number(altimeterInhg);return e===null||a===null||a<=0?null:e+(29.92-a)*1000;}
 function densityAlt(pressureAltitudeFt,oatC){const pa=number(pressureAltitudeFt),t=number(oatC);if(pa===null||t===null)return null;const isa=15-1.98*(pa/1000);return pa+120*(t-isa);}
 return {number,hpaToInhg,pressureAlt,densityAlt};
});
