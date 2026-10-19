import config from '../content/account.json';
import {installPreferenceStorage} from './appearance.js';
export async function bindPreferences(){
  const storage=installPreferenceStorage();
  const legal=['/privacy/','/terms/','/cookies/'].includes(location.pathname);
  if(legal)document.querySelector('[data-cookie-consent=root]').dataset.cookieConsentAutoprompt='false';
  const open=()=>document.dispatchEvent(new CustomEvent('cookie-consent:open-request',{detail:{surface:'settings'}}));
  window.ArtanRecordsPreferences={open,saveTheme(value){window.NeuroartanTheme?.applyTheme(value);}};
  await import('./neuroartan/assets/js/core/02-systems/theme.js');
  await import('./neuroartan/assets/js/core/01-foundation/toggle.js');
  document.addEventListener('cookie-consent:state-changed',()=>{
    const keys=['neuroartan-theme-state','neuroartan.toggle.state',config.preferences.railKey];
    let allowed=false;try{allowed=JSON.parse(localStorage.getItem('neuroartan.cookieConsent'))?.preferences?.['experience-preferences']===true;}catch{}
    for(const key of keys){try{const value=sessionStorage.getItem(key);if(allowed&&value!==null)localStorage.setItem(key,value);else if(!allowed)localStorage.removeItem(key);}catch{}}
    storage.setItem('neuroartan-theme-state',JSON.stringify(window.NeuroartanTheme.getCurrentThemeState()));
  });
  await import('./neuroartan/assets/js/layers/website/overlays/cookie/cookie-consent.js');
  let first=true;try{first=!JSON.parse(localStorage.getItem('neuroartan.cookieConsent'))?.state;}catch{}
  if(first&&!legal)requestAnimationFrame(open);
  document.querySelectorAll('[data-studio-preferences]').forEach(button=>button.addEventListener('click',open));
  document.querySelectorAll('#cookie-consent-mount a').forEach(link=>link.addEventListener('click',()=>{document.body.classList.remove('cookie-consent-open','cookie-consent-closing');}));
}
