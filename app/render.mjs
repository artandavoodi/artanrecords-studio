import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {cookieMarkup,visualLayersMarkup} from './platform-sources.mjs';
import {renderPlatformNavigation,renderOverview,renderSettings} from './platform-render.mjs';
import {renderIcon} from './icon-render.mjs';
import {profileMarkup} from './profile-render.mjs';
import {releaseMetadataEditor} from './metadata-render.mjs';
import {concertsMarkup} from './concert-render.mjs';
import {commerceMarkup} from './commerce-render.mjs';
import {bankMarkup} from './bank-render.mjs';
import {agreementsMarkup} from './agreements-render.mjs';
export {renderMenu} from './platform-render.mjs';
export {renderNavigation,renderFooter} from './shell-render.mjs';
export {renderActions} from './dialog-render.mjs';
import {renderDialogs as accountDialogs} from './dialog-render.mjs';
export function renderDialogs(context){return visualLayersMarkup+accountDialogs(context)+`<div class="ui-loading-surface" role="status" aria-label="Loading Studio"><span class="ui-loader-circle" aria-hidden="true"></span></div><div id="cookie-consent-mount">${cookieMarkup}</div>`;}
const settings=JSON.parse(await readFile(new URL('../content/account.json',import.meta.url),'utf8'));
const programmes=JSON.parse(await readFile(new URL('../content/programmes.json',import.meta.url),'utf8'));
const legal=JSON.parse(await readFile(new URL('../assets/data/studio-legal.json',import.meta.url),'utf8'));
export async function renderHead(){
  const version=async path=>createHash('sha256').update(await readFile(new URL(path,import.meta.url))).digest('hex').slice(0,12);
  return `<meta name="referrer" content="no-referrer"><link rel="manifest" href="/manifest.webmanifest"><script src="/app/dist/appearance.js?v=${await version('./dist/appearance.js')}"></script><link rel="stylesheet" href="/app/dist/studio.css?v=${await version('./dist/studio.css')}"><script type="module" src="/app/dist/studio.js?v=${await version('./dist/studio.js')}"></script>`;
}
if(programmes.referrals.enabled||programmes.payments.enabled||programmes.royaltyWithdrawals.enabled)throw Error('Programme activation requires verified backend implementation');
export async function render(page,{config,e,search}){
  const icon=name=>renderIcon(name,e);
  const header=page.path==='/profile/'?`<h1 class="sr-only">${e(page.heading||page.title)}</h1>`:`<header><h1>${e(page.heading||page.title)}</h1><p class="reading">${e(page.description)}</p></header>`;
  let body='';
  if(page.path==='/account/')body=`<div class="studio-hero-actions"><button class="ui-button" type="button" data-studio-account-open>${icon('signin')}Sign in</button><a href="/profile/">Manage your profile</a></div>`;
  else if(page.path==='/profile/')body=profileMarkup({settings,e,icon});
  else if(['/privacy/','/terms/','/cookies/'].includes(page.path)){const notice=legal.notices.find(item=>item.legacyPath===page.path);body=`<p class="publication-meta"><span>Effective date: ${e(notice.effectiveDate)}</span><span>Last updated: ${e(notice.lastUpdated)}</span></p>${notice.sections.map(section=>`<section class="surface-section" id="${e(section.id)}"><h2>${e(section.title)}</h2>${section.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}</section>`).join('')}`;}
  else if(page.path==='/search/')body=`<button class="ui-button" type="button" data-studio-search-open>${icon('search')}Open search</button>`;
  else if(page.path==='/')body=renderOverview(e);
  else if(page.path==='/settings/')body=renderSettings(e);
  else if(page.path==='/releases/')body=`<nav class="studio-profile-tabs" role="tablist" aria-label="Releases"><button type="button" role="tab" id="tab-released" aria-selected="true" aria-controls="released" data-settings-tab="released">${icon('release')}<span>Released</span></button><button type="button" role="tab" id="tab-release-drafts" aria-selected="false" aria-controls="release-drafts" tabindex="-1" data-settings-tab="release-drafts">${icon('plus')}<span>New release & drafts</span></button></nav><section id="released" role="tabpanel" aria-labelledby="tab-released" data-settings-panel="released" data-published-releases><p role="status">Checking your released catalogue...</p><div class="studio-published-list" data-published-list></div></section><section id="release-drafts" role="tabpanel" aria-labelledby="tab-release-drafts" data-settings-panel="release-drafts" hidden>${releaseMetadataEditor(e)}</section>`;
  else if(page.path==='/concerts/')body=concertsMarkup(e);
  else if(page.path==='/store/')body=commerceMarkup(e,icon);
  else if(page.path==='/payouts/')body=bankMarkup(e);
  else if(page.path==='/payments/')body=`<a class="ui-button" href="/settings/#payments">${icon('settings')}Open payment & payout settings</a>`;
  else if(page.path==='/agreements/')body=agreementsMarkup(e,icon);
  else body=`<p class="surface-status" role="status">${e(page.status||settings.unavailable)}</p><a href="/account/">Your Studio account</a>`;
  const content=`<section class="${page.path==='/settings/'?'studio-settings-surface':'site-section'} surface studio-surface">${page.path==='/settings/'?'<h1 class="sr-only">Settings</h1>':header}${body}</section>`;
  return ['/privacy/','/terms/','/cookies/','/account/','/search/'].includes(page.path)?content:`<div class="studio-platform" data-platform-layout>${renderPlatformNavigation(page,e)}<div class="studio-platform-content">${content}</div></div>`;
}
