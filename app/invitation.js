import {createClient} from '@supabase/supabase-js';
import config from '../content/account.json';
import labels from '../content/contract-invitation.json';
import {bindAgreementIntake} from './agreement-intake.js';
import {bindSigningRehearsals} from './agreement-rehearsal.js';

const status=document.querySelector('[data-invitation-status]'),auth=document.querySelector('[data-invitation-auth]'),privateView=document.querySelector('[data-invitation-private]'),emailForm=document.querySelector('[data-invitation-email]'),codeForm=document.querySelector('[data-invitation-code]');
const client=createClient(config.supabase.url,config.supabase.publishableKey,{auth:{storageKey:'artanrecords-contract-auth',storage:sessionStorage,flowType:'pkce',detectSessionInUrl:false}});
let email='',invitation=null,context=null;
const parameters=new URLSearchParams(location.hash.slice(1));
if(parameters.has('token')){const token=parameters.get('token');if(/^[a-f0-9]{64}$/.test(token))sessionStorage.setItem('artanrecords-contract-invitation',token);history.replaceState(null,'',location.pathname);}
const token=()=>sessionStorage.getItem('artanrecords-contract-invitation');
const resolveUser=async()=>{const result=await client.auth.getUser();if(result.error)throw result.error;return result.data.user;};
const scopedClient={
 from(table){
  const allowed=['studio_agreement_intake_requests','studio_agreement_intake_versions','studio_agreement_intake_events','studio_agreement_envelopes','studio_agreement_versions','studio_agreement_signatures','studio_agreement_events'];
  if(!allowed.includes(table))throw Error('This invitation does not provide workspace access.');
  return {select(columns){let query=client.from(table).select(columns);if(table==='studio_agreement_intake_requests')query=query.eq('id',context.request_id);if(table==='studio_agreement_envelopes')query=query.eq('intake_version_id',context.version_id||'00000000-0000-0000-0000-000000000000');return query;}};
 },
 async rpc(name,args){
  if(name==='studio_submit_agreement_details')return client.rpc('contract_submit_details',{invitation,expected_version:args.expected_version,payload:args.payload,confirm_accuracy:args.confirm_accuracy});
  if(name==='studio_record_agreement_test_signature')return client.rpc('contract_record_signature',{invitation,envelope:args.envelope,expected_digest:args.expected_digest,signer_name:args.signer_name,png_base64:args.png_base64,acknowledge_non_binding:args.acknowledge_non_binding,initials:args.initials});
  throw Error('This operation is not part of the invitation.');
 }
};
async function openInvitation(){
 privateView.hidden=true;const claimed=await client.rpc('contract_claim_invitation',{token:token()});if(claimed.error||!claimed.data)throw Error();invitation=claimed.data;
 const result=await client.rpc('contract_invitation_context',{invitation});if(result.error||!result.data)throw Error();context=result.data;
 const mount=document.querySelector('[data-invitation-content]');mount.replaceChildren(document.querySelector('[data-invitation-template]').content.cloneNode(true));
 const intake=mount.querySelector('[data-agreement-intake]');intake.querySelector('p').textContent='Provide only the legal details requested for this agreement. Submitted identity details are locked for review.';intake.querySelector('[data-intake-address]').hidden=true;
 await bindAgreementIntake({client:scopedClient,resolveUser,invitationOnly:true});await bindSigningRehearsals({client:scopedClient,resolveUser});
 auth.hidden=true;privateView.hidden=false;status.textContent='';
}
emailForm.onsubmit=async event=>{
 event.preventDefault();email=emailForm.elements.email.value.trim();emailForm.inert=true;status.textContent='';
 try{const allowed=await client.rpc('contract_invitation_check',{token:token(),email});if(allowed.error||allowed.data!==true)throw Error();const sent=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+'/invitation/'}});if(sent.error)throw sent.error;codeForm.hidden=false;codeForm.elements.code.focus();status.textContent=labels.sent;}catch{status.textContent=labels.unavailable;}finally{emailForm.inert=false;}
};
codeForm.onsubmit=async event=>{
 event.preventDefault();codeForm.inert=true;
 try{const verified=await client.auth.verifyOtp({email,token:codeForm.elements.code.value.trim(),type:'email'});if(verified.error)throw verified.error;await openInvitation();}catch{privateView.hidden=true;status.textContent=labels.failed;}finally{codeForm.inert=false;codeForm.elements.code.value='';}
};
document.querySelector('[data-invitation-refresh]').onclick=async()=>{if(!window.confirm('Check for updates? Unsubmitted changes on this page will be cleared.'))return;try{await openInvitation();}catch{privateView.hidden=true;status.textContent=labels.unavailable;}};
document.querySelector('[data-invitation-signout]').onclick=async()=>{await client.auth.signOut({scope:'local'});sessionStorage.removeItem('artanrecords-contract-invitation');location.replace('/invitation/');};
for(const button of document.querySelectorAll('[data-invitation-tab]'))button.onclick=()=>{for(const tab of document.querySelectorAll('[data-invitation-tab]'))tab.setAttribute('aria-selected',String(tab===button));for(const panel of document.querySelectorAll('[data-invitation-panel]'))panel.hidden=panel.dataset.invitationPanel!==button.dataset.invitationTab;};
if(!token()){emailForm.inert=true;status.textContent=labels.unavailable;}
else client.auth.getSession().then(async result=>{if(result.data.session)try{await openInvitation();}catch{status.textContent=labels.unavailable;}}).catch(()=>{status.textContent=labels.unavailable;});
