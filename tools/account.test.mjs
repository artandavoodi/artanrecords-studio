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
test('header owns account and search controls; dialogs stay outside page content',async()=>{
  const home=await readFile('index.html','utf8'),search=await readFile('search/index.html','utf8');
  const main=home.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1],header=home.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)[1];
  assert.doesNotMatch(main,/type="search"|class="studio-tools"|data-account-view/);
  assert.match(header,/data-studio-account-open/);assert.match(header,/data-studio-search-open/);
  assert.match(search,/<dialog id="store-search-dialog"/);assert.match(home,/<dialog id="account-dialog"/);
  assert.match(search,/data-search-close aria-label="Close search"/);
  assert.match(search,/class="dialog-close global-close-button"/);
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
