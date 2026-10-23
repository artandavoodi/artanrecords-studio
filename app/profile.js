import {googlePhoto} from './metadata-values.js';
import {showSaveConfirmation} from './neuroartan/assets/js/core/02-systems/toast.js';
import {registerProfileMediaEditorTarget,openProfileMediaEditor} from './neuroartan/assets/js/layers/website/ui/profile-media-editor.js';
export async function bindProfile({client,config,resolveUser,profileValues,validPhoto}){
  const view=document.querySelector('[data-profile-view]');if(!view)return;
  const status=view.querySelector('[data-profile-status]'),form=view.querySelector('form'),guest=view.querySelector('[data-profile-guest]');
  form.elements.phone.readOnly=false;
  if(!client){status.textContent=config.unavailable;guest.hidden=false;return;}
  let user;
  const mediaControls=view.querySelector('[data-media-visibility]');let mediaReady=false;
  const saveMediaVisibility=async()=>{
    if(!mediaReady)throw Error('Image visibility could not be checked. Refresh before changing public images.');
    const current=await resolveUser(client);if(current?.id!==user.id)throw Error('Your session changed.');
    const result=await client.rpc('studio_set_artist_media_visibility',{portrait:form.querySelector('[data-public-media="avatar"]').checked,header:form.querySelector('[data-public-media="cover"]').checked});
    if(result.error)throw Error('Your image visibility could not be saved. Try again.');
  };
  try{
    user=await resolveUser(client);if(!user){status.textContent='';guest.hidden=false;return;}
    const result=await client.from('studio_profiles').select('display_name,artist_name,biography,website,contact_phone').eq('id',user.id).maybeSingle();if(result.error)throw result.error;
    for(const [name,value] of Object.entries(result.data||{}))if(form.elements[name])form.elements[name].value=value||'';
    view.querySelector('[data-profile-email]').value=user.email||'';
    view.querySelector('[data-verification]').textContent=user.email_confirmed_at?'Email verified':'Email confirmation required';
    form.elements.phone.value=result.data?.contact_phone||user.phone||'';form.hidden=false;status.textContent='';
  }catch{status.textContent='Your profile could not be loaded. Refresh to try again.';return;}
  try{const result=await client.from('studio_artist_media').select('portrait_public,header_public').eq('account_id',user.id).maybeSingle();if(result.error)throw result.error;form.querySelector('[data-public-media="avatar"]').checked=result.data?.portrait_public===true;form.querySelector('[data-public-media="cover"]').checked=result.data?.header_public===true;mediaReady=true;mediaControls.disabled=false;}catch{status.textContent='Your private profile is available, but public image settings could not be loaded.';}
  // Recheck record existence when saving so empty profiles and other tabs are handled correctly.
  if(!form.elements.display_name.value)form.elements.display_name.value=user.user_metadata?.full_name||user.user_metadata?.name||'';
  const avatar=view.querySelector('[data-avatar]'),placeholder=view.querySelector('[data-avatar-placeholder]');
  const mediaRevision={avatar:0,cover:0};
  const showPhoto=url=>{if(!url)return;avatar.onload=()=>{avatar.hidden=false;placeholder.hidden=true;};avatar.onerror=()=>{avatar.hidden=true;placeholder.hidden=false;};avatar.src=url;};
  showPhoto(googlePhoto(user));
  void (async()=>{try{
    const photos=await client.storage.from('studio-avatars').list(user.id,{limit:10,search:'avatar'});
    if(photos.error)throw photos.error;
    if(photos.data.some(photo=>photo.name==='avatar')){
      const signed=await client.storage.from('studio-avatars').createSignedUrl(user.id+'/avatar',300);
      if(signed.error)throw signed.error;
      if(mediaRevision.avatar===0)showPhoto(signed.data.signedUrl);
    }
  }catch{ /* Keep the Google photograph or the neutral account placeholder. */ }})();
  form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;try{const values=profileValues(new FormData(form));const current=await resolveUser(client);if(current?.id!==user.id)throw Error('Your session changed.');const existing=await client.from('studio_profiles').select('id').eq('id',current.id).maybeSingle();if(existing.error)throw existing.error;const result=existing.data?await client.from('studio_profiles').update(values).eq('id',current.id):await client.from('studio_profiles').insert({id:current.id,...values});if(result.error)throw result.error;if(mediaReady)await saveMediaVisibility();status.textContent='';showSaveConfirmation('Profile saved.');}catch(error){status.textContent=error.message?.includes('HTTPS')?error.message:'Profile could not be saved. Please try again.';}finally{button.disabled=false;}});
  const header=view.querySelector('[data-header-image]');
  void (async()=>{try{const list=await client.storage.from('studio-headers').list(user.id,{search:'header',limit:10});if(!list.error&&list.data.some(file=>file.name==='header')){const signed=await client.storage.from('studio-headers').createSignedUrl(user.id+'/header',300);if(!signed.error&&mediaRevision.cover===0){header.src=signed.data.signedUrl;header.hidden=false;}}}catch{/* The empty header remains usable when storage is unavailable. */}})();
  registerProfileMediaEditorTarget('studio',{
    getCurrentImageUrl:({kind})=>(kind==='cover'?header:avatar).getAttribute('src')||'',
    async save({file,kind}){
      if(!validPhoto(file))throw Error('Edited image exceeds the upload limit.');
      const current=await resolveUser(client);if(current?.id!==user.id)throw Error('Session changed');
      const cover=kind==='cover',bucket=cover?'studio-headers':'studio-avatars',path=current.id+'/'+(cover?'header':'avatar');
      mediaRevision[cover?'cover':'avatar']++;
      const uploaded=await client.storage.from(bucket).upload(path,file,{upsert:true,contentType:file.type});if(uploaded.error)throw uploaded.error;
      if(mediaReady)await saveMediaVisibility();
      const signed=await client.storage.from(bucket).createSignedUrl(path,300);if(signed.error)throw signed.error;
      if(cover){header.src=signed.data.signedUrl;header.hidden=false;}else showPhoto(signed.data.signedUrl);
      const shared=mediaReady&&form.querySelector('[data-public-media="'+(cover?'cover':'avatar')+'"]').checked;
      status.textContent=(cover?'Header image':'Profile photograph')+(shared?' saved with your public-image selection.':' saved privately.');
      showSaveConfirmation('Image saved.');
    }
  });
  view.querySelectorAll('[data-open-profile-media]').forEach(button=>button.addEventListener('click',()=>openProfileMediaEditor({target:'studio',kind:button.dataset.openProfileMedia})));
  avatar.addEventListener('click',()=>openProfileMediaEditor({target:'studio',kind:'avatar'}));
  for(const [name,filename] of [['photo','avatar'],['header_photo','header']])form.elements[name].addEventListener('change',async()=>{
    const input=form.elements[name],file=input.files[0];if(!file)return;
    if(!validPhoto(file)){status.textContent='Choose a JPEG, PNG or WebP image up to 2 MB.';input.value='';return;}
    input.disabled=true;
    try{const decoded=await createImageBitmap(file);const tooLarge=decoded.width>8192||decoded.height>8192;decoded.close();if(tooLarge)throw Error('Image too large');openProfileMediaEditor({target:'studio',kind:filename==='header'?'cover':'avatar',file});}catch{status.textContent='This image could not be opened. Use a valid image no larger than 8192 pixels per side.';}finally{input.disabled=false;input.value='';}
  });
  view.querySelector('[data-verify-phone]').addEventListener('click',()=>{view.querySelector('[data-phone-status]').textContent=config.phoneNotice;});
}
