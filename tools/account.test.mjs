import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {configured,resolveUser,profileValues,validPhoto} from '../app/account.js';
test('unconfigured Studio stays disconnected and rejects other ecosystem backends',()=>{
  assert.equal(configured({supabase:{url:'',publishableKey:''}}),false);
  for(const host of ['hahtbepdrjkjluhespbs','dwlgvujubkpycrvhngku'])assert.throws(()=>configured({supabase:{url:`https://${host}.supabase.co`,publishableKey:'public'}}));
  const payload=btoa(JSON.stringify({role:'service_role'}));assert.throws(()=>configured({supabase:{url:'https://studio-only.supabase.co',publishableKey:`x.${payload}.x`}}));
});
test('a failed verification never resolves as a guest',async()=>{
  assert.equal(await resolveUser({auth:{getSession:async()=>({data:{session:null}})}}),null);
  await assert.rejects(resolveUser({auth:{getSession:async()=>({data:{session:{}}}),getUser:async()=>({error:true})}}));
});
test('profile values exclude roles and verification; photos reject SVG and oversized content',()=>{
  const values=profileValues(new Map([['artist_name',' Artan '],['role','admin']]));assert.equal(values.artist_name,'Artan');assert.equal(values.role,undefined);
  assert.throws(()=>profileValues(new Map([['website','javascript:alert(1)']])));
  assert.equal(validPhoto({type:'image/svg+xml',size:100}),false);assert.equal(validPhoto({type:'image/png',size:3*1024*1024}),false);
});
test('public sitemap excludes workspace routes and profile HTML contains no financial records',async()=>{
  const sitemap=await readFile('sitemap.xml','utf8');assert.match(sitemap,/studio.artanrecords.com\//);assert.doesNotMatch(sitemap,/\/profile\/|\/royalties\/|\/payouts\/|\/agreements\//);
  const html=await readFile('profile/index.html','utf8');assert.match(html,/noindex,follow/);assert.match(html,/data-profile-form hidden/);
  assert.equal((await readFile('index.html','utf8')).match(/class="label-wordmark"/g),null);
});
test('private data policies never grant client financial or contract writes',async()=>{
  const sql=await readFile('supabase/migrations/202610180001_studio_accounts.sql','utf8');
  for(const table of ['studio_profiles','studio_memberships','studio_submissions','studio_contracts'])assert.ok(sql.includes(`alter table public.${table} enable row level security`));
  assert.doesNotMatch(sql,/grant (?:all|insert|update|delete).*studio_contracts/i);assert.match(sql,/'studio-avatars','studio-avatars',false/);
});
test('header provides responsive account and search controls; dialogs stay outside page content',async()=>{
  const home=await readFile('index.html','utf8'),search=await readFile('search/index.html','utf8');
  const main=home.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1],header=home.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)[1];
  assert.doesNotMatch(main,/type="search"|class="studio-tools"|data-account-view/);
  assert.match(header,/data-studio-account-open/);assert.match(header,/data-studio-search-open/);
  assert.match(header,/studio-header-mobile/);
  assert.match(header,/platform-header-actions label-header-actions/);assert.doesNotMatch(header,/label-home-actions/);
  assert.match(search,/<dialog id="store-search-dialog"/);assert.match(home,/<dialog id="account-dialog"/);
  assert.match(search,/data-search-close aria-label="Close search"/);
  assert.match(search,/class="dialog-close global-close-button"/);
});
test('workspace menu is responsive and separate from label resources',async()=>{
  const {renderMenu}=await import('../app/platform-render.mjs');
  const html=renderMenu({e:String});
  assert.match(html,/class="studio-menu-workspace"/);
  assert.match(html,/https:\/\/docs.artanrecords.com\//);
  const css=await readFile('app/platform.css','utf8');
  assert.match(css,/\.label-navigation \.studio-header-mobile \{ display:none/);
  assert.match(css,/@media\(max-width:1024px\).*studio-header-mobile \{ display:grid/s);
  assert.match(css,/justify-content:flex-start; text-align:start/);
});
test('Studio uses the Store search ranking and configured categories',async()=>{
  const {searchStore}=await import('../app/shared/search.js');
  const index=JSON.parse(await readFile('search-index.json','utf8'));
  assert.equal(searchStore(index,'royalties')[0].path,'/royalties/');
  assert.ok(searchStore(index,'account',{category:'account'}).every(item=>item.category==='account'));
  assert.deepEqual(searchStore(index,''),[]);
});
test('billing addresses have owner-only policies and client field limits',async()=>{
  const sql=await readFile('supabase/migrations/202610180002_studio_billing.sql','utf8');
  assert.match(sql,/enable row level security/);assert.match(sql,/revoke all.*anon,authenticated/);assert.match(sql,/with check\(account_id=\(select auth.uid\(\)\)\)/);
  const config=JSON.parse(await readFile('content/account.json','utf8'));assert.ok(config.billingFields.every(field=>field.autocomplete.startsWith('billing ')&&field.max<=200));
});
test('platform navigation resolves every configured destination and keeps private workspace routes noindex',async()=>{
  const platform=JSON.parse(await readFile('content/platform.json','utf8')),site=JSON.parse(await readFile('content/site.json','utf8'));
  for(const item of platform.groups.flatMap(group=>group.items))assert.ok(site.pages.some(page=>page.path===item.path));
  const settings=await readFile('settings/index.html','utf8');assert.match(settings,/data-platform-layout/);assert.match(settings,/data-studio-theme="dark"/);assert.match(settings,/noindex,follow/);
  for(const page of ['analytics','royalties','statements','payouts','profile'])assert.match(await readFile(page+'/index.html','utf8'),/noindex,follow/);
});
test('public platform metadata identifies the app without inventing reviews or financial results',async()=>{
  const html=await readFile('index.html','utf8'),manifest=JSON.parse(await readFile('manifest.webmanifest','utf8'));
  assert.match(html,/"@type":"SoftwareApplication"/);assert.match(html,/content="index,follow"/);assert.match(html,/rel="manifest"/);
  assert.doesNotMatch(html,/aggregateRating|ratingValue/);assert.equal(manifest.display,'standalone');assert.equal(manifest.start_url,'/');
  assert.match(html,/<title>Artanrecords Studio<\/title>/);
  assert.doesNotMatch(html,/Artan\s+Records/);
});
test('prepared partnership terms are agreement-owned and never client-writable',async()=>{
  const sql=await readFile('supabase/migrations/202610190001_studio_partnerships.sql','utf8');
  assert.match(sql,/references public.studio_contracts\(id\)/);
  assert.match(sql,/artist_share_bps \+ artanrecords_share_bps = 10000/);
  assert.match(sql,/unique \(agreement_id,version\)/);
  assert.match(sql,/enable row level security/);
  assert.match(sql,/revoke all on public.studio_partnerships from anon, authenticated/);
  assert.match(sql,/c.account_id=\(select auth.uid\(\)\)/);
  assert.doesNotMatch(sql,/grant (?:insert|update|delete|all)/i);
});
test('referrals and Stripe foundations remain inactive and cannot create client credits',async()=>{
  const programmes=JSON.parse(await readFile('content/programmes.json','utf8'));
  for(const name of ['referrals','payments','royaltyWithdrawals'])assert.equal(programmes[name].enabled,false);
  assert.equal(programmes.referrals.awardAmount,null);
  assert.equal(programmes.referrals.cashRedemptionEnabled,false);
  const sql=await readFile('supabase/migrations/202610190002_studio_referral_foundation.sql','utf8');
  assert.equal((sql.match(/enable row level security/g)||[]).length,2);
  assert.match(sql,/idempotency_key text not null unique/);
  assert.doesNotMatch(sql,/grant (?:insert|update|delete|all)/i);
});
test('appearance respects consent expiry and preserves both saved modes',async()=>{
  const {restoreAppearance,saveAppearance}=await import('../app/appearance.js');
  const config={choiceKey:'choice',themeKey:'theme'},values=new Map();
  const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  values.set('choice',JSON.stringify({choice:'allow',expires:Date.now()+60000}));
  for(const theme of ['dark','light']){saveAppearance(storage,config,theme);assert.equal(restoreAppearance(storage,config),theme);}
  values.set('choice',JSON.stringify({choice:'skip',expires:Date.now()+60000}));
  assert.equal(restoreAppearance(storage,config),null);
  saveAppearance(storage,config,'dark');assert.equal(values.get('theme'),'light');
  values.set('choice',JSON.stringify({choice:'allow',expires:1}));assert.equal(restoreAppearance(storage,config),null);
});
test('settings use native disclosures and the primary menu excludes legal notices',async()=>{
  const platform=JSON.parse(await readFile('content/platform.json','utf8'));
  assert.ok(platform.menu.every(item=>!['/privacy/','/terms/'].includes(item.path)));
  const html=await readFile('settings/index.html','utf8');
  assert.match(html,/<details class="studio-settings-group"/);
  assert.doesNotMatch(html,/data-settings-tab|<p class="eyebrow">Artanrecords Studio/);
  assert.match(html,/appearance.js\?v=/);
});
