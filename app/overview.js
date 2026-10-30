import appearance from '../content/appearance.json' with {type:'json'};
import {hasProAccess} from './subscriptions.js';
export function partnershipSummary(application){
 const tier=application?.status==='approved'&&['silver','gold','platinum'].includes(application.approved_tier)?application.approved_tier:null;
 return {tier,label:tier?tier[0].toUpperCase()+tier.slice(1):application?.status==='pending'?'Under review':application?.status==='rejected'?'Not approved':'No approved partnership',detail:tier?'Partnership approved.':application?.status==='pending'?'Awaiting review.':'Introduce your music to discuss a partnership.'};
}
export async function bindOverview({client,resolveUser}){
 const root=document.querySelector('[data-studio-overview]');if(!root||!client)return;
 try{const user=await resolveUser(client);if(!user)return;
  const [application,access]=await Promise.all([client.from('studio_artist_applications').select('status,approved_tier,requested_tier').eq('account_id',user.id).maybeSingle(),client.rpc('studio_subscription_status')]);
  if((await resolveUser(client))?.id!==user.id)return;
  if(application.error)throw Error('Your partnership could not be verified.');const summary=partnershipSummary(application.data);
  root.querySelector('[data-overview-tier]').textContent=summary.label;root.querySelector('[data-overview-partnership]').textContent=summary.detail;if(summary.tier)root.querySelector('.studio-overview-membership').dataset.partnershipTier=summary.tier;
  root.querySelector('[data-overview-access]').textContent=access.error?'Access unavailable':hasProAccess(access.data)?'Studio Pro active':'Studio Pro not active';
  root.querySelector('[data-overview-entitlement]').textContent=hasProAccess(access.data)?'Included access is verified.':'Profile and draft tools are available.';
 }catch(error){root.querySelector('[data-overview-status]').textContent=error.message||'Account overview could not be loaded.';}
}
export function bindPartnershipThemes(){
 const root=document.documentElement,inline=root.style.getPropertyValue('--color-primary1');
 root.style.removeProperty('--color-primary1');
 const base=getComputedStyle(root).getPropertyValue('--color-primary1').trim();
 if(inline)root.style.setProperty('--color-primary1',inline);
 document.documentElement.style.setProperty('--studio-brand-primary1',base);
 const clear=()=>{delete document.documentElement.dataset.partnershipTheme;document.querySelectorAll('[data-partnership-theme]').forEach(button=>button.setAttribute('aria-pressed','false'));};
 document.addEventListener('input',event=>{if(event.target.matches?.('[data-theme-token]'))clear();});
 document.querySelector('[data-home-platform-theme-palette-select]')?.addEventListener('change',clear);
 document.querySelectorAll('[data-theme-option]').forEach(button=>button.addEventListener('click',clear));
 for(const button of document.querySelectorAll('[data-partnership-theme]'))button.setAttribute('aria-pressed',String(button.dataset.partnershipTheme===document.documentElement.dataset.partnershipTheme));
 for(const button of document.querySelectorAll('[data-partnership-theme]'))button.onclick=()=>{
  const preset=appearance.presets.find(theme=>theme.id===button.dataset.partnershipTheme),theme=window.NeuroartanTheme;if(!preset||!theme)return;
  const tokens=resolveAppearanceTokens(preset.tokens,key=>getComputedStyle(document.documentElement).getPropertyValue(key).trim());
  document.documentElement.dataset.partnershipTheme=preset.id;
  const state=theme.getCurrentThemeState();theme.applyThemeState({...state,theme:'custom',effective:preset.effective,tokens});
  for(const option of document.querySelectorAll('[data-partnership-theme]'))option.setAttribute('aria-pressed',String(option===button));
 };
}
export function resolveAppearanceTokens(specs,read){
 return Object.fromEntries(Object.entries(specs).map(([key,[first,second,weight=0]])=>{
  const a=read(first),b=second?read(second):a;if(!/^#[0-9a-f]{6}$/i.test(a)||!/^#[0-9a-f]{6}$/i.test(b))throw Error('Theme colour unavailable');
  const color='#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-weight/100)+parseInt(b.slice(i,i+2),16)*weight/100).toString(16).padStart(2,'0')).join('');
  return [key,color];
 }));
}
