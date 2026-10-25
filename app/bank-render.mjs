import {readFile} from 'node:fs/promises';
import {renderIcon} from './icon-render.mjs';
const data=JSON.parse(await readFile(new URL('../content/bank.json',import.meta.url),'utf8'));
if(data.liveEnabled)throw Error('Bank activation requires a verified financial service');
export function payoutSettingsMarkup(e){
  return `<h2>Payment & payout methods</h2><p>${e(data.settingsNotice)}</p><p class="surface-status" role="status">Not connected</p><a class="ui-button" href="/payouts/">${renderIcon('bank',e)}Bank</a>`;
}
export function bankMarkup(e){
  const panels=[`<p role="status">${e(data.notice)}</p><dl class="studio-connection-list">${data.metrics.map(label=>`<div><dt>${e(label)}</dt><dd>Unavailable</dd></div>`).join('')}</dl>`,`<p>${e(data.earningsNotice)}</p>`,`<p>${e(data.analyticsNotice)}</p>`,`<p>${e(data.withdrawalNotice)}</p><p>${e(data.minimumNotice)}</p><button class="ui-button" type="button" disabled>${renderIcon('payment',e)}Request withdrawal</button>`];
  return `<nav class="studio-profile-tabs" role="tablist" aria-label="Bank">${data.tabs.map((tab,index)=>`<button type="button" role="tab" id="tab-${e(tab.id)}" aria-controls="${e(tab.id)}" aria-selected="${index===0}" tabindex="${index===0?0:-1}" data-settings-tab="${e(tab.id)}">${renderIcon(tab.icon,e)}<span>${e(tab.label)}</span></button>`).join('')}</nav>${data.tabs.map((tab,index)=>`<section role="tabpanel" id="${e(tab.id)}" aria-labelledby="tab-${e(tab.id)}" data-settings-panel="${e(tab.id)}"${index?' hidden':''}>${panels[index]}</section>`).join('')}<a class="ui-button" href="/settings/#payments">${renderIcon('settings',e)}Payment & payout settings</a>`;
}
