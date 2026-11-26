import {test,expect} from '@playwright/test';
test('Studio setup consumes a one-time code, requires matching passwords and completes only the approved handoff',async({page})=>{
 const id='92000000-0000-0000-0000-000000000001',envelope='92000000-0000-0000-0000-000000000099',email='artist@example.test',username='fixture.artist';
 const user={id,role:'authenticated',aud:'authenticated',email,email_confirmed_at:'2026-11-26T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{}};
 const token=[{alg:'HS256'},{sub:id,role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'fixture-only'].map(value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url')).join('.');const session={access_token:token,refresh_token:'fixture-only',token_type:'bearer',expires_in:3600,user};
 let signed=false,updates=0,finished=0;
 await page.addInitScript(()=>localStorage.setItem('neuroartan.cookieConsent',JSON.stringify({state:'rejected',preferences:{essential:true,'experience-preferences':false},updatedAt:new Date().toISOString()})));
 await page.route('https://hahtbepdrjkjluhespbs.supabase.co/**',route=>{const request=route.request(),path=new URL(request.url()).pathname;let body;
  if(path.endsWith('/auth/v1/verify')){expect(request.postDataJSON()).toMatchObject({email,token:'12345678',type:'recovery'});signed=true;body=session;}
  else if(path.endsWith('/auth/v1/token'))body=session;
  else if(path.endsWith('/auth/v1/user')){if(request.method()==='PUT'){expect(request.postDataJSON().password).toBe('Synthetic password 1234');updates++;}if(!signed)return route.fulfill({status:401,json:{message:'Signed out'}});body=user;}
  else if(path.endsWith('/rpc/contract_access_setup_status')){expect(request.postDataJSON()).toEqual({envelope});body={username};}
  else if(path.endsWith('/rpc/contract_finish_access_setup')){expect(updates).toBe(1);finished++;body=null;}
  else throw Error('Unexpected setup operation: '+path);return route.fulfill({json:body});
 });
 await page.route('**/profile/',route=>route.fulfill({contentType:'text/html',body:'<h1>Synthetic Studio entry</h1>'}));
 await page.goto('/account/?flow=studio-access#'+new URLSearchParams({email,username,envelope}));await expect(page.getByLabel('Username',{exact:true})).toHaveValue(username);await expect(page.getByRole('textbox',{name:'Digit 1 of 8',exact:true})).toBeVisible();expect(page.url()).not.toContain(email);
 await page.getByRole('textbox',{name:'Digit 1 of 8',exact:true}).fill('12345678');await expect(page.locator('[data-studio-access-password]').getByLabel('New password',{exact:true})).toBeVisible();await expect(page.locator('[data-studio-access-password]').getByLabel('Confirm password',{exact:true})).toBeVisible();await page.locator('[data-studio-access-password]').getByLabel('New password',{exact:true}).fill('Synthetic password 1234');await page.locator('[data-studio-access-password]').getByLabel('Confirm password',{exact:true}).fill('Different password 1234');await page.getByRole('button',{name:'Set password and enter Studio',exact:true}).click();await expect(page.locator('[data-account-status]')).toHaveText('Passwords do not match.');expect(updates).toBe(0);
 await page.locator('[data-studio-access-password]').getByLabel('Confirm password',{exact:true}).fill('Synthetic password 1234');await page.getByRole('button',{name:'Set password and enter Studio',exact:true}).click();await expect(page).toHaveURL(/\/profile\/$/);expect(updates).toBe(1);expect(finished).toBe(1);expect(await page.evaluate(()=>sessionStorage.getItem('artanrecords-studio-access-setup'))).toBeNull();
});
