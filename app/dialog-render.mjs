import {readFile} from 'node:fs/promises';
import {renderIcon} from './icon-render.mjs';
import {searchMarkup} from '../foundation/search.mjs';
const settings=JSON.parse(await readFile(new URL('../content/account.json',import.meta.url),'utf8'));
const icon=name=>renderIcon(name,value=>String(value),'studio-icon account-action-icon');

export function renderActions(){
  return `<button class="studio-header-control" type="button" data-studio-search-open aria-label="Search Studio">${icon('search')}</button>`;
}

export function searchContent(){
  return searchMarkup({title:'Search Studio',titleId:'studio-search-title',placeholder:'Search accounts, releases and help',icon});
}

export function renderDialogs({e}){
  return `<dialog id="account-dialog" aria-labelledby="account-title"><button id="account-close" class="global-close-button" type="button" aria-label="Close account">${icon('close')}</button><h2 id="account-title">Sign in</h2><section class="studio-account" data-account-view><p role="status" data-account-status>${e(settings.unavailable)}</p><div class="studio-auth-tabs" role="group" aria-label="Account action">${['signin','signup','recover'].map((action,index)=>`<button class="ui-button account-switch" type="button" data-auth-action="${action}" aria-pressed="${index===0}">${icon(action==='signin'?'signin':action==='recover'?'password':'account')}${e(settings.labels[action])}</button>`).join('')}</div><form data-auth-form><label>Email<input class="ui-field" name="email" type="email" autocomplete="email" required maxlength="254"></label><label data-password-label>Password<input class="ui-field" name="password" type="password" autocomplete="current-password" minlength="12" maxlength="128" required></label><button class="ui-button" type="submit" disabled data-auth-submit>${icon('signin')}Sign in</button></form><form data-recovery-form hidden><label>New password<input class="ui-field" name="password" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><button class="ui-button" type="submit">${icon('password')}Set password</button></form><div data-authenticated hidden><a class="ui-button" href="/profile/">${icon('account')}Manage your profile</a><button class="ui-button" type="button" data-signout>Sign out</button></div></section></dialog><dialog id="store-search-dialog" aria-labelledby="studio-search-title"><button class="dialog-close global-close-button" type="button" data-search-close aria-label="Close search">${icon('close')}</button>${searchContent()}</dialog>`;
}
