export async function bindProfile({client,config,resolveUser,profileValues,validPhoto}){
  const view=document.querySelector('[data-profile-view]');if(!view)return;
  const status=view.querySelector('[data-profile-status]'),form=view.querySelector('form'),guest=view.querySelector('[data-profile-guest]');
  form.elements.phone.readOnly=true;
  if(!client){status.textContent=config.unavailable;guest.hidden=false;return;}
  let user;
  try{user=await resolveUser(client);if(!user){status.textContent='Sign in to manage your profile.';guest.hidden=false;return;}const result=await client.from('studio_profiles').select('display_name,artist_name,biography,website').eq('id',user.id).maybeSingle();if(result.error)throw result.error;for(const [name,value] of Object.entries(result.data||{}))if(form.elements[name])form.elements[name].value=value||'';view.querySelector('[data-profile-email]').value=user.email||'';view.querySelector('[data-verification]').textContent=user.email_confirmed_at?'Email verified':'Email confirmation required';form.elements.phone.value=user.phone||'';form.hidden=false;status.textContent='Your profile is private unless separately approved for publication.';}catch{status.textContent='Your profile could not be loaded. Refresh to try again.';return;}
  // Recheck record existence when saving so empty profiles and other tabs are handled correctly.
  if(!form.elements.display_name.value)form.elements.display_name.value=user.user_metadata?.full_name||user.user_metadata?.name||'';
  try{
    const photos=await client.storage.from('studio-avatars').list(user.id,{limit:10,search:'avatar'});
    if(photos.error)throw photos.error;
    if(photos.data.some(photo=>photo.name==='avatar')){
      const signed=await client.storage.from('studio-avatars').createSignedUrl(user.id+'/avatar',300);
      if(signed.error)throw signed.error;
      const avatar=view.querySelector('[data-avatar]');avatar.src=signed.data.signedUrl;avatar.hidden=false;
    }
  }catch{view.querySelector('[data-avatar]').hidden=true;}
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;try{const values=profileValues(new FormData(form));const current=await resolveUser(client);if(current?.id!==user.id)throw Error('Your session changed.');const existing=await client.from('studio_profiles').select('id').eq('id',current.id).maybeSingle();if(existing.error)throw existing.error;const result=existing.data?await client.from('studio_profiles').update(values).eq('id',current.id):await client.from('studio_profiles').insert({id:current.id,...values});if(result.error)throw result.error;status.textContent='Profile saved.';}catch(error){status.textContent=error.message?.includes('HTTPS')?error.message:'Profile could not be saved. Please try again.';}finally{button.disabled=false;}});
  form.elements.photo.addEventListener('change',async()=>{const file=form.elements.photo.files[0];if(!file)return;if(!validPhoto(file)){status.textContent='Choose a JPEG, PNG or WebP image up to 2 MB.';form.elements.photo.value='';return;}try{const decoded=await createImageBitmap(file);const tooLarge=decoded.width>8192||decoded.height>8192;decoded.close();if(tooLarge)throw Error('Image too large');const current=await resolveUser(client);if(current?.id!==user.id)throw Error('Session changed');const path=current.id+'/avatar';const uploaded=await client.storage.from('studio-avatars').upload(path,file,{upsert:true,contentType:file.type});if(uploaded.error)throw uploaded.error;const signed=await client.storage.from('studio-avatars').createSignedUrl(path,300);if(signed.error)throw signed.error;const avatar=view.querySelector('[data-avatar]');avatar.src=signed.data.signedUrl;avatar.hidden=false;status.textContent='Profile photograph saved privately.';}catch{status.textContent='Your photograph could not be saved. Please try again.';}});
  view.querySelector('[data-verify-phone]').addEventListener('click',()=>{view.querySelector('[data-phone-status]').textContent=config.phoneNotice;});
  view.querySelector('[data-reset-password]').addEventListener('click',async()=>{const result=await client.auth.resetPasswordForEmail(user.email,{redirectTo:location.origin+'/account/?flow=recovery'});status.textContent=result.error?'Reset email could not be sent. Please try again.':'Check your email for a password reset link.';});
}
