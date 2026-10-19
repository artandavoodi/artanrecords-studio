import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {cookieMarkup} from './platform-sources.mjs';
import {renderPlatformNavigation,renderOverview,renderSettings} from './platform-render.mjs';
import {renderIcon} from './icon-render.mjs';
export {renderMenu} from './platform-render.mjs';
export {renderNavigation,renderFooter} from './shell-render.mjs';
export {renderActions} from './dialog-render.mjs';
import {renderDialogs as accountDialogs} from './dialog-render.mjs';
export function renderDialogs(context){return accountDialogs(context)+`<div id="cookie-consent-mount">${cookieMarkup}</div>`;}
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
  const header=`<header><h1>${e(page.heading||page.title)}</h1><p class="reading">${e(page.description)}</p></header>`;
  let body='';
  if(page.path==='/account/')body=`<div class="studio-hero-actions"><button class="ui-button" type="button" data-studio-account-open>${icon('signin')}Sign in</button><a href="/profile/">Manage your profile</a></div>`;
  else if(page.path==='/profile/')body=`<section class="studio-account" data-profile-view><p role="status" data-profile-status>Checking account availability...</p><div data-profile-guest hidden><a href="/account/">Sign in to manage your profile</a></div><form data-profile-form hidden><div class="studio-avatar"><img data-avatar alt="Your profile photograph" hidden><label class="studio-photo-action" aria-label="Change profile photograph">${icon('camera')}<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photograph"></label></div>${settings.profileFields.map(field=>`<label>${e(field.label)}<input name="${e(field.name)}" type="${e(field.type||'text')}" autocomplete="${e(field.autocomplete)}" maxlength="${field.max}"></label>`).join('')}<label>Biography<textarea name="biography" maxlength="2000" rows="4"></textarea></label><label>Email<input data-profile-email type="email" readonly autocomplete="email"></label><p data-verification></p><label>Phone number<input name="phone" type="tel" autocomplete="tel" inputmode="tel"></label><button type="button" data-verify-phone>${icon('check')}Verify number</button><p data-phone-status role="status"></p><button type="submit">${icon('check')}${e(settings.labels.save)}</button><button type="button" data-reset-password>Reset password</button><button type="button" data-signout>${e(settings.labels.signout)}</button></form></section>`;
  else if(['/privacy/','/terms/','/cookies/'].includes(page.path)){const notice=legal.notices.find(item=>item.legacyPath===page.path);body=`<p class="publication-meta"><span>Effective date: ${e(notice.effectiveDate)}</span><span>Last updated: ${e(notice.lastUpdated)}</span></p>${notice.sections.map(section=>`<section class="surface-section" id="${e(section.id)}"><h2>${e(section.title)}</h2>${section.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}</section>`).join('')}`;}
  else if(page.path==='/search/')body=`<button class="ui-button" type="button" data-studio-search-open>${icon('search')}Open search</button>`;
  else if(page.path==='/')body=renderOverview(e);
  else if(page.path==='/settings/')body=renderSettings(e);
  else if(page.path==='/releases/')body=`<section class="studio-account" data-submissions-view><p data-submissions-status role="status">${e(settings.unavailable)}</p><form data-submission-form hidden><label>Release title<input name="title" maxlength="200" required></label><label>Type of work<select name="work_type"><option value="recording">Recording</option><option value="mix">Mix</option><option value="master">Master</option><option value="artwork">Artwork</option></select></label><label>Notes<textarea name="notes" maxlength="5000" rows="4"></textarea></label><p>Save release information privately. Audio delivery is not enabled yet.</p><button type="submit">Save draft</button></form><div data-submissions-list></div><a href="/account/">Your Studio account</a></section>`;
  else if(page.path==='/agreements/')body=`<section data-contracts-view><p data-contracts-status role="status">Sign in to view agreements shared with your account. Digital signing is not enabled yet.</p><div data-contracts-list></div><a href="/account/">Your Studio account</a></section>`;
  else body=`<p class="surface-status" role="status">${e(page.status||settings.unavailable)}</p><a href="/account/">Your Studio account</a>`;
  const content=`<section class="${page.path==='/settings/'?'studio-settings-surface':'site-section'} surface studio-surface">${page.path==='/settings/'?'<h1 class="sr-only">Settings</h1>':header}${body}</section>`;
  return ['/privacy/','/terms/','/cookies/','/account/','/search/'].includes(page.path)?content:`<div class="studio-platform" data-platform-layout>${renderPlatformNavigation(page,e)}<div class="studio-platform-content">${content}</div></div>`;
}
