import platform from '../content/platform.json' with {type:'json'};
const config=platform.overview;
import {hasProAccess} from './subscriptions.js';
export function partnershipSummary(application){
 const tier=application?.status==='approved'&&['silver','gold','platinum'].includes(application.approved_tier)?application.approved_tier:null;
 return {tier,label:tier?tier[0].toUpperCase()+tier.slice(1):application?.status==='pending'?'Under review':application?.status==='rejected'?'Not approved':'No approved partnership',detail:tier?'Tier approved. Active agreement and included access must be verified separately.':application?.status==='pending'?'Your requested tier is a preference, not an approval.':'Introduce your music to discuss a partnership.'};
}
export async function bindOverview({client,resolveUser}){
 const root=document.querySelector('[data-studio-overview]');if(!root||!client)return;
 try{const user=await resolveUser(client);if(!user)return;
  const [application,access]=await Promise.all([client.from('studio_artist_applications').select('status,approved_tier,requested_tier').eq('account_id',user.id).maybeSingle(),client.rpc('studio_subscription_status')]);
  if((await resolveUser(client))?.id!==user.id)return;
  if(application.error)throw Error('Your partnership could not be verified.');const summary=partnershipSummary(application.data);
  root.querySelector('[data-overview-tier]').textContent=summary.label;root.querySelector('[data-overview-partnership]').textContent=summary.detail;if(summary.tier)root.querySelector('.studio-overview-membership').dataset.partnershipTier=summary.tier;
  root.querySelector('[data-overview-access]').textContent=access.error?'Could not verify':hasProAccess(access.data)?'Studio Pro · active':'No verified paid or included access';
  root.querySelector('[data-overview-entitlement]').textContent=hasProAccess(access.data)?'Current server-verified access. Partnership inclusion follows the qualifying agreement.':'Your existing profile and draft tools remain available. A tier request does not activate a subscription.';
  if(summary.tier){const included=JSON.parse(root.querySelector('[data-included-plans]').dataset.includedPlans)[summary.tier];root.querySelector('[data-overview-partnership]').textContent=summary.detail+' Your '+summary.label+' partnership includes '+included+' while its qualifying agreement is active.';}
 }catch(error){root.querySelector('[data-overview-status]').textContent=error.message||'Account overview could not be loaded.';}
}
export function bindPartnershipThemes(){
 for(const button of document.querySelectorAll('[data-partnership-theme]'))button.setAttribute('aria-pressed',String(button.dataset.partnershipTheme===document.documentElement.dataset.partnershipTheme));
 for(const button of document.querySelectorAll('[data-partnership-theme]'))button.onclick=()=>{
  const preset=config.themes.find(theme=>theme.id===button.dataset.partnershipTheme),theme=window.NeuroartanTheme;if(!preset||!theme)return;
  const accent=getComputedStyle(document.documentElement).getPropertyValue(preset.accent).trim();if(!/^#[0-9a-f]{6}$/i.test(accent))return;
  document.documentElement.dataset.partnershipTheme=preset.id;
  const state=theme.getCurrentThemeState();theme.applyThemeState({...state,theme:'custom',tokens:{...state.tokens,accent,accentHover:accent}});
  for(const option of document.querySelectorAll('[data-partnership-theme]'))option.setAttribute('aria-pressed',String(option===button));
  document.querySelector('[data-partnership-theme-status]').textContent=preset.label+' accent applied. Appearance does not change your tier.';
 };
}
