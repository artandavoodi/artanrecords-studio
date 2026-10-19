export function readChoice(storage,config,now=Date.now()){
  try{const consent=JSON.parse(storage.getItem('neuroartan.cookieConsent'));if(consent&&consent.state!=='pending')return consent.preferences?.['experience-preferences']?'allow':'skip';}catch{}
  try{const saved=JSON.parse(storage.getItem(config.choiceKey));return ['allow','skip'].includes(saved?.choice)&&Number.isFinite(saved.expires)&&saved.expires>now?saved.choice:null;}catch{return null;}
}
export function installPreferenceStorage(){
  const runtime=window.__NEURO_MAIN_RUNTIME__||={};
  const allowed=()=>{try{return JSON.parse(localStorage.getItem('neuroartan.cookieConsent'))?.preferences?.['experience-preferences']===true;}catch{return false;}};
  runtime.preferenceStorage={getItem(key){try{return (allowed()?localStorage:sessionStorage).getItem(key);}catch{return null;}},setItem(key,value){try{sessionStorage.setItem(key,value);if(allowed())localStorage.setItem(key,value);}catch{}},removeItem(key){try{localStorage.removeItem(key);sessionStorage.removeItem(key);}catch{}}};
  return runtime.preferenceStorage;
}
export function restoreAppearance(storage,config){
  if(readChoice(storage,config)!=='allow')return null;
  try{const value=storage.getItem(config.themeKey);return ['light','dark'].includes(value)?value:null;}catch{return null;}
}
export function applyAppearance(value){
  if(!['light','dark'].includes(value))return;
  document.documentElement.dataset.theme=value;
  document.documentElement.dataset.themeEffective=value;
  document.dispatchEvent(new Event('studio-appearance-change'));
}
export function saveAppearance(storage,config,value){
  if(!['light','dark'].includes(value)||readChoice(storage,config)!=='allow')return;
  try{storage.setItem(config.themeKey,value);}catch{}
}
