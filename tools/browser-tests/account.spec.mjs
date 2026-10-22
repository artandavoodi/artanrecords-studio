import {test,expect} from '@playwright/test';

const id='92000000-0000-0000-0000-000000000001';
const user={id,aud:'authenticated',role:'authenticated',email:'artist@example.test',email_confirmed_at:'2026-10-20T00:00:00Z',created_at:'2026-10-20T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{full_name:'Test artist'}};
const access=[{alg:'HS256',typ:'JWT'},{sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'test-signature'].map(value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url')).join('.');
const session={access_token:access,refresh_token:'test-refresh-not-a-real-credential',token_type:'bearer',expires_in:3600,user};
async function mockBackend(page){
  const requests=[];
  let artistMetadata=null,handle=null,application=null;const drafts=new Map();
  await page.route('https://hahtbepdrjkjluhespbs.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    requests.push({path:url.pathname,query:url.search,body:request.postDataJSON(),method:request.method()});
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
      else{const selected=url.searchParams.get('id')?.replace('eq.','')||'94000000-0000-0000-0000-000000000001';drafts.set(selected,request.postDataJSON());body={id:selected};status=201;}
    }
    else if(url.pathname.endsWith('/studio_artist_handles'))body=handle?[handle]:[];
    else if(url.pathname.endsWith('/studio_artist_applications'))body=application?[application]:[];
    else if(url.pathname.endsWith('/rpc/studio_username_check'))body='available';
    else if(url.pathname.endsWith('/rpc/studio_request_username')){handle={requested_username:request.postDataJSON().candidate,approved_username:null,status:'pending',notice:'Your username is awaiting label review.'};body=null;}
    else if(url.pathname.endsWith('/rpc/studio_apply_partnership')){application={requested_tier:request.postDataJSON().tier,approved_tier:null,status:'pending',decision_note:''};body=null;}
    else if(url.pathname.includes('/rest/v1/studio_')){body=request.method()==='GET'?[]:null;status=request.method()==='POST'?201:200;}
    else if(url.pathname.includes('/storage/v1/object/list/'))body=[];
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
  await expect(billing).toBeVisible();
  await billing.locator('summary').click();
  const profileField=await form.locator('[name=display_name]').boundingBox();
  const addressField=await billing.locator('input').first().boundingBox();
  expect(Math.abs(profileField.x-addressField.x)).toBeLessThan(1);
  expect(Math.abs(profileField.width-addressField.width)).toBeLessThan(1);
  await billing.locator('summary').click();
  await form.locator('[name=artist_name]').fill('Test artist');
  await form.locator('[type=submit]').click();
  await expect(page.locator('[data-profile-status]')).toHaveText('Profile saved.');
  const save=requests.find(request=>request.path.endsWith('/studio_profiles')&&request.method==='POST');
  expect(save.body.id).toBe(id);expect(save.body.artist_name).toBe('Test artist');expect(save.body.role).toBeUndefined();
  await page.locator('[data-profile-form] [data-signout]').click();
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
  const view=page.locator('[data-artist-metadata]');await expect(view).toBeVisible();
  await view.getByText('Streaming profiles',{exact:true}).click();
  await view.locator('[name=spotify]').fill('https://open.spotify.com/artist/test');
  await view.locator('[data-visibility-key=spotify]').check();
  await view.getByRole('button',{name:'Save catalogue information'}).click();
  await expect(view.locator('[data-metadata-status]')).toContainText('visibility saved');
  const saved=requests.find(request=>request.path.endsWith('/studio_artist_metadata')&&request.method==='POST').body;
  expect(saved.metadata.visibility.spotify).toBe('public');expect(saved.metadata.visibility.biography).toBe('private');expect(saved.metadata.email).toBeUndefined();
});
test('username and tier requests remain pending without client approval powers',async({page})=>{
 const requests=await mockBackend(page),dialog=await openAccount(page);
 await dialog.locator('[name=email]').fill(user.email);await dialog.locator('[data-auth-form] [name=password]').fill('Test-password-123');await dialog.locator('[data-auth-submit]').click();
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
  await page.goto('/releases/');const view=page.locator('[data-release-metadata]');
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
