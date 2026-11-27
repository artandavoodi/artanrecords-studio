import './neuroartan/assets/js/core/02-systems/password-field.js';
import markup from './neuroartan/assets/fragments/layers/website/account/account-profile-setup-drawer.html';
import policy from './neuroartan/assets/data/accounts/account-password-policy.json' with {type:'json'};
import {buildAccountPasswordHint,evaluateAccountPassword} from './neuroartan/assets/js/layers/website/system/account/identity/account-password-policy.js';

export function mountPasswordSetup(form){
 const template=document.createElement('template');template.innerHTML=markup;
 const fields=template.content.querySelector('[data-account-profile-setup-credentials]');
 if(!fields)throw Error('Shared password fields unavailable');
 fields.hidden=false;fields.className='studio-account';
 const input=fields.querySelector('[name=password]'),confirmation=fields.querySelector('[name=password_confirm]');confirmation.name='confirmation';
 for(const [field,title]of [[input,'New password'],[confirmation,'Confirm password']]){field.classList.add('ui-field');field.required=true;field.minLength=12;field.maxLength=128;const label=document.createElement('label');label.htmlFor=field.id;label.textContent=title;field.before(label);}
 form.prepend(fields);
 const effectivePolicy={...policy,min_length:Math.max(policy.min_length,input.minLength)},shell=fields.querySelector('[data-account-profile-setup-password-status-shell]'),message=fields.querySelector('[data-account-profile-setup-password-status]');
 const hint=fields.querySelector('[data-account-profile-setup-password-hint]');hint.textContent=buildAccountPasswordHint(effectivePolicy);hint.id=input.id+'-hint';message.id=input.id+'-status';input.setAttribute('aria-describedby',hint.id+' '+message.id);
 const evaluate=()=>evaluateAccountPassword(input.value,effectivePolicy);
 const sync=()=>{const result=evaluate();shell.dataset.accountProfileSetupPasswordStatusShell=result.status;message.textContent=input.value?result.message:'';};
 input.addEventListener('input',sync);input.addEventListener('change',sync);form.addEventListener('reset',()=>queueMicrotask(sync));sync();
 return {evaluate};
}
