import config from '../content/agreement-intake.json' with {type:'json'};
export async function bindAgreementIntake({client,resolveUser}){
 const root=document.querySelector('[data-agreement-intake]');if(!root||!client)return;
 const status=root.querySelector('[data-intake-status]'),list=root.querySelector('[data-intake-list]'),form=root.querySelector('form');
 const owner=await resolveUser(client).catch(()=>null);if(!owner)return;let request=null;
 const identity=document.createElement('details'),summary=document.createElement('summary'),reference=document.createElement('p');summary.textContent='Your permanent account reference';reference.textContent=owner.id+' — this identifies your account, not a password. Changing your artist username does not change contract assignments.';identity.append(summary,reference);status.after(identity);
 const current=async()=>(await resolveUser(client))?.id===owner.id;
 const company=()=>{const enabled=form.elements.recipient_type.value==='company';for(const label of form.querySelectorAll('[data-intake-company]')){label.hidden=!enabled;label.querySelector('input').required=enabled;label.querySelector('input').disabled=!enabled;}};
 form.elements.recipient_type.addEventListener('change',company);
 async function load(selectedId=null){
  form.hidden=true;
  try{
   const result=await client.from('studio_agreement_intake_requests').select('id,status,rehearsal,artist_message,current_version_id,created_at').eq('account_id',owner.id).order('created_at',{ascending:false});if(result.error)throw result.error;
   if(!await current())return;
   list.replaceChildren();for(const row of result.data||[]){const line=document.createElement('p');line.textContent=(row.rehearsal?'REHEARSAL · ':'')+(config.states[row.status]||'Unknown status')+' · '+new Date(row.created_at).toLocaleDateString();list.append(line);}
   const rows=(result.data||[]).filter(row=>row.status!=='closed'),choice=root.querySelector('[data-intake-choice]'),rehearsalView=location.hash==='#contract-rehearsal';choice.replaceChildren();const prompt=document.createElement('option');prompt.value='';prompt.textContent='Choose a details request';choice.append(prompt);for(const row of rows){const option=document.createElement('option');option.value=row.id;option.textContent=(row.rehearsal?'Non-binding rehearsal':'Real contract details')+' · '+config.states[row.status];choice.append(option);}root.querySelector('[data-intake-choice-label]').hidden=rows.length<2&&!rehearsalView;
   request=selectedId?rows.find(row=>row.id===selectedId):rehearsalView?rows.find(row=>row.rehearsal):rows.find(row=>!row.rehearsal)||rows[0];if(!request){choice.value='';status.textContent=rehearsalView?'No open rehearsal details request. Archived test records remain available below.':'No contract details have been requested. We will notify you when they are needed.';return;}choice.value=request.id;
   const editable=['awaiting_details','needs_changes'].includes(request.status);form.reset();form.elements.reply_email.value=owner.email||'';form.querySelector('[data-intake-message]').textContent=request.artist_message;
   if(request.current_version_id){const version=await client.from('studio_agreement_intake_versions').select('details,reply_email').eq('id',request.current_version_id).single();if(version.error)throw version.error;for(const [key,value] of Object.entries(version.data.details))if(form.elements[key])form.elements[key].value=value;form.elements.reply_email.value=version.data.reply_email;}
   else if(request.rehearsal)form.elements.artist_name.value='TEST ARTIST';
   else{const profile=await client.from('studio_profiles').select('artist_name').eq('id',owner.id).maybeSingle();if(!profile.error)form.elements.artist_name.value=profile.data?.artist_name||'';}
   if(!await current())return;
   company();for(const control of form.elements){if(control.name==='reply_email')continue;if(control.closest('[data-intake-company]')&&form.elements.recipient_type.value!=='company')continue;control.disabled=!editable;}
   for(const name of ['recipient_type','legal_name','company_name','registration_number','signatory_name','signatory_capacity']){const field=form.elements[name];if(field.tagName==='SELECT')field.disabled=!editable||Boolean(request.current_version_id);else field.readOnly=Boolean(request.current_version_id);}
   form.querySelector('[data-intake-address]').disabled=!editable||request.rehearsal===true;form.querySelector('[data-intake-confirm]').textContent=request.rehearsal?'I confirm this is fictional data for a non-binding rehearsal, not my legal identity.':'I confirm these details are accurate and ask Artanrecords to review them for my agreement.';
   form.hidden=false;status.textContent=(request.rehearsal?'REHEARSAL · ':'')+(config.states[request.status]||'Request status unavailable');
  }catch{status.textContent='Contract details could not be loaded. No details were submitted.';}
 }
 root.querySelector('[data-intake-address]').onclick=async()=>{
  try{if(!await current())throw Error();const result=await client.from('studio_billing_addresses').select('line1,line2,city,postal_code,country').eq('account_id',owner.id).maybeSingle();if(result.error||!result.data||!await current())throw Error();for(const [key,value] of Object.entries({address_line1:result.data.line1,address_line2:result.data.line2,city:result.data.city,postal_code:result.data.postal_code,country_code:/^[A-Z]{2}$/.test(result.data.country||'')?result.data.country:''}))form.elements[key].value=value||'';status.textContent='Saved address copied. Confirm it is correct for this contract.';}catch{status.textContent='A saved address could not be copied. Enter your contracting address directly.';}
 };
 form.onsubmit=async event=>{event.preventDefault();if(!request)return;const body=new FormData(form),payload={recipient_type:form.elements.recipient_type.value};for(const field of config.fields)if(!field.company||payload.recipient_type==='company')payload[field.name]=String(form.elements[field.name].value||'').trim();form.inert=true;
  try{if(!await current())throw Error();const result=await client.rpc('studio_submit_agreement_details',{request:request.id,expected_version:request.current_version_id,payload,confirm_accuracy:body.get('confirm_accuracy')==='on'});if(result.error)throw result.error;await load(request.id);}catch{status.textContent='Details were not submitted. Check your information and refresh if the request has changed.';}finally{form.inert=false;}
 };root.querySelector('[data-intake-choice]').onchange=event=>load(event.target.value);await load();
}
