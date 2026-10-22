import policy from './neuroartan/assets/data/account/username/username-policy.json';
import registry from './neuroartan/assets/data/account/username/reserved-usernames.json';
import {normalizeAccountUsernameInput,validateAccountUsernamePolicy} from './neuroartan/assets/js/layers/website/system/account/username/account-username-policy.js';
const messages={available:'Available to request. Label approval is required.',taken:'This username is already in use.',reserved:'This username is reserved.',invalid:'Use 3–32 lowercase letters, numbers or internal dots.'};
const mayCheck=result=>result.ok||result.code==='USERNAME_RESERVED'&&result.adminOverride===true;
export async function bindArtistIdentity({client,config,resolveUser}){
 const root=document.querySelector('[data-artist-identity]');if(!root||!client||!config.workspace.artistPages)return;
 let user;try{user=await resolveUser(client);}catch{return;}if(!user)return;
 const form=root.querySelector('form'),input=form.elements.username,status=root.querySelector('#username-status'),notice=root.querySelector('[data-handle-notice]'),publish=root.querySelector('[data-publish-profile]'),hide=root.querySelector('[data-unpublish-profile]'),link=root.querySelector('[data-public-page]');
 let approved=null,epoch=0,timer;
 root.hidden=false;publish.disabled=true;hide.disabled=true;
 const refresh=async()=>{
  const response=await client.from('studio_artist_handles').select('requested_username,approved_username,status,notice').eq('account_id',user.id).maybeSingle();
  if(response.error)throw Error('Artist addresses could not be loaded. Please refresh.');
  approved=response.data?.approved_username||null;notice.textContent=(approved?'Username approved. ':'')+(response.data?.notice||'Choose a username for label review.');notice.dataset.approved=String(Boolean(approved));
  if(response.data)input.value=response.data.requested_username;
  input.readOnly=Boolean(approved);form.querySelector('button').disabled=Boolean(approved);publish.disabled=!approved;
  if(approved){link.href='https://artanrecords.com/artists/profile/?username='+encodeURIComponent(approved);const page=await client.from('studio_artist_pages').select('username').eq('username',approved).maybeSingle();if(page.error)throw Error('The public page status could not be checked.');link.hidden=!page.data;hide.disabled=!page.data;}
 };
 try{await refresh();}catch(error){notice.textContent=error.message;form.querySelector('button').disabled=true;return;}
 input.addEventListener('input',()=>{
  clearTimeout(timer);const turn=++epoch;status.textContent='';
  timer=setTimeout(async()=>{try{const result=await validateAccountUsernamePolicy(input.value,{policy,registry});if(turn!==epoch)return;if(!mayCheck(result)){status.textContent=result.message;return;}const response=await client.rpc('studio_username_check',{candidate:result.normalized});if(turn!==epoch)return;if(response.error)throw response.error;status.textContent=messages[response.data]||'Availability could not be checked.';}catch{if(turn===epoch)status.textContent='Availability could not be checked. Try again.';}},350);
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button');button.disabled=true;++epoch;clearTimeout(timer);
  try{const current=await resolveUser(client);if(current?.id!==user.id)throw Error('Your session changed. Sign in again.');const result=await validateAccountUsernamePolicy(input.value,{policy,registry});if(!mayCheck(result))throw Error(result.message);input.value=normalizeAccountUsernameInput(input.value);const response=await client.rpc('studio_request_username',{candidate:input.value});if(response.error)throw Error('This username could not be requested. It may be reserved or already in use.');await refresh();status.textContent='Request sent. Your approval result will appear here.';}catch(error){status.textContent=error.message;}finally{button.disabled=Boolean(approved);}
 });
 for(const [button,rpc] of [[publish,'studio_publish_artist_page'],[hide,'studio_unpublish_artist_page']])button.addEventListener('click',async()=>{
  button.disabled=true;
  try{const current=await resolveUser(client);if(current?.id!==user.id)throw Error('Your session changed.');const response=await client.rpc(rpc);if(response.error)throw Error(rpc==='studio_publish_artist_page'?'Save your profile, select your public artist name and obtain username approval before publishing.':'Your artist page could not be hidden. Try again.');await refresh();status.textContent=rpc==='studio_publish_artist_page'?'Your selected fields are now public.':'Your artist page is hidden. Your username remains reserved.';}catch(error){status.textContent=error.message;}finally{button.disabled=button===publish?!approved:link.hidden;}
 });
 window.addEventListener('focus',()=>{if(!approved&&!form.contains(document.activeElement))refresh().catch(error=>notice.textContent=error.message);});
}
export async function bindArtistApplication({client,resolveUser}){
 const root=document.querySelector('[data-partnership-application]');if(!root||!client)return;
 let user;try{user=await resolveUser(client);}catch{return;}if(!user)return;
 root.hidden=false;const form=root.querySelector('form'),status=root.querySelector('[role=status]'),button=form.querySelector('button');
 const refresh=async()=>{const result=await client.from('studio_artist_applications').select('requested_tier,approved_tier,status,decision_note').eq('account_id',user.id).maybeSingle();if(result.error)throw Error('Your application could not be loaded. Please refresh.');if(result.data){const row=result.data;status.textContent='Requested: '+row.requested_tier+'. Status: '+row.status+'.'+(row.approved_tier?' Offered tier: '+row.approved_tier+'.':'')+' '+row.decision_note;form.hidden=row.status!=='rejected';}else status.textContent='No partnership application yet.';};
 try{await refresh();}catch(error){button.disabled=true;status.textContent=error.message;return;}
 form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;try{const current=await resolveUser(client);if(current?.id!==user.id)throw Error('Your session changed.');const response=await client.rpc('studio_apply_partnership',{tier:form.elements.tier.value,note:form.elements.note.value.trim()});if(response.error)throw Error('Your application was not sent. Please refresh before retrying.');await refresh();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
}
