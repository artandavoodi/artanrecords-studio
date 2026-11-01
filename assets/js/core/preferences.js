import {mountPrivacyPreferences} from './privacy-preferences.js';
/* Domain-specific consent; rendering and interaction are the pinned Store component. */
export async function initializePreferences(options={}){
  if(document.querySelector('[data-preferences-panel]'))return;
  const [site,icons]=await Promise.all(['/assets/data/site.json','/assets/data/icons.json'].map(async url=>{const response=await fetch(url);if(!response.ok)throw Error('Preferences could not be loaded');return response.json();}));
  const data=site.preferences,state=options.state||window.ArtanRecordsPreferences;
  if(!state)return;
  const image=id=>{const record=icons.items.find(item=>item.id===id);if(!record)throw Error(`Unregistered preference icon: ${id}`);const img=document.createElement('img');img.src='/'+record.src;img.alt='';img.dataset.monochrome='true';return img;};
  const noticeUrl=options.noticeUrl||'/legal/#cookies';
  const settings=document.createElement('button');settings.type='button';settings.textContent=data.settings;
  const footer=document.querySelector('[data-footer-preferences]')||document.querySelector('footer .information-links');
  footer?.append(settings);
  return mountPrivacyPreferences({data,icon:image,state,noticeUrl,opener:settings,legal:options.legal??['/legal/','/privacy/','/terms/','/cookies/'].includes(location.pathname)});
}
