import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const id='92000000-0000-0000-0000-000000000001';
const user={id,aud:'authenticated',role:'authenticated',email:'artist@example.test',email_confirmed_at:'2026-10-20T00:00:00Z',created_at:'2026-10-20T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{full_name:'Test artist'}};
const access=[{alg:'HS256',typ:'JWT'},{sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'test-signature'].map(value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url')).join('.');
const session={access_token:access,refresh_token:'test-refresh-not-a-real-credential',token_type:'bearer',expires_in:3600,user};
test('internal signing preview requires initials and remains a non-binding local record',async({page})=>{
 await mockBackend(page);await page.goto('/agreements/');
 await page.getByRole('button',{name:'Preview internal signing',exact:true}).click();
 const dialog=page.locator('[data-signing-preview]');await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('button',{name:'Download preview record'})).toBeDisabled();
 for(const input of await dialog.locator('input[name]:not([type=checkbox])').all())await input.fill('Preview');
 await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Finish preview',exact:true}).click();
 await expect(dialog.locator('[data-signing-preview-status]')).toContainText('No contract was signed');
 const download=dialog.getByRole('button',{name:'Download preview record'});await expect(download).toBeEnabled();
 const event=page.waitForEvent('download');await download.click();const file=await event;
 const {readFile}=await import('node:fs/promises');const record=JSON.parse(await readFile(await file.path(),'utf8'));
 expect(record.executedAgreement).toBe(false);expect(record.kind).toBe('non-binding-signing-preview');
 await dialog.locator('input[name=name]').fill('Changed');await expect(download).toBeDisabled();
 await dialog.getByRole('button',{name:'Close signing preview'}).click();await expect(dialog).toBeHidden();
});
async function mockBackend(page,{releaseCover}={}){
  const requests=[];
  let artistMetadata=null,handle=null,application=null,artistContent=null;const drafts=new Map(),concerts=new Map(),covers=new Map();
  await page.route('https://hahtbepdrjkjluhespbs.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    requests.push({path:url.pathname,query:url.search,body:request.headers()['content-type']?.includes('application/json')?request.postDataJSON():null,method:request.method()});
    let body={},status=200;
    if(url.pathname.endsWith('/user'))body=user;
    else if(url.pathname.endsWith('/token')||url.pathname.endsWith('/verify'))body=session;
    else if(url.pathname.endsWith('/signup'))body={user,session:null};
    else if(url.pathname.endsWith('/recover'))body={};
    else if(url.pathname.endsWith('/logout'))status=204;
    else if(url.pathname.endsWith('/functions/v1/studio-connect')){status=503;body={error:'Payout connection is not configured.'};}
    else if(url.pathname.endsWith('/studio_artist_metadata')){
      if(request.method()==='GET')body=artistMetadata?[{account_id:id,metadata:artistMetadata}]:[];
      else{artistMetadata=request.postDataJSON().metadata;body=null;status=201;}
    }
    else if(url.pathname.endsWith('/studio_release_drafts')){
      if(request.method()==='GET'){const selected=url.searchParams.get('id')?.replace('eq.','');body=selected?{metadata:drafts.get(selected)?.metadata}:[...drafts].map(([id,draft])=>({id,title:draft.title}));}
      else{const selected=url.searchParams.get('id')?.replace('eq.','')||'94000000-0000-0000-0000-000000000001';drafts.set(selected,{...drafts.get(selected),...request.postDataJSON()});body={id:selected};status=201;}
    }
    else if(url.pathname.endsWith('/studio_concerts')){
      if(request.method()==='GET')body=[...concerts.values()];
      else{const selected=url.searchParams.get('id')?.replace('eq.','')||'95000000-0000-0000-0000-000000000001';const data=request.postDataJSON();concerts.set(selected,{status:'draft',...concerts.get(selected),...data,id:selected});body={id:selected};}
    }
    else if(url.pathname.endsWith('/rpc/studio_set_concert_status')){const data=request.postDataJSON();concerts.get(data.concert).status=data.new_status;body=null;}
    else if(url.pathname.endsWith('/studio_artist_handles'))body=handle?[handle]:[];
    else if(url.pathname.endsWith('/studio_artist_applications'))body=application?[application]:[];
    else if(url.pathname.endsWith('/rpc/studio_username_check'))body='available';
    else if(url.pathname.endsWith('/rpc/studio_request_username')){handle={requested_username:request.postDataJSON().candidate,approved_username:null,status:'pending',notice:'Your username is awaiting label review.'};body=null;}
    else if(url.pathname.endsWith('/rpc/studio_apply_partnership')){application={requested_tier:request.postDataJSON().tier,approved_tier:null,status:'pending',decision_note:''};body=null;}
    else if(url.pathname.endsWith('/rpc/studio_set_artist_media_visibility'))body=null;
    else if(url.pathname.endsWith('/rpc/studio_save_artist_graphics_v2'))body=null;
    else if(url.pathname.endsWith('/rpc/studio_subscription_status'))body={plan:'studio',status:'none',entitled:false};
    else if(url.pathname.endsWith('/studio_artist_content'))body=artistContent?[{content:artistContent}]:[];
    else if(url.pathname.endsWith('/rpc/studio_save_artist_content')){artistContent=request.postDataJSON().value;body=null;}
    else if(url.pathname.includes('/rest/v1/studio_')){body=request.method()==='GET'?[]:null;status=request.method()==='POST'?201:200;}
    else if(/\/storage\/v1\/object\/(authenticated\/)?studio-release-artwork\//.test(url.pathname)){
      const key=url.pathname.split('studio-release-artwork/')[1];
      if(request.method()==='GET'){const image=covers.get(key);return route.fulfill({status:image?200:404,contentType:image?'image/png':'application/json',body:image||'{}'});}
      // WebKit's intercepted multipart body omits file bytes; retain the explicit upload fixture.
      const upload=await new Response(request.postDataBuffer(),{headers:{'content-type':request.headers()['content-type']}}).formData();const file=Buffer.from(await upload.get('').arrayBuffer());covers.set(key,file.length?file:releaseCover);body={Key:key};
    }
    else if(url.pathname.includes('/storage/v1/object/list/'))body=[];
    else if(url.pathname.includes('/storage/v1/object/studio-logos/')){status=request.method()==='GET'?404:200;body=request.method()==='GET'?{message:'Not found'}:{Key:'logo'};}
    else throw Error('Unexpected mocked request: '+url.pathname);
    await route.fulfill({status,contentType:'application/json',body:status===204?undefined:JSON.stringify(body)});
  });
  await page.addInitScript(()=>localStorage.setItem('neuroartan.cookieConsent',JSON.stringify({state:'rejected',preferences:{essential:true,analytics:false,experience:false,'analytics-performance':false,'analytics-usage':false,'experience-preferences':false,'experience-continuity':false},updatedAt:new Date().toISOString()})));
  return requests;
}
async function openAccount(page){
  await page.goto('/account/');
  const dialog=page.locator('#account-dialog');
  if(!await dialog.isVisible())await page.locator('main [data-studio-account-open]').click();
  await expect(dialog).toBeVisible();
  return dialog;
}
test('subscription billing is separate from payouts and only verified access displays Pro',async({page})=>{
 await mockBackend(page);const dialog=await openAccount(page);
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
 await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.goto('/settings/#subscription');await expect(page.getByRole('tabpanel',{name:'Subscription & billing',exact:true})).toBeVisible();
 await expect(page.locator('[data-subscription-status]')).toHaveText('No active paid subscription or verified included access');
 for(const price of ['€9.99/month','€99/year','€19.99/month','€199/year'])await expect(page.locator('#settings-subscription')).toContainText(price);
 await expect(page.locator('.studio-pro-badge')).toHaveCount(0);await expect(page.locator('#settings-subscription input:not([type=checkbox])')).toHaveCount(0);
 await page.route('**/rpc/studio_subscription_status',route=>route.fulfill({json:{plan:'studio-pro',status:'active',entitled:true,period_ends_at:'2099-01-01T00:00:00Z'}}));
 await page.reload();await expect(page.locator('.studio-pro-badge')).toHaveText('Pro');
 await page.getByRole('tab',{name:'Artist payout setup',exact:true}).click();await expect(page.locator('[data-payout-application-form]')).toBeVisible();
});
test('subscription card setup reports unavailable configuration without loading card fields',async({page})=>{
 await mockBackend(page);const dialog=await openAccount(page);
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.route('**/functions/v1/studio-billing',route=>route.fulfill({status:503,json:{error:'Secure card setup is not configured yet. No card details were collected.'}}));
 await page.goto('/settings/#subscription');const card=page.locator('[data-card-setup]');await card.locator('[name=consent]').check();await card.getByRole('button',{name:'Add payment method',exact:true}).click();
 await expect(card.locator('[data-card-status]')).toContainText('not configured');await expect(card.locator('[data-card-element-form]')).toBeHidden();await expect(page.locator('script[src="https://js.stripe.com/v3/"]')).toHaveCount(0);
});
test('portfolio projects save private drafts then require a distinct publish action',async({page})=>{
 await mockBackend(page);const dialog=await openAccount(page);
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();await expect(page.locator('[data-profile-form]')).toBeVisible();
 const rows=[],portfolioId='98100000-0000-0000-0000-000000000011';let publication;
 await page.route('**/rest/v1/studio_artist_portfolio*',route=>route.fulfill({json:rows}));
 await page.route('**/rpc/studio_save_portfolio',route=>{const data=route.request().postDataJSON();publication=data.publication;rows.splice(0,rows.length,{id:portfolioId,kind:'project',details:data.value,status:data.publication});return route.fulfill({json:portfolioId});});
 await page.goto('/projects/');await page.getByRole('button',{name:'Add project',exact:true}).click();const edit=page.getByRole('dialog',{name:'Edit project',exact:true});await edit.locator('[name=title]').fill('New creative project');await edit.locator('[name=description]').fill('A private project story.');await edit.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect(edit).toBeHidden();expect(publication).toBe('draft');await expect(page.locator('[data-portfolio-list]')).toContainText('New creative project');await page.locator('[data-portfolio-list]').getByRole('button',{name:'Edit',exact:true}).click();await edit.getByRole('button',{name:'Publish',exact:true}).click();await expect(edit).toBeHidden();await expect(page.locator('[data-portfolio-list]')).toContainText('published');expect(publication).toBe('published');
});
test('appearance reuses all canonical visual layers and disables controls in plain themes',async({page})=>{
 await mockBackend(page);await page.goto('/settings/#appearance');
 await page.locator('[data-theme-option=custom]').click();
 const breathing=page.locator('[data-toggle-scope=homepage-theme][data-toggle-key=breathing-circle]');
 await expect(breathing).toBeEnabled();await breathing.click();
 await expect(page.locator('html')).toHaveAttribute('data-homepage-theme-breathing-circle','true');
 await expect(page.locator('.home-breathing-circle')).toHaveCSS('visibility','visible');
 const cinematic=page.locator('[data-toggle-scope=homepage-theme][data-toggle-key=cinematic-background]');
 await expect(cinematic).toBeEnabled();await cinematic.click();
 await expect(page.locator('html')).toHaveAttribute('data-homepage-theme-cinematic-background','true');
 await expect(page.locator('[data-neuroartan-wallpaper] svg')).toHaveCount(1);
 await expect(page.locator('.stage-wallpaper')).toHaveCSS('visibility','visible');
 const shader=page.locator('[data-toggle-scope=homepage-theme][data-toggle-key=hero-shader]');
 await expect(shader).toBeEnabled();if(await shader.getAttribute('aria-checked')!=='true')await shader.click();
 await expect(page.locator('html')).toHaveAttribute('data-homepage-theme-hero-shader','true');
 await expect(page.locator('#home-hero-shader')).toHaveCSS('visibility','visible');
 await page.locator('[data-theme-option=light]').click();
 await expect(breathing).toBeDisabled();
 await expect(page.locator('[data-toggle-key=hero-shader][role=switch]')).toBeDisabled();
});
test('account appearance restores private server preferences and saves custom colours',async({page})=>{
 await mockBackend(page);let saved;
 await page.route('**/rest/v1/studio_user_preferences*',route=>{
  if(route.request().method()==='POST'){saved=route.request().postDataJSON();return route.fulfill({json:[]});}
  return route.fulfill({json:{appearance:{theme:{theme:'custom',contrast:'standard',palette:'mono',tokens:{background:'#123456',text:'#ffffff'}},toggles:{'breathing-circle':false,'hero-shader':false,'cinematic-background':false,'matte-atmosphere':false}}}});
 });
 const dialog=await openAccount(page);await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
 await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.goto('/settings/#appearance');await expect(page.locator('html')).toHaveAttribute('data-theme','custom');
 await expect(page.locator('body')).toHaveCSS('background-color','rgb(18, 52, 86)');
 await page.locator('[data-theme-token=background]').evaluate(field=>{field.value='#234567';field.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect.poll(()=>saved?.appearance?.theme?.tokens?.background).toBe('#234567');
 await expect(page.locator('body')).toHaveCSS('background-color','rgb(35, 69, 103)');
});
test('page editor uses only the signed-in artist handle and isolated preview controls',async({page})=>{
 await mockBackend(page);const dialog=await openAccount(page);
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
 await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.route('**/rest/v1/studio_artist_handles*',route=>route.fulfill({json:{approved_username:'testartist95'}}));
 await page.goto('/editor/');
 await expect(page.locator('[data-editor-frame]')).toHaveAttribute('src','http://127.0.0.1:8912/testartist95/?editor-preview=1');
 await expect(page.locator('[data-editor-font-select]')).toBeDisabled();
 await expect(page.getByText('Design preview only until you publish.',{exact:false})).toBeVisible();
});
test('artist website navigation saves privately before explicit sharing',async({page})=>{
 await mockBackend(page);let saved;
 await page.route('**/rest/v1/studio_artist_navigation*',async route=>{if(route.request().method()==='GET')return route.fulfill({json:saved?[saved]:[]});saved=route.request().postDataJSON();return route.fulfill({status:201,json:saved});});
 const dialog=await openAccount(page);await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
 await page.getByRole('tab',{name:'Website',exact:true}).click();
 const form=page.locator('[data-artist-navigation]');await form.locator('[data-navigation-add=menu]').click();await form.getByLabel('Link name',{exact:true}).fill('My music');await form.getByLabel('Address',{exact:true}).fill('#artist-releases');await form.getByRole('button',{name:'Save',exact:true}).click();
 await expect.poll(()=>saved?.menu).toEqual([{label:'My music',url:'#artist-releases'}]);expect(saved.published).toBe(false);
 await form.locator('[name=published]').check();await form.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>saved.published).toBe(true);
 await form.locator('[data-navigation-add=menu]').click();const second=form.locator('[data-navigation-links=menu] [data-navigation-row]').last();await second.getByLabel('Link name',{exact:true}).fill('Journal');await second.getByLabel('Address',{exact:true}).fill('https://example.test/journal');await second.getByRole('button',{name:'Reorder Journal',exact:true}).focus();await page.keyboard.press('ArrowUp');await form.getByRole('button',{name:'Save',exact:true}).click();await expect.poll(()=>saved.menu.map(item=>item.label)).toEqual(['Journal','My music']);
});
test('shared priority handle reorders rows with desktop pointer dragging',async({page})=>{
 if(!test.info().project.name.endsWith('desktop')){test.skip(true,'Touch surfaces use the shared pointer handler; keyboard ordering is covered in the artist tests.');return;}
 await page.route('**/reorder-test',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><link rel="stylesheet" href="/app/dist/studio.css"></head><body><div id="priority">${['spotify','amazon_music'].map(id=>`<div data-row data-reorder-id="${id}" draggable="true"><button data-handle type="button" aria-label="Move ${id}"><img class="studio-icon" src="/app/neuroartan/registry/icons/public/assets/core/actions/drag/drag.svg" alt=""></button><span>${id}</span></div>`).join('')}</div><script type="module">import {bindReorderList} from '/app/neuroartan/assets/js/core/02-systems/reorder-list.js';const list=document.getElementById('priority');bindReorderList(list,{rowSelector:'[data-row]',handleSelector:'[data-handle]',onChange:rows=>list.dataset.order=rows.map(row=>row.dataset.reorderId).join(',')});list.dataset.ready='true';</script></body></html>`}));
 await page.goto('/reorder-test');await expect(page.locator('#priority')).toHaveAttribute('data-ready','true');
 await page.getByRole('button',{name:'Move amazon_music',exact:true}).dragTo(page.getByRole('button',{name:'Move spotify',exact:true}),{targetPosition:{x:8,y:1}});
 await expect(page.locator('#priority')).toHaveAttribute('data-order','amazon_music,spotify');
});
test('artist pages save private drafts separately from published snapshots',async({page})=>{
 await mockBackend(page);let record=null;
 await page.route('**/rest/v1/studio_artist_site_pages*',route=>{const request=route.request();if(request.method()==='GET')return route.fulfill({json:record?[record]:[]});const values=request.postDataJSON();record={id:'98400000-0000-0000-0000-000000000001',...record,...values};return route.fulfill({status:200,json:record});});
 const dialog=await openAccount(page);await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.locator('[data-settings-tab=profile-website]').click();const pages=page.locator('[data-artist-pages]');await expect(pages.locator('[data-site-page-status]')).toContainText('0 of 12');
 await pages.locator('[data-site-page-new]').click();await pages.locator('[name=title]').fill('My Hub');await pages.locator('[name=slug]').fill('hub');await pages.locator('[name=body]').fill('My private page');await pages.getByRole('button',{name:'Save draft',exact:true}).click();await expect.poll(()=>record?.draft?.title).toBe('My Hub');expect(record.published).toBeUndefined();
 await pages.getByRole('button',{name:'My Hub · Private draft',exact:true}).click();await pages.getByRole('button',{name:'Publish page',exact:true}).click();await expect.poll(()=>record?.published?.body).toBe('My private page');
 await pages.getByRole('button',{name:'My Hub · Published',exact:true}).click();await pages.locator('[name=body]').fill('Private revision');await pages.getByRole('button',{name:'Save draft',exact:true}).click();await expect.poll(()=>record?.draft?.body).toBe('Private revision');expect(record.published.body).toBe('My private page');
 await pages.getByRole('button',{name:'My Hub · Published',exact:true}).click();await pages.getByRole('button',{name:'Hide page',exact:true}).click();await expect.poll(()=>record?.published).toBeNull();
});
test('editor search keeps its field stable and links directly to Store tools',async({page})=>{
 await page.goto('/search/?scope=editor');
 const search=page.locator('[data-studio-search-page]'),input=search.getByRole('searchbox');
 await expect(input).toBeEnabled();
 const before=await input.boundingBox(),filters=await search.locator('[data-search-filters]').boundingBox();
 for(const query of ['s','Spotify','collections','']){
  await input.fill(query);
  const after=await input.boundingBox(),nextFilters=await search.locator('[data-search-filters]').boundingBox();
  expect(Math.abs(after.x-before.x)).toBeLessThan(1);expect(Math.abs(after.width-before.width)).toBeLessThan(1);
  expect(Math.abs(nextFilters.y-filters.y)).toBeLessThan(1);
 }
 await input.fill('collections');await expect(search.getByRole('link',{name:'Collections Manage your private Store preparation.',exact:true})).toHaveAttribute('href','/store/#store-collections');
 await expect(page.getByRole('link',{name:'Back to editor',exact:true})).toHaveAttribute('href','/editor/');
});
test('artist canvas opens focused and corner editing updates only its preview',async({page})=>{
 await mockBackend(page);const dialog=await openAccount(page);
 let savedDesign;
 await page.route('**/rest/v1/studio_artist_designs*',route=>{if(route.request().method()==='GET')return route.fulfill({json:null});savedDesign=route.request().postDataJSON();return route.fulfill({status:201,json:savedDesign});});
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
 await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.route('**/rest/v1/studio_artist_handles*',route=>route.fulfill({json:{approved_username:'testartist95'}}));
 const config=JSON.parse(await readFile(new URL('../../assets/data/artists/editor.json',import.meta.url),'utf8'));
 const module=await readFile(new URL('../../assets/js/layers/site/artist-editor-preview.js',import.meta.url),'utf8');
 const designModule=await readFile(new URL('../../assets/js/layers/site/artist-design.js',import.meta.url),'utf8');
 const reorderModule=await readFile(new URL('../../assets/js/core/02-systems/reorder-list.js',import.meta.url),'utf8');
 await page.route('http://127.0.0.1:8912/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/assets/js/layers/site/artist-editor-preview.js')return route.fulfill({contentType:'text/javascript',body:module});
  if(path==='/assets/js/layers/site/artist-design.js')return route.fulfill({contentType:'text/javascript',body:designModule});
  if(path==='/assets/js/core/02-systems/reorder-list.js')return route.fulfill({contentType:'text/javascript',body:reorderModule});
  if(path==='/testartist95/')return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head></head><body><nav class="site-menu__links"><a href="#music">Music</a><a href="#journal">Journal</a></nav><article data-public-artist><div data-artist-portrait></div><h1 data-artist-name>Test artist</h1><section data-artist-fields><h2>Biography</h2><p>Artist story</p><p data-artist-since>Since 2024</p></section><section data-artist-links><section data-artist-group="streaming"><h2>Listen</h2><div class="hub__group-links"><a data-artist-link-key="spotify" aria-label="Spotify" href="https://open.spotify.com/artist/test">Spotify</a><a data-artist-link-key="amazon_music" aria-label="Amazon Music" href="https://music.amazon.com/artists/test">Amazon Music</a></div></section></section></article><script type="module">import {bindArtistEditorPreview} from '/assets/js/layers/site/artist-editor-preview.js';bindArtistEditorPreview(document.querySelector('article'),${JSON.stringify(config)});</script></body></html>`});
  return route.fulfill({body:''});
 });
 await page.goto('/editor/');
 await expect(page.locator('[data-artist-editor]')).toHaveAttribute('data-focus','true');
 await expect(page.locator('.studio-header-frame')).toBeHidden();await expect(page.locator('.studio-platform-rail')).toBeHidden();
 const canvas=page.frameLocator('[data-editor-frame]');await canvas.getByRole('button',{name:'Edit Artist name',exact:true}).click();
 const devices=JSON.parse(await readFile(new URL('../../content/editor.json',import.meta.url),'utf8'));
 for(const device of devices.views){await page.getByRole('button',{name:device.label,exact:true}).click();await expect.poll(()=>canvas.locator('body').evaluate(element=>element.ownerDocument.defaultView.innerWidth)).toBe(device.width);await expect(page.getByRole('button',{name:device.label,exact:true})).toHaveAttribute('aria-pressed','true');}
 await page.getByRole('button',{name:'Desktop preview',exact:true}).click();
 await expect(page.locator('.studio-editor-toolbar')).toHaveCSS('border-bottom-style','solid');
 await expect(page.locator('[data-editor-save] img')).toHaveAttribute('src','/app/icons/editor-save.svg');await expect(page.locator('[data-editor-publish] img')).toHaveAttribute('src','/app/icons/editor-publish.svg');
 await expect(page.getByRole('region',{name:'Page design'})).toBeVisible();
 await expect(page.locator('[data-editor-profile-tools]')).toBeHidden();
 await expect(page.locator('[data-editor-release-link]')).toBeHidden();
 await page.getByRole('navigation',{name:'Editing tools'}).getByRole('button',{name:'Copyright',exact:true}).click();
 await expect(page.locator('[data-editor-copyright]')).toBeFocused();
 await expect(page.getByRole('navigation',{name:'Editing tools'})).toBeHidden();
 await page.getByRole('button',{name:'Back to Design',exact:true}).click();
 await expect(page.locator('[data-editor-font-select]')).toBeFocused();
 await expect(page.getByRole('navigation',{name:'Editing tools'}).getByRole('link',{name:'Store',exact:true})).toHaveAttribute('href','/store/');
 await page.getByRole('navigation',{name:'Editing tools'}).getByRole('button',{name:'Profile',exact:true}).click();await expect(page.locator('[data-editor-profile-tools] .studio-profile-tabs')).toBeHidden();await expect(page.locator('[data-profile-form]')).toBeVisible();await page.getByRole('button',{name:'Back to Design',exact:true}).click();
 if(page.viewportSize().width>1024){
  const resize=page.getByRole('separator',{name:'Resize design tools'}),box=await resize.boundingBox();const before=await page.locator('.studio-editor-canvas').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2);await page.mouse.up();
  await expect.poll(async()=>Math.round((await page.locator('.studio-editor-canvas').boundingBox()).width)).toBeGreaterThan(Math.round(before.width));
  const minimum=devices.views.find(view=>view.id==='mobile').width;
  const grip=await resize.boundingBox(),panelWidth=(await page.locator('.studio-editor-controls').boundingBox()).width;
  await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();await page.mouse.move(grip.x+grip.width/2+panelWidth-minimum+8,grip.y+grip.height/2);await page.mouse.up();
  await expect.poll(async()=>Math.round((await page.locator('.studio-editor-controls').boundingBox()).width)).toBe(minimum);
  const closeGrip=await resize.boundingBox();await page.mouse.move(closeGrip.x+closeGrip.width/2,closeGrip.y+closeGrip.height/2);await page.mouse.down();await page.mouse.move(closeGrip.x+closeGrip.width/2+minimum/2,closeGrip.y+closeGrip.height/2);await page.mouse.up();
  await expect(page.locator('.studio-editor-controls')).toBeHidden();await expect(page.getByRole('button',{name:'Design tools',exact:true})).toHaveAttribute('aria-expanded','false');
  await page.getByRole('button',{name:'Design tools',exact:true}).click();await expect(page.locator('.studio-editor-controls')).toBeVisible();await expect.poll(async()=>Math.round((await page.locator('.studio-editor-controls').boundingBox()).width)).toBe(minimum);
  await resize.focus();await page.keyboard.press('ArrowRight');await expect(page.locator('.studio-editor-controls')).toBeHidden();await expect(page.getByRole('button',{name:'Design tools',exact:true})).toBeFocused();await page.getByRole('button',{name:'Design tools',exact:true}).click();
 }
 await page.locator('[data-editor-font-select]').selectOption('mono');
 for(const selector of ['[data-editor-font-select]','[data-editor-portrait-align]','[data-editor-detail-size]','[data-editor-align=nameAlign]']){
  const arrow=page.locator(selector).locator('..').locator('.ui-inline-dropdown__icon-wrapper');
  await arrow.scrollIntoViewIfNeeded();
  expect(await arrow.evaluate(element=>{const rect=element.getBoundingClientRect();return document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.tagName;})).toBe('SELECT');
 }
 await page.locator('[data-editor-align=nameAlign]').selectOption('center');await expect(canvas.locator('[data-artist-name]')).toHaveAttribute('style',/text-align: center/);
 await page.locator('[data-editor-align=biographyAlign]').selectOption('right');await expect(canvas.locator('[data-artist-fields]')).toHaveAttribute('style',/text-align: right/);
 await page.locator('[data-editor-portrait-size]').fill('240');await page.locator('[data-editor-portrait-align]').selectOption('center');
 await expect(canvas.locator('[data-artist-portrait]')).toHaveAttribute('style',/--artist-portrait-size: 240px/);
 await expect(canvas.locator('[data-artist-portrait]')).toHaveAttribute('style',/justify-self: center/);
 await page.locator('[data-editor-biography-label]').click();await expect(canvas.locator('[data-artist-fields] h2')).toBeHidden();
 await page.locator('[data-editor-since]').click();await expect(canvas.locator('[data-artist-since]')).toBeHidden();
 await page.locator('[data-editor-detail-size]').selectOption('large');await expect(canvas.locator('[data-artist-fields]')).toHaveAttribute('style',/--artist-detail-size: var\(--font-size-h3\)/);
 await expect(canvas.locator('[data-artist-name]')).toHaveAttribute('style',/font-family: var\(--font-mono\)/);
 await expect(page.locator('.studio-editor-toolbar')).not.toContainText('Page editor');
 await page.getByRole('button',{name:'Separator before Biography',exact:true}).click();
 await expect(canvas.locator('[data-artist-fields]')).toHaveAttribute('data-artist-divider','');
 await page.locator('[data-editor-section=biography]').click();await expect(canvas.locator('[data-artist-fields]')).toBeHidden();await page.locator('[data-editor-section=biography]').click();
 await page.getByRole('button',{name:'Reorder Biography',exact:true}).focus();await page.keyboard.press('ArrowDown');
 await expect(page.locator('[data-editor-section-order] > div').first()).toHaveAttribute('data-reorder-id','connections');
 await page.getByRole('button',{name:'Reorder Amazon Music',exact:true}).focus();await page.keyboard.press('ArrowUp');
 await expect(canvas.locator('[data-artist-group=streaming] a').first()).toHaveAttribute('data-artist-link-key','amazon_music');
 await page.getByRole('button',{name:'Save draft',exact:true}).click();
 await expect.poll(()=>savedDesign?.draft?.dividers).toEqual(['biography']);expect(savedDesign.published_design).toBeUndefined();
 expect(savedDesign.draft.order[0]).toBe('connections');expect(savedDesign.draft.linkOrder.streaming).toEqual(['amazon_music','spotify']);
 expect(savedDesign.draft.presentation).toEqual({portraitSize:240,portraitAlign:'center',biographyLabel:false,since:false,textSize:'large',nameAlign:'center',biographyAlign:'right'});
 await page.getByRole('button',{name:'Publish design',exact:true}).click();
 await expect.poll(()=>savedDesign?.published_design?.font).toBe('mono');
 await page.getByRole('link',{name:'Search tools and content',exact:true}).click();
 await expect(page).toHaveURL(/\/search\/\?scope=editor/);const toolSearch=page.locator('[data-studio-search-page]');await toolSearch.getByRole('searchbox').fill('main buttons');await toolSearch.getByRole('link',{name:'Main buttons & links',exact:false}).click();
 await expect(page.locator('[data-editor-selection]')).toHaveText('Main buttons');
 await expect(page.locator('[data-editor-button-label]').first()).toBeFocused();
 await page.locator('[data-editor-button-url]').first().fill('javascript:alert(1)');await expect(page.getByRole('button',{name:'Save draft',exact:true})).toBeDisabled();await expect(page.locator('[data-editor-button-status]')).not.toHaveText('');await page.locator('[data-editor-button-url]').first().fill('#artist-releases');
 await canvas.getByRole('button',{name:'Reorder Journal',exact:true}).focus();await canvas.getByRole('button',{name:'Reorder Journal',exact:true}).press('ArrowUp');
 await expect(page.locator('[data-editor-profile-tools] [data-navigation-links=menu] [data-link-label]').first()).toHaveValue('Journal');
 await page.keyboard.press('Escape');await expect(page.locator('.studio-editor-controls')).toBeHidden();
 await expect(page.locator('[data-artist-editor]')).toHaveAttribute('data-focus','true');
 await page.getByRole('button',{name:'Exit focus mode',exact:true}).click();await expect(page.locator('.studio-header-frame')).toBeVisible();
});
test('Store prepares private products and collections without activating publication or payments',async({page})=>{
 await mockBackend(page);let prepared=false;const products=[],collections=[],domainRequests=[];
 const creator='a5000000-0000-0000-0000-000000000011',store='a5000000-0000-0000-0000-000000000021';
 await page.route('**/rpc/studio_prepare_store',route=>{prepared=true;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(store)});});
 for(const table of ['studio_creators','studio_store_drafts','studio_store_products','studio_store_collections','studio_creator_domains'])await page.route('**/rest/v1/'+table+'*',route=>{
  const request=route.request();let body=[];
  if(table==='studio_creators')body=prepared?[{id:creator}]:[];
  else if(table==='studio_store_drafts')body=prepared?[{id:store,creator_id:creator,title:'Private store',introduction:'',status:'draft'}]:[];
  else{
   const rows=table==='studio_store_products'?products:table==='studio_store_collections'?collections:domainRequests;
   if(request.method()==='POST'){const record={...request.postDataJSON(),id:'a5000000-0000-0000-0000-'+String(rows.length+31).padStart(12,'0'),status:table==='studio_creator_domains'?'requested':'draft'};rows.push(record);body={id:record.id};}else body=rows;
  }
  return route.fulfill({status:request.method()==='POST'?201:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 const account=await openAccount(page);await account.locator('[name=email]').fill(user.email);await account.locator('[data-auth-form] [name=password]').fill('Test-password-123');await account.locator('[data-auth-submit]').click();await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.goto('/store/');await page.getByRole('button',{name:'Prepare a private store',exact:true}).click();await expect(page.getByRole('tab',{name:'Products',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Collections',exact:true}).click();await page.getByRole('button',{name:'New collection',exact:true}).click();const collection=page.locator('[data-commerce-editor=collection]');await collection.getByLabel('Collection name').fill('Music');await collection.getByLabel('Collection address').fill('music');await collection.getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator('.system-save-confirmation')).toHaveText('Changes saved.');
 await page.getByRole('tab',{name:'Products',exact:true}).click();await page.getByRole('button',{name:'New product',exact:true}).click();const product=page.locator('[data-commerce-editor=product]');await product.getByLabel('Product name').fill('A score');await product.getByLabel('Product address').fill('a-score');await product.getByLabel('Product type').selectOption('digital');await product.getByLabel('Price (optional)',{exact:true}).fill('2.50');await product.getByRole('combobox',{name:'Currency',exact:true}).selectOption('EUR');await product.getByRole('combobox',{name:'Collection',exact:true}).selectOption(collections[0].id);await product.getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator('[data-commerce-list=product]')).toContainText('A score');
 expect(products[0]).toMatchObject({creator_id:creator,store_id:store,price_minor:250,currency:'EUR',collection_id:collections[0].id});expect(products[0].details.variants).toEqual([]);
 await page.getByRole('tab',{name:'Domains',exact:true}).click();const domain=page.locator('[data-commerce-domain]');await domain.getByLabel('Custom domain').fill('WWW.Creator.com');await domain.getByRole('button',{name:'Save domain request'}).click();await expect(page.locator('[data-commerce-domains]')).toContainText('www.creator.com');expect(domainRequests[0]).toMatchObject({creator_id:creator,surface:'profile',hostname:'www.creator.com',status:'requested'});
 await page.getByRole('tab',{name:'Finance',exact:true}).click();await expect(page.locator('#store-finance')).toContainText('Commerce payments and withdrawals are not active.');await expect(page.getByRole('button',{name:/Withdraw|Publish|Checkout/})).toHaveCount(0);
 expect(await page.locator('body').evaluate(element=>element.scrollWidth<=innerWidth)).toBe(true);
 await page.reload();await expect(page.getByRole('tab',{name:'Finance',exact:true})).toHaveAttribute('aria-selected','true');
});
test('Store backend unavailability does not simulate a shop or expose an unusable editor',async({page})=>{
 await mockBackend(page);const account=await openAccount(page);await account.locator('[name=email]').fill(user.email);await account.locator('[data-auth-form] [name=password]').fill('Test-password-123');await account.locator('[data-auth-submit]').click();await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.route('**/rest/v1/studio_creators*',route=>route.fulfill({status:404,contentType:'application/json',body:'{"message":"Unavailable"}'}));
 await page.goto('/store/');await expect(page.locator('[data-commerce-status]')).toHaveText('Store preparation is not connected yet. Your existing shop has not changed.');await expect(page.locator('[data-commerce-controls]')).toBeHidden();await expect(page.locator('[data-commerce-prepare]')).toBeHidden();
});
test('Studio reuses magnetic navigation for drag collapse and reopening',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await mockBackend(page);await page.goto('/profile/');
 const handle=page.getByRole('separator',{name:'Resize navigation',exact:true}),rail=page.locator('.studio-platform-rail');
 if(!test.info().project.name.endsWith('desktop')){await expect(handle).toBeHidden();return;}
 await expect(handle).toBeVisible();expect((await rail.boundingBox()).x).toBe(0);const maximum=await rail.evaluate(el=>el.getBoundingClientRect().width),iconLeft=await rail.locator('.studio-platform-group a img').first().evaluate(el=>el.getBoundingClientRect().left);
 expect(Math.abs((await page.locator('.studio-brand').boundingBox()).x-iconLeft)).toBeLessThanOrEqual(1);
 let box=await handle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+100);await page.mouse.down();await page.mouse.move(0,box.y+100,{steps:12});await page.mouse.up();await expect(page.locator('html')).toHaveAttribute('data-studio-rail','closed');
 const balance=await rail.evaluate(el=>{const icon=el.querySelector('.studio-platform-group a img').getBoundingClientRect(),bounds=el.getBoundingClientRect();return Math.abs((icon.left-bounds.left)-(bounds.right-icon.right));});expect(balance).toBeLessThanOrEqual(1.1);expect(Math.abs(await rail.locator('.studio-platform-group a img').first().evaluate(el=>el.getBoundingClientRect().left)-iconLeft)).toBeLessThanOrEqual(1);
 box=await handle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+100);await page.mouse.down();await page.mouse.move(maximum,box.y+100,{steps:12});await page.mouse.up();await expect(page.locator('html')).toHaveAttribute('data-studio-rail','open');
 await expect(rail.locator('.studio-platform-group a span').first()).toHaveCSS('white-space','nowrap');
});
test('released catalogue keeps artwork spacing and exposes complete release and track details',async({page})=>{
 await mockBackend(page);
 await page.route('**/rest/v1/studio_artist_handles*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{approved_username:'testartist'}])}));
 await page.route('https://artanrecords.com/assets/data/artists/platform.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({routes:{fixture:'testartist'}})}));
 const links=[{platform:'amazonMusic',label:'Amazon Music',url:'https://music.amazon.com/albums/test'},{platform:'youtubeMusic',label:'YouTube Music',url:'https://music.youtube.com/watch?v=test'}];
 await page.route('https://artanrecords.com/assets/data/music/releases.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[{id:'fixture',artistId:'fixture',title:'Released album',status:'Released',type:'Album',releaseDate:'2026-10-24',cover:{src:'assets/fixture.png'},productionProcess:'Recorded at the piano.',releaseInformation:'Released with permission.',credits:'Piano: Artist',links,tracks:[{title:'Opening',duration:'3:20',isrc:'USABC2600001',story:'A track story.',links}]}]})}));
 await page.route('https://artanrecords.com/assets/fixture.png',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDV8AAAAASUVORK5CYII=','base64')}));
 const account=await openAccount(page);await account.locator('[name=email]').fill(user.email);await account.locator('[data-auth-form] [name=password]').fill('Test-password-123');await account.locator('[data-auth-submit]').click();await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.goto('/releases/');await expect(page.locator('.ui-loading-surface')).toBeHidden();const card=page.locator('.studio-published-release');await expect(card.getByRole('heading',{name:'Released album',exact:true})).toBeVisible();
 const gap=await card.evaluate(el=>{const image=el.querySelector(':scope > img').getBoundingClientRect(),copy=el.querySelector('.studio-release-copy').getBoundingClientRect();return copy.top-image.bottom;});expect(gap).toBeGreaterThanOrEqual(24);
 await card.locator('summary').click();await expect(card).toContainText('Recorded at the piano.');await expect(card).toContainText('Released with permission.');await expect(card).toContainText('USABC2600001');await expect(card).toContainText('A track story.');
 await expect(card.getByRole('link',{name:'Amazon Music'}).first().locator('img')).toHaveAttribute('src','/app/icons/amazon_music.svg');await expect(card.getByRole('link',{name:'YouTube Music'}).first().locator('img')).toHaveAttribute('src','/app/icons/youtube_music.svg');
});
test('artist content edits stay private unless a specific field is shared',async({page})=>{
 const requests=await mockBackend(page),account=await openAccount(page);await account.locator('[name=email]').fill(user.email);await account.locator('[data-auth-form] [name=password]').fill('Test-password-123');await account.locator('[data-auth-submit]').click();
 await page.getByRole('tab',{name:'Artist content',exact:true}).click();const card=page.locator('.studio-content-card').filter({has:page.getByRole('heading',{name:'About',exact:true})});await card.getByRole('button',{name:'Edit'}).click();
 const dialog=page.getByRole('dialog',{name:'Edit artist content'});await dialog.getByLabel('Other names',{exact:true}).fill('Stage name');await dialog.getByLabel('Born',{exact:true}).fill('1990-01-01');await dialog.getByRole('button',{name:'Save',exact:true}).click();await expect(dialog).toBeHidden();
 const saved=requests.find(item=>item.path.endsWith('/rpc/studio_save_artist_content')).body.value;expect(saved.born).toBe('1990-01-01');expect(saved.visibility.born).toBe(false);expect(saved.visibility.other_names).toBe(false);
 await expect(page.locator('.system-save-confirmation')).toHaveText('About saved.');
});
test('artist graphics isolate their tab and save explicit palette visibility',async({page})=>{
 const requests=await mockBackend(page),dialog=await openAccount(page);
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
 await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.getByRole('tab',{name:'Graphics',exact:true}).click();
 const form=page.locator('[data-graphics-form]');await expect(form).toBeVisible();await expect(page.locator('[data-profile-form]')).toBeHidden();
 await expect(form.locator('[data-colour-swatch]')).toHaveCount(2);await expect(form.locator('summary')).toHaveCount(0);
 await form.getByRole('button',{name:'Custom colour'}).click();await form.getByLabel('Artist colour hex code').fill('#123456');
 await form.getByRole('combobox',{name:'Assign colour',exact:true}).selectOption('icons');
 await expect(form.getByLabel('Choose artist colour')).toHaveValue('#123456');
 await expect(form.locator('[data-colour-swatch]')).toHaveCount(1);await expect(form.locator('[data-colour-swatch]')).toHaveAttribute('data-colour-swatch','#123456');
 await expect(form.locator('.studio-color-field')).toHaveCSS('display','grid');await expect(form.getByRole('button',{name:'Remove colour'})).toHaveText('');
 const colours=page.getByRole('dialog',{name:'Custom artist colours'});await expect(colours).toBeVisible();await expect(colours.getByRole('button',{name:'Close custom colours'}).locator('.global-close-button__line')).toHaveCount(2);
 const headings=colours.locator('.studio-colour-column-headings');
 if(page.viewportSize().width<=1024)await expect(headings).toBeHidden();else{
  const labels=await headings.locator('span').all(),inputs=[colours.getByLabel('Artist colour hex code'),colours.getByRole('combobox',{name:'Assign colour',exact:true})];
  for(let index=0;index<2;index++)expect(Math.abs((await labels[index].boundingBox()).x-(await inputs[index].boundingBox()).x)).toBeLessThan(1);
 }
 expect(await colours.evaluate(el=>getComputedStyle(el,'::backdrop').backdropFilter)).not.toBe('none');
 if(test.info().project.name==='chromium-desktop')await page.screenshot({path:'/tmp/studio-graphics-refined-proof.png'});
 await colours.getByRole('button',{name:'Close custom colours'}).click();await expect(colours).toBeHidden();await expect(form.getByRole('button',{name:'Custom colour'})).toBeFocused();
 await form.getByLabel('Share my artist colours').check();await form.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.locator('.system-save-confirmation')).toHaveText('Graphics saved.');
 expect(requests.find(item=>item.path.endsWith('/rpc/studio_save_artist_graphics_v2')).body).toEqual({colors:['#123456'],assignments:{icons:0,header_fade:null,header_ribbon:null,logo:null},share_logo:false,share_palette:true});
 await form.getByRole('button',{name:'Edit #123456'}).click();await colours.getByRole('button',{name:'Remove colour'}).click();await colours.getByRole('button',{name:'Close custom colours'}).click();await expect(form.locator('[data-colour-swatch]')).toHaveCount(2);await expect(form.getByRole('button',{name:'Use black'})).toBeVisible();await expect(form.getByRole('button',{name:'Use white'})).toBeVisible();
 await form.getByRole('button',{name:'Custom colour'}).click();for(let index=1;index<5;index++)await colours.locator('[data-add-color]').click();
 await expect(colours.locator('.studio-color-field')).toHaveCount(5);await expect(colours.locator('[data-add-color]')).toBeDisabled();
 const assignments=colours.getByRole('combobox',{name:'Assign colour',exact:true});
 await assignments.nth(0).selectOption('icons');await expect(assignments.nth(1).locator('option[value=icons]')).toHaveAttribute('disabled','');
 await assignments.nth(1).selectOption('logo');await expect(assignments.nth(2).locator('option[value=logo]')).toHaveAttribute('disabled','');
 await assignments.nth(0).selectOption('header');await expect(assignments.nth(2).locator('option[value=fade]')).toHaveAttribute('disabled','');await expect(assignments.nth(2).locator('option[value=ribbon]')).toHaveAttribute('disabled','');
 expect(await colours.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 expect(await colours.locator('.studio-color-field').evaluateAll(rows=>rows.map(row=>row.dataset.colourRole))).toEqual(['primary-1','primary-2','primary-3','primary-4','primary-5']);
 await colours.getByRole('button',{name:'Close custom colours'}).click();
 await expect(page.locator('body')).toHaveJSProperty('scrollWidth',await page.locator('body').evaluate(node=>node.clientWidth));
});
test('artist logos reject active SVG and export safe artwork without distortion',async({page})=>{
 const requests=await mockBackend(page),dialog=await openAccount(page);
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
 await expect(page.locator('[data-profile-form]')).toBeVisible();await page.getByRole('tab',{name:'Graphics',exact:true}).click();
 const form=page.locator('[data-graphics-form]'),input=form.locator('[name=logo]');
 const logoDialog=page.getByRole('dialog',{name:'Preview logo'});
 await input.setInputFiles({name:'unsafe.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')});
 await expect(logoDialog).toBeVisible();await expect(logoDialog.getByRole('alert')).toContainText('vector shapes only');await expect(logoDialog.getByRole('button',{name:'Use logo',exact:true})).toBeDisabled();
 await logoDialog.getByRole('button',{name:'Close logo preview'}).click();await expect(logoDialog).toBeHidden();await expect(form.getByRole('button',{name:'Edit',exact:true})).toBeFocused();
 await input.setInputFiles({name:'fixture.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" width="200" height="100" viewBox="0 0 200 100" inkscape:version="1.4"><sodipodi:namedview pagecolor="#505050"/><metadata>Private editor description</metadata><g style="stroke-width:0.5"><rect x="20" y="20" width="100" height="50" style="font-family:Example;fill:#917c6f;fill-opacity:1;stroke-width:0.5"/></g></svg>')});
 await expect(logoDialog).toBeVisible();await expect(logoDialog.locator('[data-logo-candidate]')).toHaveCount(2);await expect(logoDialog.locator('[data-logo-candidate]').first()).toHaveJSProperty('naturalWidth',100);await expect(logoDialog.locator('[data-logo-candidate]').first()).toHaveJSProperty('naturalHeight',50);await expect(form.locator('[data-logo-preview]')).toBeHidden();
 expect(await logoDialog.locator('[data-logo-candidate]').first().evaluate(image=>{const canvas=document.createElement('canvas');canvas.width=200;canvas.height=100;const context=canvas.getContext('2d');context.drawImage(image,0,0);return [...context.getImageData(40,40,1,1).data];})).toEqual([145,124,111,255]);
 await expect(logoDialog.locator('.global-close-button__line')).toHaveCount(2);await expect(logoDialog.locator('.global-close-button')).not.toHaveClass(/ui-button/);await expect(logoDialog.locator('.global-close-button')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');expect(await logoDialog.evaluate(el=>getComputedStyle(el,'::backdrop').backdropFilter)).not.toBe('none');await expect(logoDialog.locator('[data-logo-backdrop=light]')).toHaveCSS('background-color','rgb(255, 255, 255)');await expect(logoDialog.locator('[data-logo-backdrop=dark]')).toHaveCSS('background-color','rgb(0, 0, 0)');
 expect(requests.filter(item=>item.method==='POST'&&item.path.includes('/object/studio-logos/'))).toHaveLength(0);
 if(test.info().project.name==='chromium-desktop')await page.screenshot({path:'/tmp/studio-logo-preview-dialog.png'});
 await logoDialog.getByRole('button',{name:'Use logo',exact:true}).click();await expect(logoDialog).toBeHidden();
 await expect(form.locator('[data-logo-preview]')).toBeVisible();await expect(form.locator('[data-logo-preview]')).toHaveJSProperty('naturalWidth',100);await expect(form.locator('[data-logo-preview]')).toHaveJSProperty('naturalHeight',50);
 await form.getByRole('button',{name:'Edit',exact:true}).click();await expect(logoDialog).toBeVisible();await expect(logoDialog.locator('[data-logo-candidate]').first()).toHaveJSProperty('naturalWidth',100);await logoDialog.getByRole('button',{name:'Use logo',exact:true}).click();await expect(logoDialog).toBeHidden();
 await form.getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator('.system-save-confirmation')).toHaveText('Graphics saved.');
 expect(requests.filter(item=>item.method==='POST'&&item.path.includes('/object/studio-logos/')).map(item=>item.path.split('/').at(-1))).toEqual(['source','logo']);
 const retained=await form.locator('[data-logo-preview]').getAttribute('src');await input.setInputFiles({name:'replacement.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="20" fill="white"/></svg>')});await expect(logoDialog.getByRole('button',{name:'Use logo',exact:true})).toBeEnabled();await page.keyboard.press('Escape');await expect(logoDialog).toBeHidden();await expect(form.locator('[data-logo-preview]')).toHaveAttribute('src',retained);
 const png=async opaque=>Buffer.from(await page.evaluate(opaque=>{const canvas=document.createElement('canvas');canvas.width=300;canvas.height=150;const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,opaque?300:100,opaque?150:50);return canvas.toDataURL('image/png').split(',')[1];},opaque),'base64');
 await input.setInputFiles({name:'transparent.png',mimeType:'image/png',buffer:await png(false)});await expect(logoDialog.getByRole('button',{name:'Use logo',exact:true})).toBeEnabled();await expect(logoDialog.locator('[data-logo-candidate]').first()).toHaveJSProperty('naturalWidth',100);await page.keyboard.press('Escape');
 await input.setInputFiles({name:'opaque.png',mimeType:'image/png',buffer:await png(true)});await expect(logoDialog.getByRole('alert')).toContainText('transparent background');await expect(logoDialog.getByRole('button',{name:'Use logo',exact:true})).toBeDisabled();await logoDialog.getByRole('button',{name:'Close logo preview'}).click();await expect(form.locator('[data-logo-preview]')).toHaveAttribute('src',retained);
 for(const vector of ['<rect width="10" height="10" style="fill:url(https://external.example/logo)"/>','<image href="https://external.example/logo"/>','<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">unsafe</div></foreignObject>']){await input.setInputFiles({name:'external.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">'+vector+'</svg>')});await expect(logoDialog.getByRole('alert')).not.toBeEmpty();await expect(logoDialog.getByRole('button',{name:'Use logo',exact:true})).toBeDisabled();await logoDialog.getByRole('button',{name:'Close logo preview'}).click();}
});
test('profile saves show shared feedback and text fields resize only vertically',async({page})=>{
  const requests=await mockBackend(page);
  const account=await openAccount(page);await account.locator('[name=email]').fill(user.email);await account.locator('[data-auth-form] [name=password]').fill('Test-password-123');await account.locator('[data-auth-submit]').click();
  const form=page.locator('[data-profile-form]');await expect(form).toBeVisible();
  await expect(form.locator('textarea')).toHaveCSS('resize','none');
  const biography=form.locator('[name=biography]');await expect(biography).toHaveAttribute('maxlength','250');
  await biography.fill('A'.repeat(200));await expect(form.locator('[data-biography-counter]')).toHaveAttribute('data-character-state','warning');
  await expect(form.locator('[data-biography-counter]')).toHaveAttribute('aria-label','200 of 250 characters');
  await expect(form.locator('[data-media-visibility]')).toHaveCSS('border-top-width','0px');
  await expect(form.locator('[data-signout],[data-reset-password]')).toHaveCount(0);
  await expect(form.locator('[name=contact_phone],[name=email]')).toHaveCount(0);
  await form.locator('[name=artist_name]').fill('Test artist');
  await form.locator('[type=submit]').click();
  const feedback=page.locator('.system-save-confirmation');await expect(feedback).toHaveText('Profile saved.');await expect(feedback).toHaveAttribute('data-visible','true');await expect(feedback).toHaveAttribute('data-visible','false',{timeout:6500});
  const update=requests.findLast(request=>request.path.endsWith('/studio_profiles')&&request.method!=='GET');expect(update.body).not.toHaveProperty('contact_phone');
});
test('concert drafts save separately from explicit publication and cancellation',async({page})=>{
 const requests=await mockBackend(page),dialog=await openAccount(page);
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
 await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.goto('/concerts/');const root=page.locator('[data-concerts]');await expect(page.locator('html')).not.toHaveAttribute('data-page-loading','true',{timeout:15000});await expect(root.locator('[data-concert-controls]')).toBeVisible();
 await root.locator('[name=title]').fill('Piano night');await root.locator('[name=starts_at]').fill('2026-12-01T20:00');await root.locator('[name=timezone]').fill('Europe/Berlin');await root.locator('[name=venue]').fill('Concert hall');await root.locator('[name=city]').fill('Berlin');await root.locator('[name=country]').fill('DE');
 await root.getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator('.system-save-confirmation')).toHaveText('Concert saved.');
 expect(requests.some(row=>row.path.endsWith('/rpc/studio_set_concert_status'))).toBe(false);
 await root.getByRole('button',{name:'Publish concert',exact:true}).click();await expect(root.locator('[data-concert-status]')).toHaveText('Concert: published.');
 await root.getByRole('button',{name:'Cancel concert',exact:true}).click();await expect(root.locator('[data-concert-status]')).toHaveText('Concert: cancelled.');
 await root.getByRole('button',{name:'Return to draft',exact:true}).click();await expect(root.locator('[data-concert-status]')).toHaveText('Concert: draft.');
 const saved=requests.find(row=>row.path.endsWith('/studio_concerts')&&row.method==='POST');expect(saved.body.starts_at).toBe('2026-12-01T19:00:00.000Z');expect(saved.body.status).toBeUndefined();
});
test('album preparation selects track count and single preparation permits only one track',async({page})=>{
 await mockBackend(page);const dialog=await openAccount(page);await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();await expect(page.locator('[data-profile-form]')).toBeVisible();
 await page.goto('/releases/#release-drafts');const form=page.locator('[data-release-metadata] form');await expect(form.locator('[data-track]')).toHaveCount(1);await expect(form.locator('[data-add-track]')).toBeDisabled();
 await form.locator('[name=type]').selectOption('Album');await expect(form.locator('[data-track]')).toHaveCount(2);
 await form.locator('[data-track-count]').fill('3');await form.locator('[data-track-count]').press('Tab');await expect(form.locator('[data-track]')).toHaveCount(3);
 await form.locator('[data-add-track]').click();await expect(form.locator('[data-track]')).toHaveCount(4);await expect(form.locator('[data-add-track] img')).toHaveAttribute('src',/\/app\/icons\//);
 page.once('dialog',dialog=>dialog.accept());await form.locator('[name=type]').selectOption('Single');await expect(form.locator('[data-track]')).toHaveCount(1);await expect(form.locator('[data-track-count]')).toHaveValue('1');await expect(form.locator('[data-add-track]')).toBeDisabled();
});
test('profile tabs isolate sections, retain the selected address and use standard rail icons',async({page,isMobile})=>{
  await mockBackend(page);
  const account=await openAccount(page);await account.locator('[name=email]').fill(user.email);await account.locator('[data-auth-form] [name=password]').fill('Test-password-123');await account.locator('[data-auth-submit]').click();
  const profile=page.getByRole('tab',{name:'Profile',exact:true});
  const catalogue=page.getByRole('tab',{name:'Links & catalogue',exact:true});
  await expect(profile).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#profile-catalogue')).toBeHidden();
  await expect(page.locator('#profile-publication')).toBeHidden();
  await catalogue.click();
  await expect(page.locator('#profile-details')).toBeHidden();
  await expect(page.locator('#profile-catalogue')).toBeVisible();
  expect(Number(await catalogue.evaluate(el=>getComputedStyle(el).opacity))).toBeGreaterThan(Number(await profile.evaluate(el=>getComputedStyle(el).opacity)));
  await expect(catalogue).toHaveCSS('align-items','center');
  await catalogue.press('ArrowRight');
  await expect(page.getByRole('tab',{name:'Website',exact:true})).toBeFocused();
  await page.getByRole('tab',{name:'Website',exact:true}).press('ArrowRight');
  await expect(page.getByRole('tab',{name:'Publication',exact:true})).toBeFocused();
  await expect(page.locator('#profile-publication')).toBeVisible();
  await expect(page.locator('#profile-catalogue')).toBeHidden();
  await page.reload();
  await expect(page.getByRole('tab',{name:'Publication',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#profile-details')).toBeHidden();
  if(!isMobile&&await page.locator('[data-platform-rail-toggle]').isVisible()){
    const toggle=await page.locator('[data-platform-rail-toggle] img').boundingBox();
    const item=await page.locator('.studio-platform-group a .studio-icon').first().boundingBox();
    expect(toggle.width).toBe(item.width);expect(toggle.height).toBe(item.height);
  }
});
test('shared portrait editor crops only after confirmation and preserves the camera size',async({page})=>{
  await mockBackend(page);
  await page.addInitScript(()=>{const encode=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,...args){return encode.call(this,blob=>{window.__testCrop={width:this.width,height:this.height,type:blob?.type};callback(blob);},...args);};});
  let releaseListings;const listingsReady=new Promise(resolve=>{releaseListings=resolve;});
  await page.route('**/storage/v1/object/list/**',async route=>{await listingsReady;await route.fulfill({status:200,contentType:'application/json',body:'[]'});});
  let uploads=0;
  await page.route('**/storage/v1/object/studio-avatars/**',async route=>{
    uploads++;expect(route.request().method()).toBe('POST');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({Key:id+'/avatar'})});
  });
  await page.route('**/storage/v1/object/sign/studio-avatars/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({signedURL:'/object/sign/studio-avatars/'+id+'/avatar?token=fixture'})}));
  const account=await openAccount(page);await account.locator('[name=email]').fill(user.email);await account.locator('[data-auth-form] [name=password]').fill('Test-password-123');await account.locator('[data-auth-submit]').click();
  await expect(page.locator('.ui-loading-surface')).toBeVisible();
  releaseListings();
  await expect(page.locator('[data-profile-form]')).toBeVisible({timeout:15000});
  const avatar=await page.locator('.studio-avatar').boundingBox(),header=await page.locator('.studio-profile-header').boundingBox();
  expect(avatar.width).toBeGreaterThan(90);expect(Math.abs(avatar.width-avatar.height)).toBeLessThan(1);expect(avatar.y).toBeLessThan(header.y+header.height);
  const photoAction=page.getByRole('button',{name:'Change profile photograph',exact:true});await expect(photoAction).not.toHaveClass(/ui-button/);await expect(photoAction).toHaveClass(/profile-media-action/);expect((await photoAction.boundingBox()).width).toBeLessThan(30);
  const camera=await page.locator('.studio-avatar .studio-photo-action .studio-icon').boundingBox();expect(camera.width).toBeLessThan(30);await expect(photoAction.locator('img')).toHaveClass(/ui-icon-theme-aware/);
  await page.getByRole('button',{name:'Change profile photograph',exact:true}).click();
  const editor=page.getByRole('dialog',{name:'Edit Profile Image',exact:true});await expect(editor).toBeVisible();
  const titleBox=await editor.getByRole('heading').boundingBox(),closeBox=await editor.getByRole('button',{name:'Close image editor'}).boundingBox();expect(closeBox.x).toBeGreaterThan(titleBox.x+titleBox.width);
  await editor.getByRole('button',{name:'Close image editor'}).click();expect(uploads).toBe(0);
  const image=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=300;canvas.height=180;const c=canvas.getContext('2d');c.fillStyle='#d2691e';c.fillRect(0,0,150,180);c.fillStyle='#006b54';c.fillRect(150,0,150,180);return canvas.toDataURL('image/png').split(',')[1];});
  await page.locator('[name=photo]').setInputFiles({name:'crop-test.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});await expect(editor).toBeVisible();
  await editor.getByRole('slider',{name:'Crop zoom'}).fill('1.8');await editor.getByRole('combobox',{name:'Image filter'}).selectOption('mono');await expect(editor.locator('[data-profile-media-editor-filter-label]')).toHaveText('Mono');
  expect(uploads).toBe(0);await editor.getByRole('button',{name:'Save',exact:true}).click();await expect(editor).toBeHidden();expect(uploads).toBe(1);await expect(page.locator('[data-profile-status]')).toHaveText('Profile photograph saved privately.');
  expect(await page.evaluate(()=>window.__testCrop)).toEqual({width:1024,height:1024,type:'image/jpeg'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.getByRole('button',{name:'Change header image',exact:true}).click();await expect(page.getByRole('dialog',{name:'Edit Header Image',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close image editor'}).click();
  await page.screenshot({path:test.info().outputPath('portrait-over-header.png')});
});
test('artist notifications retain decisions and mark only the selected item read',async({page})=>{
 await mockBackend(page);let read=false;
 const notification='95000000-0000-4000-8000-000000000001';
 await page.route('https://hahtbepdrjkjluhespbs.supabase.co/rest/v1/studio_notifications*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{id:notification,kind:'username',status:'approved',message:'Your username is approved.',created_at:'2026-10-22T10:00:00Z',read_at:read?'2026-10-22T10:01:00Z':null}])}));
 await page.route('https://hahtbepdrjkjluhespbs.supabase.co/rest/v1/rpc/studio_read_notification',route=>{expect(route.request().postDataJSON()).toEqual({notification});read=true;return route.fulfill({status:200,contentType:'application/json',body:'null'});});
 const dialog=await openAccount(page);await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
 const trigger=page.getByRole('button',{name:'Notifications, 1 unread',exact:true});await expect(trigger).toBeVisible();await trigger.click();
 const notices=page.getByRole('dialog',{name:'Notifications',exact:true});await expect(notices).toContainText('Your username is approved.');await notices.getByRole('button',{name:'Mark as read',exact:true}).click();
 await expect(page.getByRole('button',{name:'Notifications',exact:true})).toBeVisible();await expect(notices).not.toContainText('Your username is approved.');await notices.getByRole('button',{name:'History',exact:true}).click();await expect(notices).toContainText('Your username is approved.');await expect(notices.getByRole('button',{name:'Mark as read'})).toHaveCount(0);
});
test('search keeps branded close controls and focuses typing immediately',async({page})=>{
  await mockBackend(page);
  await page.goto('/');
  await page.locator('[data-studio-search-open]').first().click();
  const dialog=page.locator('#store-search-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input')).toBeFocused();
  await expect(dialog.locator('[data-search-close] .global-close-button__line')).toHaveCount(2);
  await dialog.locator('[data-search-close]').click();
  await expect(dialog).toBeHidden();
});
test('signup and recovery keep distinct fields, required consent and usable close controls',async({page})=>{
  const requests=await mockBackend(page),dialog=await openAccount(page);
  await expect(dialog.locator('[name=email]')).toBeFocused();
  await dialog.locator('[data-auth-action=signup]').click();
  const consent=dialog.locator('.studio-consent');
  const checkboxBox=await consent.locator('input').boundingBox(),textBox=await consent.locator('span').boundingBox();
  expect(checkboxBox.x+checkboxBox.width).toBeLessThan(textBox.x);expect(Math.abs(checkboxBox.y-textBox.y)).toBeLessThan(10);
  await dialog.locator('[name=email]').fill(user.email);
  await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');
  await dialog.locator('[data-auth-submit]').click();
  expect(requests.some(request=>request.path.endsWith('/signup'))).toBe(false);
  await dialog.locator('[name=terms]').check();
  await dialog.locator('[data-auth-submit]').click();
  await expect(dialog.locator('[data-account-status]')).toHaveText('Check your email to confirm your account.');
  expect(requests.some(request=>request.path.endsWith('/signup'))).toBe(true);
  await dialog.locator('[data-auth-action=recover]').click();
  await expect(dialog.locator('[data-auth-form] [name=password]')).toBeHidden();
  await dialog.locator('[data-auth-submit]').click();
  await expect(dialog.locator('[data-account-status]')).toContainText('If an account matches');
  expect(requests.find(request=>request.path.endsWith('/recover')).query).toContain('flow%3Drecovery');
  await dialog.locator('#account-close').click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
test('payout applications submit inside Studio, persist under review and never invoke Stripe',async({page})=>{
 const requests=await mockBackend(page);let application=null;
 await page.route('**/rest/v1/studio_payout_applications*',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(application?[application]:[])}));
 await page.route('**/rest/v1/rpc/studio_submit_payout_application',async route=>{application={...route.request().postDataJSON().value,status:'pending',decision_note:''};await route.fulfill({contentType:'application/json',body:'null'});});
 const account=await openAccount(page);await account.locator('[name=email]').fill(user.email);await account.locator('[data-auth-form] [name=password]').fill('Test-password-123');await account.locator('[data-auth-submit]').click();await expect(page).toHaveURL(/\/profile\/$/);
 await page.goto('/settings/#payments');const form=page.locator('[data-payout-application-form]');await expect(form).toBeVisible();await form.getByLabel('Legal name',{exact:true}).fill('Test Artist');await form.getByLabel('Recipient type').selectOption('individual');await form.getByLabel('Country of residence or business registration').fill('HR');await form.getByLabel('Country of tax residence').fill('HR');await form.getByRole('checkbox').check();await form.getByRole('button',{name:'Submit application'}).click();
 await expect(page.locator('[data-payout-application-status]')).toContainText('under review');await expect(form).toBeHidden();await page.reload();await expect(page.locator('[data-payout-application-status]')).toContainText('under review');expect(requests.some(item=>item.path.includes('/functions/v1/studio-connect'))).toBe(false);await expect(page).toHaveURL(/\/settings\/#payments$/);
});
test('Bank and payout settings never simulate money or enable withdrawals',async({page})=>{
  await mockBackend(page);
  await page.goto('/payouts/');
  await expect(page.getByRole('heading',{name:'Bank',exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'Withdrawals',exact:true}).click();
  await expect(page.getByRole('button',{name:'Request withdrawal',exact:true})).toBeDisabled();
  await expect(page.getByText('Minimum withdrawal: not set.',{exact:false})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab',{name:'Withdrawals',exact:true})).toHaveAttribute('aria-selected','true');
  await page.getByRole('link',{name:'Payment & payout settings',exact:true}).click();
  await expect(page.getByRole('tab',{name:'Artist payout setup',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('tabpanel',{name:'Artist payout setup',exact:true})).toContainText('Sign in to manage your payout application.');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
test('sign-in opens a private profile and sign-out does not revoke other applications',async({page})=>{
  const requests=await mockBackend(page),dialog=await openAccount(page);
  await dialog.locator('[name=email]').fill(user.email);
  await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');
  await dialog.locator('[data-auth-submit]').click();
  await expect(page).toHaveURL(/\/profile\/$/);
  const form=page.locator('[data-profile-form]');
  await expect(form).toBeVisible();
  const billing=page.locator('.studio-billing');
  await expect(page.getByRole('tab',{name:'Addresses',exact:true})).toHaveCount(0);
  await page.goto('/settings/#addresses');
  await expect(billing).toBeVisible();
  await billing.locator('summary').click();
  await expect(billing.locator('input').first()).toBeVisible();
  await billing.locator('summary').click();
  await page.goto('/profile/');
  await expect(form).toBeVisible();
  await form.locator('[name=artist_name]').fill('Test artist');
  await form.locator('[type=submit]').click();
  await expect(page.locator('[data-profile-status]')).toBeEmpty();
  await expect(page.locator('.system-save-confirmation')).toHaveText('Profile saved.');
  const save=requests.find(request=>request.path.endsWith('/studio_profiles')&&request.method==='POST');
  expect(save.body.id).toBe(id);expect(save.body.artist_name).toBe('Test artist');expect(save.body.role).toBeUndefined();
  await page.goto('/settings/#security');
  await page.locator('[data-settings-panel="security"] [data-signout]').click();
  await expect(page).toHaveURL(/\/account\/$/);
  expect(requests.find(request=>request.path.endsWith('/logout')).query).toContain('scope=local');
});
test('email recovery token is consumed, scrubbed and opens only password recovery',async({page})=>{
  const requests=await mockBackend(page);
  await page.goto('/account/?flow=recovery#token_hash=mock-recovery-token&type=recovery');
  await expect(page.locator('[data-recovery-form]')).toBeVisible();
  await expect(page.locator('[data-auth-form]')).toBeHidden();
  await expect(page).toHaveURL(/\/account\/$/);
  expect(requests.find(request=>request.path.endsWith('/verify')).body).toMatchObject({token_hash:'mock-recovery-token',type:'recovery'});
});
test('catalogue metadata saves field visibility without changing account identity',async({page})=>{
  const requests=await mockBackend(page),dialog=await openAccount(page);
  await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
  await page.getByRole('tab',{name:'Links & catalogue',exact:true}).click();
  const view=page.locator('[data-artist-metadata]');await expect(view).toBeVisible();
  await view.getByText('Streaming profiles',{exact:true}).click();
  await view.locator('[name=spotify]').fill('https://open.spotify.com/artist/test');
  await view.locator('[data-visibility-key=spotify]').check();
  await view.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.locator('.system-save-confirmation')).toHaveText('Catalogue changes saved.');
  await expect(view.locator('[data-metadata-status]')).toBeEmpty();
  const saved=requests.find(request=>request.path.endsWith('/studio_artist_metadata')&&request.method==='POST').body;
  expect(saved.metadata.visibility.spotify).toBe('public');expect(saved.metadata.visibility.biography).toBe('private');expect(saved.metadata.email).toBeUndefined();
});
test('username and tier requests remain pending without client approval powers',async({page})=>{
 const requests=await mockBackend(page),dialog=await openAccount(page);
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
 await page.getByRole('tab',{name:'Publication',exact:true}).click();
 const identity=page.locator('[data-artist-identity]');await expect(identity).toBeVisible();await identity.locator('[name=username]').fill('testmusician95');await identity.getByRole('button',{name:'Request username'}).click();await expect(identity.locator('[data-handle-notice]')).toContainText('awaiting label review');await expect(identity.locator('[data-publish-profile]')).toBeDisabled();
 const application=page.locator('[data-partnership-application]');await expect(application).toBeVisible();await application.locator('[name=tier]').selectOption('platinum');await application.getByRole('button',{name:'Send application'}).click();await expect(application.getByRole('status')).toContainText('Requested: platinum. Status: pending.');expect(requests.some(request=>/review_username|review_tier/.test(request.path))).toBe(false);
});
test('Google photo is used as a fallback for a verified Google provider',async({page})=>{
  await mockBackend(page);
  await page.route('https://hahtbepdrjkjluhespbs.supabase.co/auth/v1/user',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...user,app_metadata:{provider:'google'},user_metadata:{picture:'https://lh3.googleusercontent.com/test-photo'}})}));
  await page.route('https://lh3.googleusercontent.com/test-photo',route=>route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDV8AAAAASUVORK5CYII=','base64')}));
  const dialog=await openAccount(page);await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
  await expect(page.locator('[data-avatar]')).toBeVisible();await expect(page.locator('[data-avatar-placeholder]')).toBeHidden();
});
test('release drafts preserve stories, lyrics and contributors without submission',async({page})=>{
  const requests=await mockBackend(page),dialog=await openAccount(page);
  await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
  await expect(page).toHaveURL(/\/profile\/$/);await expect(page.locator('[data-profile-form]')).toBeVisible();
  await page.goto('/releases/');await page.getByRole('tab',{name:'New release & drafts',exact:true}).click();const view=page.locator('[data-release-metadata]');
  await expect(view.locator('[data-release-controls]')).toBeVisible();
  await view.locator('form > details').first().locator('[name=title]').fill('Test single');
  await view.getByText('Release story',{exact:true}).click();await view.locator('form > details').filter({has:page.locator('[name=description]')}).locator('[name=story]').fill('Release story');
  const track=view.locator('[data-track]');await track.locator('[name=title]').fill('Test song');await track.getByText('Story and lyrics',{exact:true}).click();await track.locator('[name=lyrics]').fill('Test lyrics');
  await track.locator('[data-add-contributor]').click();await track.locator('[name=contributor_name]').fill('Test writer');
  await view.getByText('Publication choices',{exact:true}).click();await view.locator('[data-visibility-key=story]').check();
  await view.getByRole('button',{name:'Save release draft'}).click();await expect(view.locator('[data-metadata-status]')).toContainText('Nothing is submitted');
  const saved=requests.find(request=>request.path.endsWith('/studio_release_drafts')&&request.method==='POST').body;
  expect(saved.metadata.tracks[0].lyrics).toBe('Test lyrics');expect(saved.metadata.tracks[0].contributors[0].name).toBe('Test writer');expect(saved.metadata.visibility.story).toBe('public');
  await view.locator('[data-new-draft]').click();await view.locator('[data-draft-picker]').selectOption('94000000-0000-0000-0000-000000000001');
  await expect(view.locator('[data-track] [name=lyrics]')).toHaveValue('Test lyrics');
});
test('release covers validate square originals and save privately with a retryable draft',async({page})=>{
 const file=async(width,height)=>Buffer.from(await page.evaluate(({width,height})=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').fillRect(0,0,width,height);return canvas.toDataURL('image/png').split(',')[1];},{width,height}),'base64');
 const cover=await file(1000,1000),requests=await mockBackend(page,{releaseCover:cover}),dialog=await openAccount(page);
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();await expect(page).toHaveURL(/\/profile\/$/);
 await page.goto('/releases/');await page.getByRole('tab',{name:'New release & drafts',exact:true}).click();const view=page.locator('[data-release-metadata]');await expect(view.locator('[data-release-controls]')).toBeVisible();
 const input=view.locator('[data-release-artwork] input[type=file]'),notice=view.locator('[data-cover-status]');
 await input.setInputFiles({name:'wide.png',mimeType:'image/png',buffer:await file(1000,1200)});await expect(notice).toContainText('must be square');
 await input.setInputFiles({name:'small.png',mimeType:'image/png',buffer:await file(100,100)});await expect(notice).toContainText('1000 and 6000');
 await input.setInputFiles({name:'invalid.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await expect(notice).toContainText('valid JPEG or PNG');
 await input.setInputFiles({name:'cover.png',mimeType:'image/png',buffer:cover});await expect(notice).toContainText('1000 x 1000');await expect(view.locator('[data-cover-preview]')).toBeVisible();
 await view.locator('form > details').first().locator('[name=title]').fill('Artwork single');await view.locator('[data-track] [name=title]').fill('Artwork song');
 let fail=true;await page.route('**/storage/v1/object/studio-release-artwork/**',async route=>{if(fail){fail=false;return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({message:'Fixture upload denial'})});}await route.fallback();});
 await view.getByRole('button',{name:'Save release draft'}).click();await expect(view.locator('[data-metadata-status]')).toContainText('Your text draft is saved');
 await view.getByRole('button',{name:'Save release draft'}).click();await expect(view.locator('[data-metadata-status]')).toContainText('Nothing is submitted');
 expect(requests.filter(request=>request.path.endsWith('/studio_release_drafts')&&request.method==='POST')).toHaveLength(1);
 const attached=requests.find(request=>request.method==='PATCH'&&request.body?.metadata?.artwork).body.metadata.artwork;expect(attached.path).toMatch(new RegExp('^'+id+'/94000000-0000-0000-0000-000000000001/'));expect(attached.width).toBe(1000);
 await view.locator('[data-new-draft]').click();await expect(view.locator('[data-cover-preview]')).toBeHidden();await view.locator('[data-draft-picker]').selectOption('94000000-0000-0000-0000-000000000001');await expect(notice).toContainText('cover.png');await expect(view.locator('[data-cover-preview]')).toBeVisible();await expect.poll(()=>view.locator('[data-cover-preview]').evaluate(el=>el.naturalWidth)).toBe(1000);
 expect(requests.some(request=>/publish|deliver/.test(request.path))).toBe(false);
 if(test.info().project.name==='chromium-desktop')await page.screenshot({path:'/tmp/studio-release-artwork.png'});
});
