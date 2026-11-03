/* The canonical Neuroartan panel owns presentation and interaction. */
export async function initializePreferences(options={}){
  if(document.querySelector('[data-cookie-consent="root"]'))return;
  const [site,markup]=await Promise.all([fetch('/assets/data/site.json').then(response=>{if(!response.ok)throw Error('Preferences unavailable');return response.json();}),fetch('/assets/fragments/layers/website/cookie/cookie-consent.html').then(response=>{if(!response.ok)throw Error('Preferences unavailable');return response.text();})]);
  const data=site.preferences,state=options.state||window.ArtanRecordsPreferences;
  if(!state)return;
  const mount=document.createElement('div');mount.id='cookie-consent-mount';
  mount.innerHTML=markup.replaceAll('Neuroartan','Artanrecords');
  const panel=mount.querySelector('[data-cookie-consent="root"]');panel.dataset.cookieConsentAutoprompt='false';panel.dataset.cookieConsentAssetBase='/assets/fragments/layers/website/cookie';panel.dataset.cookieConsentValidDays=String(window.ArtanRecordsPreferenceConfig.validDays);
  mount.querySelector('.cookie-consent-copy').textContent=data.description;
  for(const node of mount.querySelectorAll('[data-cookie-consent-language],.cookie-consent-language-status'))node.remove();
  for(const link of mount.querySelectorAll('.cookie-consent-footer-link')){const kind=link.href.includes('terms')?'terms':link.href.includes('privacy')?'privacy':'cookies',url=new URL(options.noticeUrl||'/legal/',location.href);url.hash=kind;link.href=url.href;}
  for(const key of data.unavailableCategories){for(const node of mount.querySelectorAll(`[data-cookie-consent-toggle="${key}"],[data-cookie-consent-subtoggle="${key}"],[data-cookie-consent-category="${key}"],[data-cookie-consent-subcategory="${key}"]`)){node.disabled=true;node.checked=false;node.setAttribute('aria-checked','false');}}
  mount.querySelector('[data-i18n-key="cookieConsent.analytics.detail"]').textContent=data.analyticsNotice;
  document.body.append(mount);
  const styles=['/assets/css/core/03-primitives/toggle.css','/assets/css/layers/website/overlays/cookie/cookie-consent.css','/assets/css/layers/website/overlays/cookie/cookie-learning-overlay.css'];
  await Promise.all(styles.map(href=>new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.onload=resolve;link.onerror=reject;document.head.append(link);})));
  // Preserve an existing explicit choice while migrating to the granular record.
  try{if(!localStorage.getItem('neuroartan.cookieConsent')&&state.choice()){const allowed=state.choice()==='allow';localStorage.setItem('neuroartan.cookieConsent',JSON.stringify({state:allowed?'accepted':'rejected',preferences:{essential:true,experience:allowed,'experience-preferences':allowed,analytics:false,'analytics-performance':false,'analytics-usage':false,'experience-continuity':false},expires:Date.now()+window.ArtanRecordsPreferenceConfig.validDays*86400000}));}}catch{}
  document.addEventListener('cookie-consent:state-changed',event=>state.choose(event.detail.preferences['experience-preferences']?'allow':'skip'));
  await import('./01-foundation/toggle.js');
  await import('../layers/website/overlays/cookie/cookie-consent.js');
  document.dispatchEvent(new CustomEvent('cookie-consent:mounted'));
  const open=()=>document.dispatchEvent(new CustomEvent('cookie-consent:open-request',{detail:{surface:'settings'}}));
  const settings=document.createElement('button');settings.type='button';settings.textContent=data.settings;
  const footer=document.querySelector('[data-footer-preferences]')||document.querySelector('footer .information-links');
  footer?.append(settings);settings.addEventListener('click',open);
  if(state.choice()===null&&!(options.legal??['/legal/','/privacy/','/terms/','/cookies/'].includes(location.pathname)))open();
  return {open};
}
