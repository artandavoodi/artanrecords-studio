import config from '../content/payout-application.json' with {type:'json'};
import {showSaveConfirmation} from './neuroartan/assets/js/core/02-systems/toast.js';
export function payoutApplicationValues(form){
 const value={};
 for(const field of config.fields){const text=String(form.get(field.name)||'').trim();if(field.required&&!text||field.max&&text.length>field.max||field.pattern&&!(new RegExp('^'+field.pattern+'$')).test(text)||field.options&&!field.options.some(option=>option.value===text&&text))throw Error('Complete the required application details.');value[field.name]=field.pattern?text.toUpperCase():text;}
 if(value.recipient_type!=='individual'&&!value.business_name)throw Error('Enter the registered business name.');
 if(form.get('consent')!=='on')throw Error('Confirm submission before applying.');value.consent=true;return value;
}
export function bankAmount(item){
 if(['eur','usd','gbp'].includes(item.currency))return new Intl.NumberFormat(undefined,{style:'currency',currency:item.currency.toUpperCase()}).format(item.amount/100);
 return `${item.amount} minor units (${item.currency.toUpperCase()})`;
}
export async function bindBank({client,resolveUser}){
 const root=document.querySelector('[data-payout-application]');if(!root)return;
 const form=root.querySelector('form'),status=root.querySelector('[data-payout-application-status]'),note=root.querySelector('[data-payout-decision]');let owner;
 try{owner=client&&await resolveUser(client);if(!owner)throw Error();}catch{status.textContent='Sign in to manage your payout application.';return;}
 async function refresh(){
  const result=await client.from('studio_payout_applications').select('legal_name,recipient_type,business_name,registration_country,tax_residence_country,status,decision_note').eq('account_id',owner.id).maybeSingle();if(result.error)throw Error('Payout applications are not connected yet. No information was submitted.');
  if((await resolveUser(client))?.id!==owner.id)throw Error('Your session changed. Refresh before continuing.');
  const row=result.data;form.hidden=Boolean(row&&['pending','approved'].includes(row.status));status.textContent=row?config.statuses[row.status]||'Application status unavailable.':'No payout application submitted.';note.textContent=row?.decision_note||'';
  if(row)for(const field of config.fields)form.elements[field.name].value=row[field.name]||'';
 }
 try{await refresh();}catch(error){status.textContent=error.message;return;}
 form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;
  try{if((await resolveUser(client))?.id!==owner.id)throw Error('Your session changed.');const value=payoutApplicationValues(new FormData(form));const result=await client.rpc('studio_submit_payout_application',{value});if(result.error)throw Error('The application was not submitted. Refresh before retrying; resubmissions may require a one-hour wait.');await refresh();showSaveConfirmation('Application submitted for review.');}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 });
}
