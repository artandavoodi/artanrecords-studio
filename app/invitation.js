import {createClient} from '@supabase/supabase-js';
import config from '../content/account.json';
import labels from '../content/contract-invitation.json';
import {bindAgreementIntake} from './agreement-intake.js';
import {bindSigningRehearsals} from './agreement-rehearsal.js';
import './neuroartan/assets/js/core/02-systems/page-loading.js';
import iconManifest from './icon-manifest.json';

const loading=document.createElement('div');loading.className='ui-loading-surface';loading.setAttribute('role','status');loading.setAttribute('aria-label',labels.loading);loading.innerHTML='<span class="ui-loader-circle" aria-hidden="true"></span>';document.body.append(loading);
for(const [selector,name] of [['[data-invitation-refresh]','refresh'],['[data-invitation-signout]','signout']]){const button=document.querySelector(selector),image=document.createElement('img');button.setAttribute('aria-label',button.textContent);button.dataset.label=button.textContent;button.dataset.tooltipPosition='top';image.className='studio-icon';image.src='/app/icons/'+name+'.svg?v='+iconManifest.files[name];image.alt='';button.replaceChildren(image);}

const status=document.querySelector('[data-invitation-status]'),auth=document.querySelector('[data-invitation-auth]'),privateView=document.querySelector('[data-invitation-private]'),emailForm=document.querySelector('[data-invitation-email]'),codeForm=document.querySelector('[data-invitation-code]');
const client=createClient(config.supabase.url,config.supabase.publishableKey,{auth:{storageKey:'artanrecords-contract-auth',storage:sessionStorage,flowType:'pkce',detectSessionInUrl:false}});
let email='',invitation=null,context=null,emailVerified=false,nextSendAt=0,sending=false;
const resend=document.querySelector('[data-code-resend]'),back=document.querySelector('[data-code-back]');
codeForm.elements.code.addEventListener('input',()=>{codeForm.elements.code.value=codeForm.elements.code.value.replace(/[\s-]/g,'');});
function showCodeStep(){
 emailForm.hidden=true;codeForm.hidden=false;document.querySelector('[data-invitation-introduction]').hidden=true;
 document.querySelector('[data-code-destination]').textContent=labels.destination.replace('{email}',email);
 codeForm.elements.code.focus();
}
const parameters=new URLSearchParams(location.hash.slice(1));
const emailLink=parameters.has('token_hash')?{hash:parameters.get('token_hash'),type:parameters.get('type')}:null;
if(emailLink){sessionStorage.removeItem('artanrecords-contract-invitation');history.replaceState(null,'',location.pathname);}
if(parameters.has('token')){const token=parameters.get('token');if(/^[a-f0-9]{64}$/.test(token)){if(token!==sessionStorage.getItem('artanrecords-contract-invitation'))sessionStorage.removeItem('artanrecords-contract-email');sessionStorage.setItem('artanrecords-contract-invitation',token);}history.replaceState(null,'',location.pathname);}
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
 privateView.hidden=true;const claimed=await (token()?client.rpc('contract_claim_invitation',{token:token()}):client.rpc('contract_resume_invitation'));if(claimed.error||!claimed.data)throw Error();invitation=claimed.data;
 const result=await client.rpc('contract_invitation_context',{invitation});if(result.error||!result.data)throw Error();context=result.data;
 const mount=document.querySelector('[data-invitation-content]');mount.replaceChildren(document.querySelector('[data-invitation-template]').content.cloneNode(true));
 if(context.status!=='approved'){const help=document.createElement('p');help.textContent=labels.signatureHelp;mount.querySelector('[data-invitation-panel=agreement]').prepend(help);}
 const intake=mount.querySelector('[data-agreement-intake]');intake.querySelector('p').textContent='Provide only the legal details requested for this agreement. Submitted identity details are locked for review.';intake.querySelector('[data-intake-address]').hidden=true;
 await bindAgreementIntake({client:scopedClient,resolveUser,invitationOnly:true});await bindSigningRehearsals({client:scopedClient,resolveUser});
 auth.hidden=true;privateView.hidden=false;document.querySelector('[data-invitation-introduction]').hidden=true;document.querySelector('[data-invitation-toolbar]').hidden=false;status.textContent='';
}
emailForm.onsubmit=async event=>{
 event.preventDefault();if(sending)return;
 if(Date.now()<nextSendAt){event.preventDefault();status.textContent=labels.rateLimited;return;}
 sending=true;resend.disabled=true;email=emailForm.elements.email.value.trim();emailForm.inert=true;status.textContent='';
 try{const allowed=await client.rpc('contract_invitation_check',{token:token(),email});if(allowed.error||allowed.data!==true){status.textContent=labels.unavailable;return;}const sent=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+'/invitation/'}});if(sent.error)throw sent.error;sessionStorage.setItem('artanrecords-contract-email',email);nextSendAt=Date.now()+60000;setTimeout(()=>{resend.disabled=false;},60000);showCodeStep();status.textContent=labels.sent;}catch(error){status.textContent=error.code==='over_email_send_rate_limit'?labels.rateLimited:labels.sendFailed;}finally{sending=false;emailForm.inert=false;resend.disabled=Date.now()<nextSendAt;}
};
resend.onclick=()=>emailForm.requestSubmit();
back.onclick=()=>{codeForm.hidden=true;codeForm.elements.code.value='';emailForm.hidden=false;sessionStorage.removeItem('artanrecords-contract-email');document.querySelector('[data-invitation-introduction]').hidden=false;status.textContent='';emailForm.elements.email.focus();};
codeForm.onsubmit=async event=>{
 event.preventDefault();if(codeForm.inert)return;codeForm.inert=true;
 try{
  if(!emailVerified){const verified=await client.auth.verifyOtp({email,token:codeForm.elements.code.value.trim(),type:'email'});if(verified.error){status.textContent=verified.error.code==='otp_expired'?labels.expired:labels.failed;return;}emailVerified=true;emailForm.hidden=true;resend.hidden=true;back.hidden=true;codeForm.elements.code.required=false;codeForm.elements.code.disabled=true;codeForm.querySelector('button').textContent=labels.open;}
  try{await openInvitation();}catch{privateView.hidden=true;status.textContent=labels.accessFailed;}
 }catch{status.textContent=labels.connectionFailed;}finally{codeForm.inert=false;codeForm.elements.code.value='';}
};
document.querySelector('[data-invitation-refresh]').onclick=async()=>{if(!window.confirm('Check for updates? Unsubmitted changes on this page will be cleared.'))return;try{await openInvitation();}catch{privateView.hidden=true;status.textContent=labels.unavailable;}};
document.querySelector('[data-invitation-signout]').onclick=async()=>{await client.auth.signOut({scope:'local'});sessionStorage.removeItem('artanrecords-contract-invitation');sessionStorage.removeItem('artanrecords-contract-email');location.replace('/invitation/');};
for(const button of document.querySelectorAll('[data-invitation-tab]'))button.onclick=()=>{for(const tab of document.querySelectorAll('[data-invitation-tab]'))tab.setAttribute('aria-selected',String(tab===button));for(const panel of document.querySelectorAll('[data-invitation-panel]'))panel.hidden=panel.dataset.invitationPanel!==button.dataset.invitationTab;};
async function initialize(){
 if(emailLink){
  if(!/^[a-zA-Z0-9_-]{32,256}$/.test(emailLink.hash||'')||!['email','signup'].includes(emailLink.type)){emailForm.hidden=true;status.textContent=labels.failed;return;}
  const verified=await client.auth.verifyOtp({token_hash:emailLink.hash,type:emailLink.type});emailLink.hash=null;
  if(verified.error){emailForm.hidden=true;status.textContent=labels.linkFailed;return;}
 }
 const session=await client.auth.getSession();
 if(session.data.session){try{await openInvitation();}catch{emailForm.hidden=true;codeForm.hidden=true;status.textContent=labels.resumeFailed;}return;}
 if(!token()){emailForm.hidden=true;status.textContent=labels.missing;return;}
 email=sessionStorage.getItem('artanrecords-contract-email')||'';emailForm.elements.email.value=email;
 if(email){showCodeStep();status.textContent=labels.sent;}
}
initialize().catch(()=>{status.textContent=labels.connectionFailed;}).finally(()=>{document.querySelector('main').hidden=false;window.NeuroartanPageLoading?.finish();loading.remove();});
