import config from '../content/account.json';
import {restoreAppearance,applyAppearance} from './appearance.js';
import {installPreferenceStorage} from './appearance.js';
installPreferenceStorage();
document.documentElement.dataset.studioLoading='true';
// A failed module download must not leave the application permanently concealed.
window.__studioLoadingFallback=setTimeout(()=>{delete document.documentElement.dataset.studioLoading;const main=document.querySelector('main');if(main)main.inert=false;},20000);
document.documentElement.dataset.studioRail=window.__NEURO_MAIN_RUNTIME__.preferenceStorage.getItem(config.preferences.railKey)||'open';
const saved=window.__NEURO_MAIN_RUNTIME__.preferenceStorage.getItem('neuroartan-theme-state');
try{const state=JSON.parse(saved);if(state?.effective)applyAppearance(state.effective);}catch{}
if(!saved)try{applyAppearance(restoreAppearance(localStorage,config.preferences));}catch{}
