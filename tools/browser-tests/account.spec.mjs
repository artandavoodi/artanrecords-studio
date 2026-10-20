import {test,expect} from '@playwright/test';

const id='92000000-0000-0000-0000-000000000001';
const user={id,aud:'authenticated',role:'authenticated',email:'artist@example.test',email_confirmed_at:'2026-10-20T00:00:00Z',created_at:'2026-10-20T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{full_name:'Test artist'}};
const access=[{alg:'HS256',typ:'JWT'},{sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'test-signature'].map(value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url')).join('.');
const session={access_token:access,refresh_token:'test-refresh-not-a-real-credential',token_type:'bearer',expires_in:3600,user};
async function mockBackend(page){
  const requests=[];
  await page.route('https://hahtbepdrjkjluhespbs.supabase.co/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    requests.push({path:url.pathname,query:url.search,body:request.postDataJSON(),method:request.method()});
    let body={},status=200;
    if(url.pathname.endsWith('/user'))body=user;
    else if(url.pathname.endsWith('/token')||url.pathname.endsWith('/verify'))body=session;
    else if(url.pathname.endsWith('/signup'))body={user,session:null};
    else if(url.pathname.endsWith('/recover'))body={};
    else if(url.pathname.endsWith('/logout'))status=204;
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
test('signup and recovery keep distinct fields, required consent and usable close controls',async({page})=>{
  const requests=await mockBackend(page),dialog=await openAccount(page);
  await expect(dialog.locator('[name=email]')).toBeFocused();
  await dialog.locator('[data-auth-action=signup]').click();
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
