import config from '../content/account.json';
import {restoreAppearance,applyAppearance} from './appearance.js';
import {installPreferenceStorage} from './appearance.js';
import './neuroartan/assets/js/core/02-systems/page-loading.js';
installPreferenceStorage();
document.documentElement.dataset.studioRail=window.__NEURO_MAIN_RUNTIME__.preferenceStorage.getItem(config.preferences.railKey)||'open';
const saved=window.__NEURO_MAIN_RUNTIME__.preferenceStorage.getItem('neuroartan-theme-state');
try{const state=JSON.parse(saved);if(state?.effective)applyAppearance(state.effective);}catch{}
if(!saved)try{applyAppearance(restoreAppearance(localStorage,config.preferences));}catch{}
