import settings from '../content/account.json';

export function billingValues(form){
  return Object.fromEntries(settings.billingFields.map(field=>{
    const value=String(form.get(field.name)||'').trim();
    if(value.length>field.max)throw Error('Address information is too long.');
    return [field.name,value];
  }));
}

export async function bindBilling({client,resolveUser}){
  const profile=document.querySelector('[data-profile-form]');
  if(!profile||!client)return;
  const details=document.createElement('details'),summary=document.createElement('summary'),fields=document.createElement('div'),status=document.createElement('p'),save=document.createElement('button');
  details.className='studio-billing';summary.textContent='Billing address';details.append(summary,fields);fields.className='studio-billing-fields';status.setAttribute('role','status');
  const arrow=document.createElement('img');arrow.src='/assets/icons/navigation/chevron-right.svg';arrow.className='studio-icon';arrow.alt='';summary.append(arrow);
  for(const field of settings.billingFields){const label=document.createElement('label'),input=document.createElement('input');label.textContent=field.label;input.name='billing_'+field.name;input.autocomplete=field.autocomplete;input.maxLength=field.max;input.className='ui-field';label.append(input);fields.append(label);}
  save.type='button';save.className='ui-button';save.textContent='Save';fields.append(save,status);document.querySelector('[data-billing-mount]').append(details);details.hidden=profile.hidden;
  let loaded=false;
  details.addEventListener('toggle',async()=>{if(!details.open||loaded)return;save.disabled=true;try{const user=await resolveUser(client);if(!user)throw Error('Sign in required');const result=await client.from('studio_billing_addresses').select(settings.billingFields.map(field=>field.name).join(',')).eq('account_id',user.id).maybeSingle();if(result.error)throw result.error;for(const field of settings.billingFields)fields.querySelector(`[name="billing_${field.name}"]`).value=result.data?.[field.name]||'';loaded=true;status.textContent='Private to your account. Saving an address does not start a payment.';}catch{status.textContent='Your address could not be loaded. Close and reopen to try again.';}finally{save.disabled=!loaded;}});
  save.addEventListener('click',async()=>{save.disabled=true;try{const user=await resolveUser(client);if(!user)throw Error('Sign in required');const values=billingValues(new Map(settings.billingFields.map(field=>[field.name,fields.querySelector(`[name="billing_${field.name}"]`).value])));const result=await client.from('studio_billing_addresses').upsert({account_id:user.id,...values});if(result.error)throw result.error;status.textContent='Billing address saved.';}catch{status.textContent='Your address could not be saved. Please try again.';}finally{save.disabled=false;}});
}
