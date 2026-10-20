import {createClient} from '@supabase/supabase-js';
import config from '../content/account.json';
import {configured,resolveUser,profileValues,validPhoto,readAccountCallback} from './account.js';
import {bindAccount} from './sign-in.js';
import {bindProfile} from './profile.js';
import {bindPreferences} from './preferences.js';
import {bindWorkspace} from './workspace.js';
import {bindSearch} from './search.js';
import {bindBilling} from './billing.js';
import {bindChrome} from './chrome.js';
import {bindPlatform} from './platform.js';
await bindPreferences();
bindSearch();
const chrome=bindChrome();
document.querySelectorAll('.studio-account input:not([type=checkbox]):not([type=file]),.studio-account textarea,.studio-account select').forEach(field=>field.classList.add('ui-field'));
document.querySelectorAll('.studio-account button:not(.ui-password-field__toggle)').forEach(button=>button.classList.add('ui-button'));
document.querySelectorAll('[data-signout]').forEach(button=>{button.classList.add('studio-signout');const icon=document.createElement('img');icon.className='studio-icon';icon.src='/app/icons/signout.svg';icon.alt='';button.prepend(icon);});
let client=null;
try{if(configured(config))client=createClient(config.supabase.url,config.supabase.publishableKey,{auth:{storageKey:'artanrecords-studio-auth',storage:sessionStorage,flowType:'pkce',detectSessionInUrl:false}});}catch(error){console.error('[studio] Backend configuration rejected');}
const context={client,config,resolveUser,profileValues,validPhoto};
bindPlatform(context);
const callback=readAccountCallback(new URL(location.href));
const accountCallback=Boolean(callback.code||callback.token||callback.error);
client?.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){document.querySelectorAll('[data-profile-form],[data-submissions-list],[data-contracts-list]').forEach(element=>element.replaceChildren());document.querySelector('[data-avatar]')?.removeAttribute('src');location.replace('/account/');}});
await bindAccount(context);await bindProfile(context);
if(client)try{chrome.setUser(await resolveUser(client));}catch{console.error('[studio] Account verification unavailable');}
if(location.pathname==='/account/')requestAnimationFrame(()=>{
  if(document.body.classList.contains('cookie-consent-open'))document.addEventListener('cookie-consent:closed',()=>chrome.openAccount(accountCallback),{once:true});
  else chrome.openAccount(accountCallback);
});
await bindBilling(context);
await bindWorkspace(context);
document.querySelectorAll('[data-signout]').forEach(button=>{button.disabled=!client;button.addEventListener('click',async()=>{if(!client)return;button.disabled=true;try{const result=await client.auth.signOut({scope:'local'});if(result.error)throw result.error;}catch{button.disabled=false;button.setAttribute('aria-label','Try signing out again');}});});
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.dataset.studioVisible='true';observer.unobserve(entry.target);}});document.querySelectorAll('.studio-surface header,.surface-card').forEach(item=>{item.dataset.studioReveal='';observer.observe(item);});}
