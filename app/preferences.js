import config from '../content/account.json';
import {installPreferenceStorage} from './appearance.js';
import {initializePreferences} from '../assets/js/core/preferences.js';
export async function bindPreferences(){
  const storage=installPreferenceStorage();
  const legal=['/privacy/','/terms/','/cookies/'].includes(location.pathname);
  let controller;
  const open=()=>controller?.open();
  window.ArtanRecordsPreferences={open,saveTheme(value){window.NeuroartanTheme?.applyTheme(value);}};
  await import('./neuroartan/assets/js/core/02-systems/theme.js');
  await import('./neuroartan/assets/js/core/01-foundation/toggle.js');
  document.addEventListener('cookie-consent:state-changed',()=>{
    const keys=['neuroartan-theme-state','neuroartan.toggle.state',config.preferences.railKey];
    let allowed=false;try{allowed=JSON.parse(localStorage.getItem('neuroartan.cookieConsent'))?.preferences?.['experience-preferences']===true;}catch{}
    for(const key of keys){try{const value=sessionStorage.getItem(key);if(allowed&&value!==null)localStorage.setItem(key,value);else if(!allowed)localStorage.removeItem(key);}catch{}}
    storage.setItem('neuroartan-theme-state',JSON.stringify(window.NeuroartanTheme.getCurrentThemeState()));
  });
  const choice=()=>{try{const record=JSON.parse(localStorage.getItem('neuroartan.cookieConsent'));if(!['accepted','rejected','customized'].includes(record?.state))return null;if(record.expires&&record.expires<Date.now())return null;return record.preferences?.['experience-preferences']?'allow':'skip';}catch{return null;}};
  controller=await initializePreferences({legal,noticeUrl:'/cookies/',state:{choice,choose(value){
    const allowed=value==='allow',record={state:allowed?'accepted':'rejected',preferences:{essential:true,'experience-preferences':allowed,'analytics-performance':false,'analytics-usage':false,'experience-continuity':false},updatedAt:new Date().toISOString(),expires:Date.now()+config.preferences.validDays*86400000};
    try{localStorage.setItem('neuroartan.cookieConsent',JSON.stringify(record));}catch{}
    document.dispatchEvent(new CustomEvent('cookie-consent:state-changed',{detail:record}));
  }}});
  document.querySelectorAll('[data-studio-preferences]').forEach(button=>button.addEventListener('click',open));
}
