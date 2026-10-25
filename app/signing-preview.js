import config from '../content/agreements.json' with {type:'json'};
export async function signingPreviewRecord(document,values){
 if(values.preview_only!==true)throw Error('Confirm that this is a non-binding preview.');
 const name=String(values.name||'').trim();if(!name||name.length>100)throw Error('Enter a name for the preview.');
 const initials={};for(const section of document.sections){const value=String(values[section.id]||'').trim();if(!value||value.length>8)throw Error('Initial each section before finishing the preview.');initials[section.id]=value;}
 const bytes=new TextEncoder().encode(JSON.stringify({id:document.id,version:document.version,sections:document.sections}));
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
 return {kind:'non-binding-signing-preview',executedAgreement:false,documentId:document.id,version:document.version,documentHash:hash,name,initials,notice:document.notice};
}
export function bindSigningPreview(){
 const dialog=document.querySelector('[data-signing-preview]');if(!dialog)return;
 const open=document.querySelector('[data-signing-preview-open]'),form=dialog.querySelector('form'),status=form.querySelector('[data-signing-preview-status]'),download=form.querySelector('[data-signing-preview-download]');let record=null;
 window.NeuroartanCloseButtons?.initCloseButtonPrimitive(dialog);
 const invalidate=()=>{record=null;download.disabled=true;status.textContent='';};
 open.addEventListener('click',()=>{form.reset();invalidate();dialog.showModal();});
 dialog.querySelector('[data-signing-preview-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{form.reset();invalidate();open.focus({preventScroll:true});});
 form.addEventListener('input',invalidate);
 form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;const values=Object.fromEntries(new FormData(form));values.preview_only=form.elements.preview_only.checked;
 try{const completed=await signingPreviewRecord(config.preview,values);if(!dialog.open||JSON.stringify(Object.fromEntries(new FormData(form)))!==JSON.stringify({...values,preview_only:'on'}))return;record=completed;download.disabled=false;status.textContent='Preview complete. No contract was signed or saved to your account.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
 download.addEventListener('click',()=>{if(!record)return;const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='non-binding-agreement-preview.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
}
