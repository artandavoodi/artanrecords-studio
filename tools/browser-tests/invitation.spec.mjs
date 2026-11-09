import {test,expect} from '@playwright/test';
const id='97030000-0000-0000-0000-000000000003',requestId='97030000-0000-0000-0000-000000000020',invitationId='97030000-0000-0000-0000-000000000010',token='a'.repeat(64);
const user={id,role:'contract_recipient',aud:'authenticated',email:'recipient@example.test',email_confirmed_at:'2026-11-03T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{}};
const jwt=[{alg:'HS256'},{sub:id,role:'contract_recipient',aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'fixture-only'].map(value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url')).join('.');
const session={access_token:jwt,refresh_token:'fixture-only',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user};
async function backend(page){
 const requests=[];let details=null;
 await page.route('https://hahtbepdrjkjluhespbs.supabase.co/**',async route=>{
  const path=new URL(route.request().url()).pathname;requests.push(path);let body;
  if(path.endsWith('/rpc/contract_invitation_check'))body=true;
  else if(path.endsWith('/auth/v1/otp')){
   const redirect=new URL(route.request().url()).searchParams.get('redirect_to');
   expect(redirect).toBe(new URL('/invitation/',page.url()).href);
   expect(redirect).not.toContain(token);body={};
  }
  else if(path.endsWith('/auth/v1/verify'))body=session;
  else if(path.endsWith('/auth/v1/user'))body=user;
  else if(path.endsWith('/rpc/contract_claim_invitation'))body=invitationId;
  else if(path.endsWith('/rpc/contract_invitation_context'))body={request_id:requestId,version_id:null,status:details?'submitted':'awaiting_details',rehearsal:false};
  else if(path.endsWith('/studio_agreement_intake_requests'))body=[{id:requestId,status:details?'submitted':'awaiting_details',rehearsal:false,current_version_id:details?requestId:null,created_at:'2026-11-03T00:00:00Z',artist_message:'Please confirm the requested legal details.'}];
  else if(path.endsWith('/rpc/contract_submit_details')){details=route.request().postDataJSON().payload;body=requestId;}
  else if(path.endsWith('/studio_agreement_intake_versions'))body={details,reply_email:user.email};
  else if(path.endsWith('/studio_agreement_envelopes'))body=[];
  else throw Error('Invitation made an unexpected request: '+path);
  await route.fulfill({json:body});
 });return requests;
}
test('invitation without a private link never mounts Studio or queries private records',async({page})=>{
 const requests=await backend(page);await page.goto('/invitation/');await expect(page.locator('[data-invitation-email]')).toHaveJSProperty('inert',true);await expect(page.locator('[data-invitation-private]')).toBeHidden();await expect(page.locator('[data-platform-layout],#studio-workspace-navigation,[data-settings-tab]')).toHaveCount(0);expect(requests).toEqual([]);
});
test('invited recipient verifies an OTP and submits only requested legal details outside Studio',async({page})=>{
 const requests=await backend(page);await page.goto('/invitation/#token='+token);await expect(page).toHaveURL(/\/invitation\/$/);await page.getByLabel('Invited email address',{exact:true}).fill(user.email);await page.getByRole('button',{name:'Send verification code',exact:true}).click();await page.getByLabel('Email verification code',{exact:true}).fill('123456');await page.getByRole('button',{name:'Verify email',exact:true}).click();await expect(page.locator('[data-invitation-private]')).toBeVisible();await expect(page.locator('[data-platform-layout],#studio-workspace-navigation,[data-settings-tab]')).toHaveCount(0);
 const form=page.locator('[data-intake-form]');for(const [name,value] of Object.entries({legal_name:'Fictional Recipient',artist_name:'Fictional Artist',address_line1:'Example address',city:'Example City',postal_code:'00000',country_code:'HR'}))await form.locator('[name='+name+']').fill(value);await form.locator('[name=confirm_accuracy]').check();await form.getByRole('button',{name:'Submit contract details',exact:true}).click();await expect(form.locator('[name=legal_name]')).toBeDisabled();expect(requests).toContain('/rest/v1/rpc/contract_submit_details');expect(requests.some(path=>/studio_profiles|studio_artist_applications|studio_subscription|studio_release|storage/.test(path))).toBe(false);
 await page.goto('/settings/');await expect(page).toHaveURL(/\/account\/\?mode=signup$/);
});
test('a signing-only session cannot mount the Studio workspace even if copied into its session slot',async({page})=>{
 const requests=await backend(page);await page.addInitScript(value=>{localStorage.setItem('neuroartan.cookieConsent',JSON.stringify({state:'rejected',preferences:{essential:true,'experience-preferences':false},updatedAt:new Date().toISOString()}));sessionStorage.setItem('artanrecords-studio-auth',JSON.stringify(value));},session);await page.goto('/settings/');await expect(page).toHaveURL(/\/invitation\/$/);await expect(page.locator('[data-platform-layout],#studio-workspace-navigation')).toHaveCount(0);expect(requests.filter(path=>path.startsWith('/rest/v1/'))).toEqual([]);
});
test('expired or mismatched invitation never requests a verification email',async({page})=>{
 const requests=await backend(page);await page.route('**/rest/v1/rpc/contract_invitation_check',route=>route.fulfill({json:false}));await page.goto('/invitation/#token='+token);await page.getByLabel('Invited email address',{exact:true}).fill('wrong@example.test');await page.getByRole('button',{name:'Send verification code',exact:true}).click();await expect(page.locator('[data-invitation-status]')).toContainText('unavailable');expect(requests).not.toContain('/auth/v1/otp');await expect(page.locator('[data-invitation-private]')).toBeHidden();
});
test('incorrect OTP never claims an invitation or loads legal records',async({page})=>{
 const requests=await backend(page);await page.route('**/auth/v1/verify',route=>route.fulfill({status:403,json:{message:'Invalid verification code'}}));await page.goto('/invitation/#token='+token);await page.getByLabel('Invited email address',{exact:true}).fill(user.email);await page.getByRole('button',{name:'Send verification code',exact:true}).click();await page.getByLabel('Email verification code',{exact:true}).fill('000000');await page.getByRole('button',{name:'Verify email',exact:true}).click();await expect(page.locator('[data-invitation-status]')).toContainText('could not be completed');expect(requests).not.toContain('/rest/v1/rpc/contract_claim_invitation');await expect(page.locator('[data-invitation-private]')).toBeHidden();
});
test('verified invitation uses the shared focused signer and submits through its scoped signature endpoint',async({page})=>{
 const requests=await backend(page);let state='offered',signature=null;
 const details={recipient_type:'individual',legal_name:'Fictional Recipient',artist_name:'Fictional Artist',address_line1:'Example address',city:'Example City',postal_code:'00000',country_code:'HR'};
 await page.route('**/rest/v1/rpc/contract_invitation_context',route=>route.fulfill({json:{request_id:requestId,version_id:requestId,status:'approved',rehearsal:true}}));
 await page.route('**/rest/v1/studio_agreement_intake_requests*',route=>route.fulfill({json:[{id:requestId,status:'approved',rehearsal:true,current_version_id:requestId,created_at:'2026-11-03T00:00:00Z',artist_message:'NON-BINDING REHEARSAL'}]}));
 await page.route('**/rest/v1/studio_agreement_intake_versions*',route=>route.fulfill({json:{details,reply_email:user.email}}));
 await page.route('**/rest/v1/studio_agreement_envelopes*',route=>route.fulfill({json:[{id:requestId,version_id:requestId,intake_version_id:requestId,status:state,rehearsal:true,created_at:'2026-11-03T00:00:00Z'}]}));
 await page.route('**/rest/v1/studio_agreement_versions*',route=>route.fulfill({json:{id:requestId,version_number:1,terms_digest:'a'.repeat(64),terms:{kind:'non_binding_partnership_rehearsal',title:'Fictional invitation agreement',notice:'NON-BINDING REHEARSAL',body:'1. Parties\nFictional document. No legal effect.',section_titles:['1. Parties']}}}));
 for(const table of ['studio_agreement_signatures','studio_agreement_events'])await page.route('**/rest/v1/'+table+'*',route=>route.fulfill({json:[]}));
 await page.route('**/rest/v1/rpc/contract_record_signature',route=>{signature=route.request().postDataJSON();state='artist_signed';return route.fulfill({json:requestId});});
 await page.goto('/invitation/#token='+token);await page.getByLabel('Invited email address',{exact:true}).fill(user.email);await page.getByRole('button',{name:'Send verification code',exact:true}).click();await page.getByLabel('Email verification code',{exact:true}).fill('123456');await page.getByRole('button',{name:'Verify email',exact:true}).click();await page.getByRole('tab',{name:'Read & sign',exact:true}).click();await page.getByRole('button',{name:'Open document',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Fictional invitation agreement',exact:true});await expect(dialog).toBeVisible();await expect(dialog.locator('[name=signer]')).toHaveValue('Fictional Recipient');await expect(dialog.locator('[name=signer]')).toHaveAttribute('readonly','');await page.screenshot({path:test.info().outputPath('restricted-signing-preview.png')});await dialog.locator('[name=initial-1]').fill('FR');await dialog.getByRole('button',{name:'Add signature',exact:true}).click();await dialog.getByRole('radio',{name:'Type',exact:true}).check();await dialog.getByLabel('Type your signature',{exact:true}).fill('SAMPLE ONLY');await dialog.getByRole('button',{name:'Use signature',exact:true}).click();await dialog.locator('[name=consent]').check();await dialog.getByRole('button',{name:'Record signature',exact:true}).click();await expect(page.locator('[data-signing-rehearsal] summary').first()).toContainText('Waiting for label signature');expect(signature).toMatchObject({invitation:invitationId,envelope:requestId,expected_digest:'a'.repeat(64),signer_name:'Fictional Recipient',initials:{1:'FR'},acknowledge_non_binding:true});expect(requests.some(path=>/studio_profiles|studio_artist_applications|studio_release|studio_subscription/.test(path))).toBe(false);
});
