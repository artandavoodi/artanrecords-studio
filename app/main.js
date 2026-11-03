import {createClient} from '@supabase/supabase-js';
import config from '../content/account.json';
import {configured,resolveUser,profileValues,validPhoto,readAccountCallback} from './account.js';
import {bindAccount} from './sign-in.js';
import {bindProfile} from './profile.js';
import {bindPreferences} from './preferences.js';
import {bindAccountAppearance} from './account-appearance.js';
import {bindVisualLayers} from './visual-layers.js';
import {bindWorkspace} from './workspace.js';
import {bindSearch} from './search.js';
import {bindBilling} from './billing.js';
import {bindChrome} from './chrome.js';
import {bindPlatform} from './platform.js';
import {bindArtistMetadata,bindReleaseMetadata} from './metadata.js';
import {bindArtistIdentity,bindArtistApplication} from './artist-identity.js';
import {bindNotifications} from './notifications.js';
import {bindConcerts} from './concerts.js';
import {bindPublishedReleases} from './releases.js';
import {bindArtistContent} from './artist-content.js';
import {bindArtistNavigation} from './artist-navigation.js';
import {bindArtistPages} from './artist-pages.js';
import {bindCommerce} from './commerce.js';
import {bindDomains} from './domains.js';
import {bindShares} from './shares.js';
import {bindBank} from './bank.js';
import {bindSubscriptions} from './subscriptions.js';
import {bindArtistEditor} from './editor.js';
import {bindEditorSearch} from './editor-search.js';
import {bindPortfolio} from './portfolio.js';
import {bindSubscriptionPayments} from './subscription-payments.js';
import {bindAccountSecurity} from './account-security.js';
import {bindSigningPreview} from './signing-preview.js';
import {bindAgreementDrafts} from './agreement-drafts.js';
import {bindAgreementIntake} from './agreement-intake.js';
import {bindSigningRehearsals} from './agreement-rehearsal.js';
import {bindConnections} from './connections.js';
import {bindOverview,bindPartnershipThemes} from './overview.js';
async function initializeStudio(){
let client=null;
try{if(configured(config))client=createClient(config.supabase.url,config.supabase.publishableKey,{auth:{storageKey:'artanrecords-studio-auth',storage:sessionStorage,flowType:'pkce',detectSessionInUrl:false}});}catch{console.error('[studio] Backend configuration rejected');}
const publicRoute=['/account/','/privacy/','/terms/','/cookies/'].includes(location.pathname);
let admitted=null;
if(!publicRoute){
 try{admitted=client&&await resolveUser(client);}catch{}
 if(!admitted){location.replace('/account/?mode=signup');return;}
 const session=(await client.auth.getSession()).data.session;
 try{const claims=JSON.parse(atob(session.access_token.split('.')[1].replaceAll('-','+').replaceAll('_','/')));if(claims.role==='contract_recipient'){location.replace('/invitation/');return;}}catch{location.replace('/account/');return;}
 const template=document.querySelector('template[data-studio-workspace]');
 document.querySelector('main').hidden=true;
 if(template)template.replaceWith(template.content);
}
if(publicRoute){
 document.querySelector('#site-menu')?.replaceChildren();
 document.querySelectorAll('[data-studio-search-open],[data-studio-notifications],[data-menu-toggle]').forEach(element=>element.hidden=true);
}
await bindPreferences();
await bindVisualLayers();
bindSearch();
bindSigningPreview();
const chrome=bindChrome();
document.querySelectorAll('.studio-account input:not([type=checkbox]):not([type=file]):not([type=range]):not([type=color]):not([type=hidden]),.studio-account textarea,.studio-account select:not(.ui-dropdown)').forEach(field=>field.classList.add('ui-field'));
document.querySelectorAll('.studio-account button:not(.ui-password-field__toggle,.studio-photo-action,.global-close-button)').forEach(button=>button.classList.add('ui-button'));
document.querySelectorAll('[data-signout]').forEach(button=>{button.classList.add('studio-signout');const icon=document.createElement('span');icon.className='studio-icon studio-signout-icon';icon.setAttribute('aria-hidden','true');button.prepend(icon);});
const context={client,config,resolveUser,profileValues,validPhoto};
const notificationsReady=bindNotifications(context);
document.querySelectorAll('[data-reset-password]').forEach(button=>button.addEventListener('click',async()=>{
  const status=document.querySelector('[data-security-status]');button.disabled=true;
  try{const user=client&&await resolveUser(client);if(!user)throw Error();const result=await client.auth.resetPasswordForEmail(user.email,{redirectTo:location.origin+'/account/?flow=recovery'});if(result.error)throw result.error;status.textContent='Check your email for a password reset link.';}catch{status.textContent='A reset link could not be requested. Sign in and try again.';}finally{button.disabled=false;}
}));
bindPlatform(context);
const callback=readAccountCallback(new URL(location.href));
const accountCallback=Boolean(callback.code||callback.token||callback.error);
client?.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){try{for(const key of Object.keys(sessionStorage))if(key.startsWith('artanrecords-editor:'))sessionStorage.removeItem(key);}catch{}document.querySelectorAll('[data-profile-form],[data-artist-metadata],[data-release-controls],[data-submissions-list],[data-contracts-list]').forEach(element=>element.replaceChildren());document.querySelector('[data-avatar]')?.removeAttribute('src');location.replace('/account/');}});
try{
await bindAccount(context);await bindProfile(context);
bindPartnershipThemes();
await bindAccountAppearance(context);
document.querySelector('main').hidden=false;
await bindConnections(context);
await bindOverview(context);
if(client)try{chrome.setUser(await resolveUser(client));}catch{console.error('[studio] Account verification unavailable');}
if(location.pathname==='/account/'){
 const account=chrome.account,mount=document.querySelector('main');
 account.hidden=true;mount.replaceChildren(account);account.classList.add('studio-auth-page');account.setAttribute('open','');account.querySelector('#account-close').hidden=true;
}
await bindBilling(context);
await bindAccountSecurity(context);
await bindArtistMetadata(context);
await bindArtistIdentity(context);
await bindArtistApplication(context);
await notificationsReady;
await bindReleaseMetadata(context);
await bindPublishedReleases(context);
await bindConcerts(context);
await bindWorkspace(context);
await bindArtistContent(context);
await bindArtistNavigation(context);
await bindArtistPages(context);
await bindCommerce(context);
await bindDomains(context);
await bindShares(context);
await bindAgreementDrafts(context);
await bindAgreementIntake(context);
await bindSigningRehearsals(context);
await bindBank(context);
await bindSubscriptions(context);
await bindSubscriptionPayments(context);
await bindArtistEditor(context);
await bindEditorSearch(context);
await bindPortfolio(context);
await window.NeuroartanPageLoading?.images(document.body);
}catch(error){console.error('[studio] Workspace initialization failed',error);}finally{
 window.NeuroartanPageLoading?.finish();
 if(location.pathname==='/account/'){
  chrome.account.hidden=false;
  const focus=()=>chrome.account.querySelector('[data-recovery-form]:not([hidden]) input,[data-auth-form]:not([hidden]) input[type=email]')?.focus({preventScroll:true});
  if(document.querySelector('.privacy-preferences[open]'))document.addEventListener('cookie-consent:closed',focus,{once:true});else focus();
 }
}
document.querySelectorAll('[data-signout]').forEach(button=>{button.disabled=!client;button.addEventListener('click',async()=>{if(!client)return;button.disabled=true;try{const result=await client.auth.signOut({scope:'local'});if(result.error)throw result.error;}catch{button.disabled=false;button.setAttribute('aria-label','Try signing out again');}});});
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.dataset.studioVisible='true';observer.unobserve(entry.target);}});document.querySelectorAll('.studio-surface header,.surface-card').forEach(item=>{item.dataset.studioReveal='';observer.observe(item);});}
}
initializeStudio().catch(()=>{window.NeuroartanPageLoading?.finish();console.error('[studio] Sign-in could not be verified');});
