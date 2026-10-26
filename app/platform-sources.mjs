import {readFile} from 'node:fs/promises';
const root=new URL('./neuroartan/',import.meta.url);
const publication=JSON.parse(await readFile(new URL('../assets/data/studio-legal.json',import.meta.url),'utf8'));
export const legalUrl=path=>publication.domain+publication.notices.find(notice=>notice.legacyPath===path).path;
const shell=JSON.parse(await readFile(new URL('assets/data/platform/home-platform-shell.json',root),'utf8'));
export function settingsIcon(id){
  const find=value=>{if(!value||typeof value!=='object')return null;if(value.id===id&&value.icon)return value.icon;for(const child of Object.values(value)){const found=find(child);if(found)return found;}return null;};
  const path=find(shell);return path?'/app/neuroartan'+path:null;
}
export async function platformFragment(path){
  return (await readFile(new URL(path,root),'utf8')).replaceAll('src="/registry/','src="/app/neuroartan/registry/');
}
export const cookieMarkup=(await platformFragment('assets/fragments/layers/website/cookie/cookie-consent.html'))
  .replace('data-cookie-consent="root"','data-cookie-consent="root" data-cookie-consent-asset-base="/app/neuroartan/assets/fragments/layers/website/cookie"')
  .replaceAll('Neuroartan','Artanrecords Studio')
  .replaceAll('/pages/legal/terms/index.html',legalUrl('/terms/'))
  .replaceAll('/pages/legal/privacy/index.html',legalUrl('/privacy/'))
  .replaceAll('/pages/legal/cookies/index.html',legalUrl('/cookies/'))
  .replace(/<button[^>]*data-cookie-consent-language="true"[\s\S]*?<\/button>/,'')
  .replace(/<p\s+class="cookie-consent-language-status"[\s\S]*?<\/p>/,'')
  .replace(/<p class="cookie-consent-copy"[^>]*>[\s\S]*?<\/p>/,'<p class="cookie-consent-copy">Essential storage supports security, sign-in and your consent choice. Choose whether to remember optional appearance and navigation preferences. Analytics are not connected.</p>')
  .replace(/[\t ]+$/gm,'');
export const appearanceMarkup=(await platformFragment('assets/fragments/layers/website/home/platform-menu/settings/appearance/index.html'))
  .replaceAll('home-platform-theme__mode-option"','ui-radio-list__item"')
  .replaceAll('home-platform-theme__mode-grid"','ui-radio-list"')
  .replaceAll('</span>\n        </button>','</span><span class="ui-radio-list__indicator" aria-hidden="true"></span>\n        </button>')
  .replace('class="home-platform-theme__section-toggle-icon" aria-hidden="true">⌄','class="home-platform-theme__section-toggle-icon" aria-hidden="true"><img class="studio-icon" src="/app/neuroartan/registry/icons/public/assets/core/navigation/chevron/chevron-down.svg" alt="">');
let backgroundShell=await platformFragment('assets/fragments/layers/website/home/background/home-background-shell.html');
for(const name of ['home-cinematic-wallpaper','home-hero-shader','home-breathing-circle','home-hero-matte']){
 const fragment=(await platformFragment('assets/fragments/layers/website/home/background/'+name+'.html')).replaceAll('="/assets/scenes/','="/app/neuroartan/assets/scenes/').replace('class="home-breathing-circle"','class="home-breathing-circle" data-visual-surface');
 backgroundShell=backgroundShell.replace(`data-include="${name}" aria-hidden="true"></div>`,`aria-hidden="true">${fragment}</div>`);
}
export const visualLayersMarkup='<div class="studio-visual-layers" aria-hidden="true">'+backgroundShell+'</div>';
