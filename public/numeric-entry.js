(function(){
 "use strict";
 let current=null,dialog=null;
 const labelFor=el=>String(el.getAttribute("aria-label")||el.labels?.[0]?.textContent||el.parentElement?.querySelector("label")?.textContent||el.id||"Number").trim();
 function ensureDialog(){
  if(dialog)return dialog;
  dialog=document.createElement("dialog");dialog.id="flightopsNumberPad";
  dialog.setAttribute("aria-labelledby","flightopsNumberPadTitle");
  dialog.innerHTML='<h2 id="flightopsNumberPadTitle"></h2><p class="pad-help">Tap numbers, then Done. The first number replaces the current value.</p><output id="flightopsNumberPadValue" aria-live="polite"></output><p class="pad-error" id="flightopsNumberPadError" role="alert"></p><div class="pad-grid"></div><div class="pad-tools"><button type="button" data-key="sign" aria-label="Change sign">±</button><button type="button" data-key="clear">Clear</button></div><div class="pad-actions"><button type="button" data-key="cancel">Cancel</button><button type="button" data-key="done">Done</button></div><button type="button" data-key="keyboard">Use keyboard instead</button>';
  const grid=dialog.querySelector(".pad-grid");
  for(const key of ["1","2","3","4","5","6","7","8","9",".","0","backspace"]){
   const button=document.createElement("button");button.type="button";button.dataset.key=key;
   button.textContent=key==="backspace"?"⌫":key;
   button.setAttribute("aria-label",key==="backspace"?"Backspace":key==="."?"Decimal point":key);grid.append(button);
  }
  dialog.addEventListener("click",event=>{const button=event.target.closest("button[data-key]");if(button&&!button.disabled)press(button.dataset.key)});
  dialog.addEventListener("cancel",event=>{event.preventDefault();closePad(false)});
  dialog.addEventListener("keydown",event=>{
   if(!current||event.ctrlKey||event.metaKey||event.altKey)return;
   const key=event.key;
   if(/^[0-9]$/.test(key)||[".",",","-","Backspace","Delete","Enter"].includes(key)){
    event.preventDefault();press(key==="Enter"?"done":key==="Backspace"?"backspace":key==="Delete"?"clear":key==="-"?"sign":key===","?".":key);
   }
  });
  document.body.append(dialog);return dialog;
 }
 function render(){
  if(!current)return;
  dialog.querySelector("output").textContent=current.value||"—";
  dialog.querySelector('[data-key="."]').disabled=!current.rules.decimal;
  dialog.querySelector('[data-key="sign"]').disabled=!current.rules.signed;
  dialog.querySelector(".pad-error").textContent=current.error||"";
 }
 function closePad(commit,native=false){
  if(!current)return;
  const state=current,target=state.target;
  if(commit){
   const value=state.value;
   const number=Number(value);
   if(value!==""&&!/^-?\d+(?:\.\d*)?$/.test(value)){state.error="Enter a complete number.";render();return}
   if(value===""&&target.required){state.error="Enter a value.";render();return}
   if(value!==""&&!Number.isFinite(number)){state.error="Enter a finite number.";render();return}
   const min=target.getAttribute("min"),max=target.getAttribute("max");
   if(value!==""&&((min!==null&&number<Number(min))||(max!==null&&number>Number(max)))){
    state.error=min!==null&&max!==null?"Enter a value from "+min+" to "+max+".":min!==null?"Enter "+min+" or more.":"Enter "+max+" or less.";render();return;
   }
   if(target.maxLength>0&&value.length>target.maxLength){state.error="Use no more than "+target.maxLength+" characters.";render();return}
   if(!target.isConnected||target.readOnly||target.disabled){state.error="This field is no longer editable. Tap Cancel.";render();return}
   target.value=value;
   target.dispatchEvent(new Event("input",{bubbles:true}));
   target.dispatchEvent(new Event("change",{bubbles:true}));
  }
  current=null;
  if(target.isConnected&&!target.disabled&&!target.readOnly){
   target.dataset.padRestoreFocus="true";
   if(native){target.dataset.padNative="true";target.setAttribute("inputmode",state.rules.decimal||state.rules.signed?"decimal":"numeric")}
   dialog.close();
   target.focus({preventScroll:true});
   if(native)try{target.select()}catch(_){}
   requestAnimationFrame(()=>{delete target.dataset.padRestoreFocus});
  }else dialog.close();
 }
 function press(key){
  if(!current)return;
  current.error="";
  if(key==="done"){closePad(true);return}
  if(key==="cancel"){closePad(false);return}
  if(key==="keyboard"){closePad(false,true);return}
  if(key==="clear"){current.value="";current.replace=false;current.replaceNegative=false}
  else if(key==="backspace"){current.value=current.replace?"":current.value.slice(0,-1);current.replace=false;current.replaceNegative=false}
  else if(key==="sign"&&current.rules.signed){current.value=current.value.startsWith("-")?current.value.slice(1):"-"+current.value;if(current.replace)current.replaceNegative=current.value.startsWith("-")}
  else if(key==="."&&current.rules.decimal){
   if(current.replace){current.value=current.replaceNegative?"-0.":"0.";current.replace=false}
   else if(!current.value.includes("."))current.value=(current.value===""?"0":current.value==="-"?"-0":current.value)+".";
  }else if(/^[0-9]$/.test(key)){
   current.value=current.replace?(current.replaceNegative?"-":"")+key:current.value+key;current.replace=false;
  }
  render();
 }
 function openPad(target){
  if(current||target.disabled||target.readOnly||target.dataset.padNative==="true")return;
  ensureDialog();
  current={target,rules:numericEntryRules(target),value:String(target.value||""),replace:true,replaceNegative:false,error:""};
  dialog.querySelector("h2").textContent=labelFor(target);
  render();dialog.showModal();dialog.querySelector('[data-key="1"]').focus();
 }
 window.KUSANumberPad={
  configure(target){
   if(typeof HTMLDialogElement==="undefined"||typeof HTMLDialogElement.prototype.showModal!=="function")return false;
   target.setAttribute("inputmode",target.dataset.padNative==="true"?(numericEntryRules(target).decimal||numericEntryRules(target).signed?"decimal":"numeric"):"none");
   target.dataset.appNumberPad="true";
   if(!target.dataset.padBound){
    target.addEventListener("focus",()=>{if(target.dataset.padRestoreFocus){delete target.dataset.padRestoreFocus;return}openPad(target)});
    target.addEventListener("click",()=>openPad(target));
    target.addEventListener("blur",()=>{if(target.dataset.padNative==="true"){delete target.dataset.padNative;target.setAttribute("inputmode","none")}});
    target.dataset.padBound="true";
   }
   return true;
  }
 };
 if(typeof configureNumericKeypads==="function")configureNumericKeypads();
})();
