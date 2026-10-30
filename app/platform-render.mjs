import {readFile} from 'node:fs/promises';
import {renderIcon} from './icon-render.mjs';
import {payoutSettingsMarkup} from './bank-render.mjs';
import {subscriptionsMarkup} from './subscriptions-render.mjs';
import {accountSecurityMarkup} from './account-security-render.mjs';
import {connectionsMarkup} from './connections-render.mjs';
import {overviewMarkup,partnershipThemesMarkup} from './overview-render.mjs';
const data=JSON.parse(await readFile(new URL('../content/platform.json',import.meta.url),'utf8'));
const icon=renderIcon;
export function renderPlatformNavigation(page,e){
  return `<aside class="studio-platform-rail" aria-label="Artist workspace"><div class="studio-platform-rail-scroll"><button class="studio-header-control" type="button" data-platform-rail-toggle aria-label="Collapse navigation" aria-expanded="true" aria-controls="studio-workspace-navigation">${icon('panel',e)}</button><nav id="studio-workspace-navigation" aria-label="Workspace navigation">${data.groups.map(group=>`<section class="studio-platform-group"><h2>${e(group.label)}</h2>${group.items.map(item=>`<a href="${e(item.path)}" aria-label="${e(item.label)}"${page.path===item.path?' aria-current="page"':''}>${icon(item.icon,e)}<span>${e(item.label)}</span></a>`).join('')}</section>`).join('')}</nav></div></aside>`;
}
export function renderMenu({e}){
  const links=items=>items.map(item=>`<a href="${e(item.path)}">${icon(item.icon,e)}<span>${e(item.label)}</span></a>`).join('');
  return `<div class="studio-menu-workspace">${links(data.groups.flatMap(group=>group.items))}</div>${links(data.menu)}`;
}
export function renderOverview(e){
  return overviewMarkup(e,icon);
}
export function renderSettings(e){
  const panels=`<section class="studio-settings-group" id="settings-appearance" data-settings-panel="appearance" role="tabpanel" aria-labelledby="settings-tab-appearance" tabindex="0">${appearanceMarkup}</section><section class="studio-settings-group" id="settings-privacy" data-settings-panel="privacy" role="tabpanel" aria-labelledby="settings-tab-privacy" hidden tabindex="0"><h2>Privacy</h2><p>Manage optional preference storage without changing essential account security.</p><button class="ui-button" type="button" data-studio-preferences>${icon('cookies',e)}Cookies & preferences</button><a href="${legalUrl('/privacy/')}">Privacy notice</a></section><section class="studio-settings-group" id="settings-security" data-settings-panel="security" role="tabpanel" aria-labelledby="settings-tab-security" hidden tabindex="0"><h2>Account security</h2><p>${e(data.securityNotice)}</p>${accountSecurityMarkup(name=>icon(name,e))}<button class="ui-button" data-studio-account-open type="button">${icon('account',e)}Account access</button><button class="ui-button" type="button" data-reset-password>${icon('password',e)}Reset password</button><button class="ui-button" type="button" data-signout>Sign out</button><p role="status" data-security-status></p></section><section class="studio-settings-group" id="settings-connections" data-settings-panel="connections" role="tabpanel" aria-labelledby="settings-tab-connections" hidden tabindex="0">${connectionsMarkup(e,icon)}</section>`;
  const privatePanels=`<section class="studio-settings-group studio-account" id="settings-addresses" data-settings-panel="addresses" role="tabpanel" aria-labelledby="settings-tab-addresses" hidden><h2>Addresses</h2><p>Your billing address stays private and is never published on your artist page.</p><div data-billing-mount></div></section><section class="studio-settings-group" id="settings-payments" data-settings-panel="payments" role="tabpanel" aria-labelledby="settings-tab-payments" hidden>${payoutSettingsMarkup(e)}</section>`;
  const subscriptionPanel=`<section class="studio-settings-group" id="settings-subscription" data-settings-panel="subscription" role="tabpanel" aria-labelledby="settings-tab-subscription" hidden>${subscriptionsMarkup(e,icon)}</section>`;
  return `<section class="studio-settings" aria-label="Studio settings"><div class="studio-settings-navigation" role="tablist" aria-label="Settings topics"><div class="studio-settings-navigation-items">${data.settings.map((item,index)=>`<button type="button" role="tab" id="settings-tab-${e(item.id)}" aria-controls="settings-${e(item.id)}" aria-selected="${index===0}" tabindex="${index===0?0:-1}" data-settings-tab="${e(item.id)}">${settingsIcon(item.id)?`<img class="studio-icon" src="${e(settingsIcon(item.id))}" alt="">`:icon(item.icon,e)}<span>${e(item.label)}</span></button>`).join('')}</div></div><div class="studio-settings-content">${panels}${privatePanels}${subscriptionPanel}</div></section>`;
}
import {appearanceMarkup as sharedAppearanceMarkup,settingsIcon,legalUrl} from './platform-sources.mjs';
const appearanceMarkup=partnershipThemesMarkup(e=>String(e))+sharedAppearanceMarkup.replace(/(id="home-platform-theme-effects-title">Custom visual layers<\/span>\s*<\/div>)/,`$1<p class="surface-status">${data.visualLayers.notice}</p>`);
