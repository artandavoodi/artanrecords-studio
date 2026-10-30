import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {bankMarkup,payoutSettingsMarkup} from '../app/bank-render.mjs';
import {renderSettings} from '../app/platform-render.mjs';
import {profileMarkup} from '../app/profile-render.mjs';
import {payoutApplicationValues,bankAmount} from '../app/bank.js';
import {hasProAccess} from '../app/subscriptions.js';
import {partnershipSummary,resolveAppearanceTokens} from '../app/overview.js';
import {catalogueConnections} from '../app/connections.js';
import {overviewMarkup,partnershipThemesMarkup} from '../app/overview-render.mjs';
import {spotifyAuthorization,validMusicCallback} from '../app/music-connections.js';
import {readAccountCallback} from '../app/account.js';
test('Spotify authorization binds PKCE to a short-lived account-specific callback',async()=>{
 const flow=await spotifyAuthorization({clientId:'a'.repeat(32),redirectUri:'https://studio.artanrecords.com/settings/?music-provider=spotify',accountId:'owner'});
 const url=new URL(flow.url);assert.equal(url.hostname,'accounts.spotify.com');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('scope'),'user-read-private');
 assert.equal(validMusicCallback(flow.pending,flow.pending.state,'owner','https://studio.artanrecords.com'),true);
 assert.equal(validMusicCallback(flow.pending,flow.pending.state,'another','https://studio.artanrecords.com'),false);
 assert.equal(validMusicCallback(flow.pending,flow.pending.state,'owner','https://studio.artanrecords.com',Date.now()+700000),false);
 assert.equal(readAccountCallback(new URL('https://studio.artanrecords.com/settings/?music-provider=spotify&code=spotify-code')).code,null);
 await assert.rejects(spotifyAuthorization({clientId:'a'.repeat(32),redirectUri:'https://evil.test/',accountId:'owner'}));
});
test('appearance presets define complete palettes without partnership messaging',async()=>{
 const config=JSON.parse(await readFile('content/appearance.json','utf8'));
 const colors={'--color-black':'#000000','--color-white':'#ffffff','--color-primary3':'#999999','--color-primary5':'#008080','--studio-brand-primary1':'#917c6f'};
 for(const preset of config.presets){const tokens=resolveAppearanceTokens(preset.tokens,key=>colors[key]);assert.equal(Object.keys(tokens).length,6);Object.values(tokens).forEach(color=>assert.match(color,/^#[0-9a-f]{6}$/));}
 assert.equal(resolveAppearanceTokens(config.presets[1].tokens,key=>colors[key]).accent,colors['--studio-brand-primary1']);
 const html=partnershipThemesMarkup(String);assert.match(html,/<h2 class="home-platform-theme__section-title">Theme<\/h2>/);assert.doesNotMatch(html,/Partnership-inspired|not your partnership/);
});
test('overview separates requested and approved partnerships from paid access',()=>{
 assert.equal(partnershipSummary({status:'pending',requested_tier:'platinum',approved_tier:'platinum'}).tier,null);
 assert.equal(partnershipSummary({status:'approved',approved_tier:'gold'}).tier,'gold');
 assert.equal(partnershipSummary({status:'approved',approved_tier:'gold'}).detail,'Partnership approved.');
 const html=overviewMarkup(value=>String(value),()=>'<span></span>');assert.match(html,/Your Studio/);assert.match(html,/data-overview-tier/);assert.doesNotMatch(html,/Plans and partnerships|Compare plan|\/month|\/year/);
 assert.deepEqual(catalogueConnections({artists:[],unavailable:['spotify']}),{apple:true,spotify:false});assert.throws(()=>catalogueConnections({}));
});
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
