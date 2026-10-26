import {showSaveConfirmation} from './neuroartan/assets/js/core/02-systems/toast.js';
const effects=['breathing-circle','cinematic-background','hero-shader','matte-atmosphere'];
const tokens=['accent','accentHover','background','text','surface','border'];
export function appearanceValues(value){
 const theme=value?.theme;if(!theme||!['company','system','custom','dark','light'].includes(theme.theme))return null;
 const colors={};for(const key of tokens){const color=theme.tokens?.[key];if(color!==undefined&&color!==''&&!/^#[0-9a-f]{6}$/i.test(color))return null;colors[key]=color||'';}
 return {theme:{theme:theme.theme,contrast:['low','standard','high'].includes(theme.contrast)?theme.contrast:'standard',palette:['neuroartan','mono','sovereign'].includes(theme.palette)?theme.palette:'neuroartan',tokens:colors},toggles:Object.fromEntries(effects.filter(key=>typeof value.toggles?.[key]==='boolean').map(key=>[key,value.toggles[key]]))};
}
export async function bindAccountAppearance({client,resolveUser}){
 if(!client)return;const owner=await resolveUser(client).catch(()=>null);if(!owner)return;
 let applying=false,changed=false,timer;
 const read=()=>{let saved={};try{saved=JSON.parse(window.__NEURO_MAIN_RUNTIME__?.preferenceStorage?.getItem('neuroartan.toggle.state')||'{}');}catch{}return appearanceValues({theme:window.NeuroartanTheme.getCurrentThemeState(),toggles:Object.fromEntries(effects.map(key=>[key,document.querySelector('[data-toggle-scope=homepage-theme][data-toggle-key="'+key+'"]')?.getAttribute('aria-checked')==='true'||saved['homepage-theme:'+key]===true]))});};
 const save=()=>{if(applying)return;changed=true;clearTimeout(timer);timer=setTimeout(async()=>{
  const value=read();if(!value||(await resolveUser(client).catch(()=>null))?.id!==owner.id)return;
  const result=await client.from('studio_user_preferences').upsert({account_id:owner.id,appearance:value},{onConflict:'account_id'});
  showSaveConfirmation(result.error?'Appearance changed on this device. Account sync could not finish; try again.':'Appearance saved to your account.');
 },600);};
 document.addEventListener('neuroartan:theme-changed',save);document.addEventListener('neuroartan:toggle-changed',save);
 const result=await client.from('studio_user_preferences').select('appearance').eq('account_id',owner.id).maybeSingle();
 if(result.error||changed||(await resolveUser(client).catch(()=>null))?.id!==owner.id)return;
 const value=appearanceValues(result.data?.appearance);if(!value)return;applying=true;
 try{
  window.NeuroartanTheme.applyThemeState(value.theme);
  const storage=window.__NEURO_MAIN_RUNTIME__?.preferenceStorage,states=Object.fromEntries(Object.entries(value.toggles).map(([key,checked])=>['homepage-theme:'+key,checked]));
  storage?.setItem('neuroartan.toggle.state',JSON.stringify(states));
  window.NeuroartanToggle.syncHomepageThemeToggleAttributesFromStorage();
  document.querySelectorAll('[data-toggle-scope=homepage-theme]').forEach(toggle=>window.NeuroartanToggle.syncToggleState(toggle,value.toggles[toggle.dataset.toggleKey]??true,{persist:false,emit:true}));
 }finally{applying=false;}
}
