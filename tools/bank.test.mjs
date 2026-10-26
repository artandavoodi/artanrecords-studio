import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bankMarkup,payoutSettingsMarkup} from '../app/bank-render.mjs';
import {renderSettings} from '../app/platform-render.mjs';
import {profileMarkup} from '../app/profile-render.mjs';
import {payoutApplicationValues,bankAmount} from '../app/bank.js';
import {hasProAccess} from '../app/subscriptions.js';
test('Pro access requires current provider-owned entitlement, never a plan label alone',()=>{
 assert.equal(hasProAccess({plan:'studio-pro'}),false);
 assert.equal(hasProAccess({plan:'studio-pro',status:'active',entitled:true,period_ends_at:'2000-01-01T00:00:00Z'}),false);
 assert.equal(hasProAccess({plan:'studio-pro',status:'past_due',entitled:true,period_ends_at:'2099-01-01T00:00:00Z'}),false);
 assert.equal(hasProAccess({plan:'studio-pro',status:'active',entitled:true,period_ends_at:'2099-01-01T00:00:00Z'}),true);
});
const e=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
test('Bank records approval without enabling money or inventing policy',async()=>{
  const config=JSON.parse(await readFile('content/bank.json','utf8'));
  assert.equal(config.collectionModel,'platform-collected-separate-charges-and-transfers');
  assert.equal(config.liveEnabled,false);
  assert.equal(config.commissionBasisPoints,null);
  assert.equal(config.minimumWithdrawalMinor,null);
  const html=bankMarkup(e);
  assert.match(html,/disabled[^>]*>.*Request withdrawal/);
  assert.match(html,/Unavailable/);
  assert.doesNotMatch(html,/€0|\$0|15%/);
  assert.match(payoutSettingsMarkup(e),/will not be redirected to Stripe/);
});
test('internal payout applications validate declarations without financial account fields',()=>{
  const fields=new Map([['legal_name','Test Artist'],['recipient_type','individual'],['registration_country','hr'],['tax_residence_country','hr'],['consent','on'],['bank_account','must not pass']]);
  const value=payoutApplicationValues(fields);assert.equal(value.registration_country,'HR');assert.equal(value.bank_account,undefined);fields.set('recipient_type','company');assert.throws(()=>payoutApplicationValues(fields));
  assert.match(bankAmount({amount:100,currency:'eur'}),/1/);
  assert.equal(bankAmount({amount:100,currency:'jpy'}),'100 minor units (JPY)');
});
test('private addresses and payment methods belong to Settings, not profile or Business',async()=>{
  const config=JSON.parse(await readFile('content/account.json','utf8'));
  const platform=JSON.parse(await readFile('content/platform.json','utf8'));
  const profile=profileMarkup({settings:config,e,icon:()=>''});
  assert.doesNotMatch(profile,/data-billing-mount|profile-addresses/);
  const settings=renderSettings(e);
  assert.match(settings,/data-settings-panel="addresses"/);
  assert.match(settings,/data-billing-mount/);
  assert.match(settings,/data-settings-panel="payments"/);
  assert.ok(!platform.groups.find(group=>group.label==='Business').items.some(item=>item.path==='/payments/'));
  assert.equal(platform.groups.find(group=>group.label==='Business').items.find(item=>item.path==='/payouts/').label,'Bank');
});
