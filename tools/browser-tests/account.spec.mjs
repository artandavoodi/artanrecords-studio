import {test,expect} from '@playwright/test';

const id='92000000-0000-0000-0000-000000000001';
const user={id,aud:'authenticated',role:'authenticated',email:'artist@example.test',email_confirmed_at:'2026-10-20T00:00:00Z',created_at:'2026-10-20T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{full_name:'Test artist'}};
const access=[{alg:'HS256',typ:'JWT'},{sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'test-signature'].map(value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url')).join('.');
const session={access_token:access,refresh_token:'test-refresh-not-a-real-credential',token_type:'bearer',expires_in:3600,user};
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
    else if(url.pathname.endsWith('/rpc/studio_save_artist_graphics'))body=null;
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
 await expect(form.getByLabel('Choose artist colour')).toHaveValue('#123456');
 await expect(form.locator('[data-colour-swatch]')).toHaveCount(1);await expect(form.locator('[data-colour-swatch]')).toHaveAttribute('data-colour-swatch','#123456');
 await expect(form.locator('.studio-color-field')).toHaveCSS('display','flex');await expect(form.getByRole('button',{name:'Remove colour'})).toHaveText('');
 const colours=page.getByRole('dialog',{name:'Custom artist colours'});await expect(colours).toBeVisible();await expect(colours.locator('.global-close-button__line')).toHaveCount(2);
 expect(await colours.evaluate(el=>getComputedStyle(el,'::backdrop').backdropFilter)).not.toBe('none');
 if(test.info().project.name==='chromium-desktop')await page.screenshot({path:'/tmp/studio-graphics-refined-proof.png'});
 await colours.getByRole('button',{name:'Close custom colours'}).click();await expect(colours).toBeHidden();await expect(form.getByRole('button',{name:'Custom colour'})).toBeFocused();
 await form.getByLabel('Share my artist colours').check();await form.getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.locator('.system-save-confirmation')).toHaveText('Graphics saved.');
 expect(requests.find(item=>item.path.endsWith('/rpc/studio_save_artist_graphics')).body).toEqual({colors:['#123456'],share_logo:false,share_palette:true});
 await form.getByRole('button',{name:'Edit #123456'}).click();await colours.getByRole('button',{name:'Remove colour'}).click();await colours.getByRole('button',{name:'Close custom colours'}).click();await expect(form.locator('[data-colour-swatch]')).toHaveCount(2);await expect(form.getByRole('button',{name:'Use black'})).toBeVisible();await expect(form.getByRole('button',{name:'Use white'})).toBeVisible();
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
 await input.setInputFiles({name:'fixture.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect x="20" y="20" width="100" height="50" fill="black"/></svg>')});
 await expect(logoDialog).toBeVisible();await expect(logoDialog.locator('[data-logo-candidate]')).toHaveCount(2);await expect(logoDialog.locator('[data-logo-candidate]').first()).toHaveJSProperty('naturalWidth',200);await expect(logoDialog.locator('[data-logo-candidate]').first()).toHaveJSProperty('naturalHeight',100);await expect(form.locator('[data-logo-preview]')).toBeHidden();
 await expect(logoDialog.locator('.global-close-button__line')).toHaveCount(2);await expect(logoDialog.locator('.global-close-button')).not.toHaveClass(/ui-button/);await expect(logoDialog.locator('.global-close-button')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');expect(await logoDialog.evaluate(el=>getComputedStyle(el,'::backdrop').backdropFilter)).not.toBe('none');await expect(logoDialog.locator('[data-logo-backdrop=light]')).toHaveCSS('background-color','rgb(255, 255, 255)');await expect(logoDialog.locator('[data-logo-backdrop=dark]')).toHaveCSS('background-color','rgb(0, 0, 0)');
 expect(requests.filter(item=>item.method==='POST'&&item.path.includes('/object/studio-logos/'))).toHaveLength(0);
 if(test.info().project.name==='chromium-desktop')await page.screenshot({path:'/tmp/studio-logo-preview-dialog.png'});
 await logoDialog.getByRole('button',{name:'Use logo',exact:true}).click();await expect(logoDialog).toBeHidden();
 await expect(form.locator('[data-logo-preview]')).toBeVisible();await expect(form.locator('[data-logo-preview]')).toHaveJSProperty('naturalWidth',200);await expect(form.locator('[data-logo-preview]')).toHaveJSProperty('naturalHeight',100);
 await form.getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator('.system-save-confirmation')).toHaveText('Graphics saved.');
 expect(requests.filter(item=>item.method==='POST'&&item.path.includes('/object/studio-logos/')).map(item=>item.path.split('/').at(-1))).toEqual(['source','logo']);
 const retained=await form.locator('[data-logo-preview]').getAttribute('src');await input.setInputFiles({name:'replacement.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="20" fill="white"/></svg>')});await expect(logoDialog.getByRole('button',{name:'Use logo',exact:true})).toBeEnabled();await page.keyboard.press('Escape');await expect(logoDialog).toBeHidden();await expect(form.locator('[data-logo-preview]')).toHaveAttribute('src',retained);
 const png=async opaque=>Buffer.from(await page.evaluate(opaque=>{const canvas=document.createElement('canvas');canvas.width=300;canvas.height=150;const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,opaque?300:100,opaque?150:50);return canvas.toDataURL('image/png').split(',')[1];},opaque),'base64');
 await input.setInputFiles({name:'transparent.png',mimeType:'image/png',buffer:await png(false)});await expect(logoDialog.getByRole('button',{name:'Use logo',exact:true})).toBeEnabled();await expect(logoDialog.locator('[data-logo-candidate]').first()).toHaveJSProperty('naturalWidth',300);await page.keyboard.press('Escape');
 await input.setInputFiles({name:'opaque.png',mimeType:'image/png',buffer:await png(true)});await expect(logoDialog.getByRole('alert')).toContainText('transparent background');await expect(logoDialog.getByRole('button',{name:'Use logo',exact:true})).toBeDisabled();await logoDialog.getByRole('button',{name:'Close logo preview'}).click();await expect(form.locator('[data-logo-preview]')).toHaveAttribute('src',retained);
});
test('profile saves show shared feedback and text fields resize only vertically',async({page})=>{
  await mockBackend(page);
  const account=await openAccount(page);await account.locator('[name=email]').fill(user.email);await account.locator('[data-auth-form] [name=password]').fill('Test-password-123');await account.locator('[data-auth-submit]').click();
  const form=page.locator('[data-profile-form]');await expect(form).toBeVisible();
  await expect(form.locator('textarea')).toHaveCSS('resize','vertical');
  await expect(form.locator('[data-media-visibility]')).toHaveCSS('border-top-width','0px');
  await expect(form.locator('[data-signout],[data-reset-password]')).toHaveCount(0);
  await form.locator('[name=artist_name]').fill('Test artist');
  await form.locator('[type=submit]').click();
  const feedback=page.locator('.system-save-confirmation');await expect(feedback).toHaveText('Profile saved.');await expect(feedback).toHaveAttribute('data-visible','true');await expect(feedback).toHaveAttribute('data-visible','false',{timeout:6500});
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
test('sign-in opens a private profile and sign-out does not revoke other applications',async({page})=>{
  const requests=await mockBackend(page),dialog=await openAccount(page);
  await dialog.locator('[name=email]').fill(user.email);
  await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');
  await dialog.locator('[data-auth-submit]').click();
  await expect(page).toHaveURL(/\/profile\/$/);
  const form=page.locator('[data-profile-form]');
  await expect(form).toBeVisible();
  const billing=page.locator('.studio-billing');
  const profileField=await form.locator('[name=display_name]').boundingBox();
  await page.getByRole('tab',{name:'Addresses',exact:true}).click();
  await expect(billing).toBeVisible();
  await billing.locator('summary').click();
  const addressField=await billing.locator('input').first().boundingBox();
  expect(Math.abs(profileField.x-addressField.x)).toBeLessThan(1);
  expect(Math.abs(profileField.width-addressField.width)).toBeLessThan(1);
  await billing.locator('summary').click();
  await page.getByRole('tab',{name:'Profile',exact:true}).click();
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
