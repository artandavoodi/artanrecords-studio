import {privatePhone} from './account.js';
import {showSaveConfirmation} from './neuroartan/assets/js/core/02-systems/toast.js';
export async function bindAccountSecurity({client,resolveUser,config}){
 const root=document.querySelector('[data-account-security]');if(!root||!client)return;
 const form=root.querySelector('form'),status=root.querySelector('[data-account-security-status]');let owner;
 try{
  owner=await resolveUser(client);if(!owner)return;
  const {data,error}=await client.from('studio_profiles').select('contact_phone').eq('id',owner.id).maybeSingle();if(error)throw error;
  form.querySelector('[data-security-email]').value=owner.email||'';
  root.querySelector('[data-security-email-status]').textContent=owner.email_confirmed_at?'Email verified':'Email confirmation required';
  form.elements.contact_phone.value=data?.contact_phone||owner.phone||'';
  root.querySelector('[data-security-phone-status]').textContent=config.phoneNotice;
  form.hidden=false;status.textContent='';
 }catch{status.textContent='Private account details could not be loaded. Refresh to retry.';return;}
 form.onsubmit=async event=>{
  event.preventDefault();const button=form.querySelector('button');button.disabled=true;
  try{
   const current=await resolveUser(client);if(current?.id!==owner.id)throw Error('Your session changed. Refresh before saving.');
   const phone=privatePhone(form.elements.contact_phone.value);
   const exists=await client.from('studio_profiles').select('id').eq('id',owner.id).maybeSingle();if(exists.error)throw exists.error;
   const result=exists.data?await client.from('studio_profiles').update({contact_phone:phone}).eq('id',owner.id):await client.from('studio_profiles').insert({id:owner.id,contact_phone:phone});if(result.error)throw Error('Account information could not be saved.');
   status.textContent='';showSaveConfirmation('Account information saved.');
  }catch(error){status.textContent=error.message||'Account information could not be saved.';}finally{button.disabled=false;}
 };
}
