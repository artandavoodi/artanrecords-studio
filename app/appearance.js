export function readChoice(storage,config,now=Date.now()){
  try{const saved=JSON.parse(storage.getItem(config.choiceKey));return ['allow','skip'].includes(saved?.choice)&&Number.isFinite(saved.expires)&&saved.expires>now?saved.choice:null;}catch{return null;}
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
