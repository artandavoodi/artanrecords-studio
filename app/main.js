import {createClient} from '@supabase/supabase-js';
import config from '../content/account.json';
import {configured,resolveUser,profileValues,validPhoto} from './account.js';
import {bindAccount} from './sign-in.js';
import {bindProfile} from './profile.js';
import {bindPreferences} from './preferences.js';
import {bindWorkspace} from './workspace.js';
bindPreferences();
const search=document.querySelector('[data-search]');
if(search){
  const clear=document.createElement('button');clear.type='button';clear.className='studio-search-clear';clear.setAttribute('aria-label','Clear search');clear.hidden=!search.value;const icon=document.createElement('img');icon.src='/app/icons/close.svg';icon.className='studio-icon';icon.alt='';clear.append(icon);search.after(clear);
  search.addEventListener('input',()=>{clear.hidden=!search.value;});clear.addEventListener('click',()=>{search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus();});
  const focus=()=>{if(location.hash==='#studio-search')search.focus();};addEventListener('hashchange',focus);focus();
}
let client=null;
try{if(configured(config))client=createClient(config.supabase.url,config.supabase.publishableKey,{auth:{storageKey:'artanrecords-studio-auth',storage:sessionStorage,flowType:'pkce',detectSessionInUrl:false}});}catch(error){console.error('[studio] Backend configuration rejected');}
const context={client,config,resolveUser,profileValues,validPhoto};
client?.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){document.querySelectorAll('[data-profile-form],[data-submissions-list],[data-contracts-list]').forEach(element=>element.replaceChildren());document.querySelector('[data-avatar]')?.removeAttribute('src');location.replace('/account/');}});
await bindAccount(context);await bindProfile(context);
await bindWorkspace(context);
document.querySelectorAll('[data-signout]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;try{const result=await client.auth.signOut();if(result.error)throw result.error;}catch{button.disabled=false;button.textContent='Try signing out again';}}));
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.dataset.studioVisible='true';observer.unobserve(entry.target);}});document.querySelectorAll('.studio-surface header,.surface-card').forEach(item=>{item.dataset.studioReveal='';observer.observe(item);});}
