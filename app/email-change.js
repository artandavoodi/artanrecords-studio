import labels from '../content/email-change.json' with {type:'json'};
import {bindVerificationCode} from './shared/verification-code.js';
export function bindEmailChange({root,client,resolveUser,owner}){
 const form=root.querySelector('[data-email-change]'),open=root.querySelector('[data-email-change-open]');
 const address=form.elements.email,code=form.elements.code,status=root.querySelector('[data-email-change-status]'),request=form.querySelector('[data-email-change-request]'),verify=form.querySelector('[data-email-change-verify]'),resend=form.querySelector('[data-email-change-resend]');
 let pending=owner.new_email||'',busy=false,nextSend=0;
 open.disabled=false;
 if(pending){address.value=pending;status.textContent=labels.sent;}
 const digits=bindVerificationCode(code,{length:labels.length,label:labels.code,digitLabel:labels.digit,onComplete:()=>{if(pending&&!busy)form.requestSubmit();}});
 const checkOwner=async()=>{const current=await resolveUser(client);if(current?.id!==owner.id)throw Error();return current;};
 const show=()=>{address.readOnly=Boolean(pending);request.hidden=Boolean(pending);verify.hidden=!pending;resend.hidden=!pending;form.querySelector('.ui-verification-code').hidden=!pending;};
 const run=async action=>{if(busy)return;busy=true;form.inert=true;form.setAttribute('aria-busy','true');status.classList.add('studio-loading-status');status.setAttribute('aria-label',labels.busy);status.innerHTML='<span class="ui-loader-circle" aria-hidden="true"></span>';try{await checkOwner();await action();}catch{status.textContent=labels.failed;}finally{busy=false;form.inert=false;form.removeAttribute('aria-busy');status.classList.remove('studio-loading-status');status.removeAttribute('aria-label');show();}};
 open.onclick=()=>{form.hidden=!form.hidden;if(!form.hidden){show();address.focus();}};
 form.querySelector('[data-email-change-cancel]').onclick=()=>{form.hidden=true;digits.clear();open.focus();};
 async function send(resending=false){
  if(Date.now()<nextSend){status.textContent=labels.cooldown;return;}
  const target=resending?pending:address.value.trim();
  if(target.toLowerCase()===(await checkOwner()).email?.toLowerCase()){status.textContent=labels.same;return;}
  const response=resending?await client.auth.resend({type:'email_change',email:target}):await client.auth.updateUser({email:target},{emailRedirectTo:location.origin+'/account/'});
  if(response.error)throw response.error;
  pending=target;nextSend=Date.now()+60000;digits.clear();status.textContent=labels.sent;show();
 }
 resend.onclick=()=>run(()=>send(true));
 form.onsubmit=event=>{event.preventDefault();run(async()=>{
  if(!pending){await send();return;}
  if(!digits.complete()){status.textContent=labels.invalid;return;}
  const response=await client.auth.verifyOtp({email:pending,token:code.value,type:'email_change'});digits.clear();
  if(response.error){status.textContent=labels.invalid;return;}
  const current=await checkOwner();
  if(current.email?.toLowerCase()!==pending.toLowerCase()||!current.email_confirmed_at){status.textContent=labels.remaining;return;}
  root.querySelector('[data-security-email]').value=current.email;root.querySelector('[data-security-email-status]').textContent='Email verified';
  pending='';address.value='';form.hidden=true;status.textContent=labels.saved;open.focus();
 });};
 show();
}
