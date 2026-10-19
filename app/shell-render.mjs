import {renderActions} from './dialog-render.mjs';
import {renderMenu} from './platform-render.mjs';
import {readFile} from 'node:fs/promises';
const data=JSON.parse(await readFile(new URL('../content/platform.json',import.meta.url),'utf8'));
export function renderNavigation({e,brand,versionedAsset}){
  const labels=brand.labels;
  return `<div class="studio-header-frame"><header class="site-navigation studio-navigation"><a class="skip-link" href="#main-content">${e(labels.skip)}</a><a class="studio-brand" href="/" aria-label="${e(data.name)}"><span class="studio-brand-wordmark"><img class="label-wordmark label-wordmark--light" src="/${e(versionedAsset(brand.logoAssets.wordmarkBlack))}" alt=""><img class="label-wordmark label-wordmark--dark" src="/${e(versionedAsset(brand.logoAssets.wordmarkWhite))}" alt=""></span><span class="studio-brand-label">${e(data.chrome.label)}</span></a><div class="studio-header-tools">${renderActions()}</div><button class="site-menu-toggle" data-menu-toggle data-close-label="${e(labels.menuClose)}" aria-label="${e(labels.menuOpen)}" aria-expanded="false" aria-controls="site-menu" type="button" hidden><span class="site-menu-toggle__line" aria-hidden="true"></span><span class="site-menu-toggle__line" aria-hidden="true"></span></button></header></div><section class="site-menu" id="site-menu" data-menu hidden><div class="site-menu__surface"><nav class="site-menu__links" aria-label="${e(labels.menuOpen)}">${renderMenu({e})}</nav></div></section>`;
}
export function renderFooter({e,config}){return `<footer class="studio-footer"><p>${e(config.copyright)}</p></footer>`;}
