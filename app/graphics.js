import config from '../content/graphics.json' with {type:'json'};
import {showSaveConfirmation} from './neuroartan/assets/js/core/02-systems/toast.js';

export async function exportLogo(file){
 if(file.size>config.maxBytes)throw Error('Choose a logo up to 2 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const png=[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
 let source=file;
 if(!png){
  const doc=new DOMParser().parseFromString(await file.text(),'image/svg+xml');
  const allowed=new Set(['svg','g','path','circle','ellipse','rect','line','polyline','polygon','defs','linearGradient','radialGradient','stop','clipPath','title','desc']);
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('Choose a valid transparent PNG or SVG.');
  for(const element of doc.querySelectorAll('*')){
   if(!allowed.has(element.localName)||element.namespaceURI!=='http://www.w3.org/2000/svg')throw Error('Use a self-contained SVG with vector shapes only.');
   for(const attribute of element.attributes){
    if(/^on/i.test(attribute.name)||/href/i.test(attribute.name)||attribute.name==='style'||/url\s*\((?!\s*#[\w-]+\s*\))/i.test(attribute.value))throw Error('Remove scripts, external references and embedded styles from the SVG.');
   }
  }
  source=new Blob([new XMLSerializer().serializeToString(doc.documentElement)],{type:'image/svg+xml'});
 }
 const url=URL.createObjectURL(source);
 try{
  const image=new Image();image.src=url;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight||Math.max(image.naturalWidth,image.naturalHeight)>config.maxDimension)throw Error('Use a logo no larger than 8192 pixels per side.');
  const scale=Math.min(1,config.exportDimension/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  let transparent=false,visible=false;for(let index=3;index<pixels.length;index+=4){transparent ||=pixels[index]<255;visible ||=pixels[index]>0;}
  if(!transparent||!visible)throw Error('Use a visible logo with a transparent background.');
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('The logo could not be exported.');
  return {original:new Blob([bytes],{type:png?'image/png':'image/svg+xml'}),display:blob};
 }finally{URL.revokeObjectURL(url);}
}

export async function bindGraphics({client,resolveUser}){
 const form=document.querySelector('[data-graphics-form]');if(!form)return;
 const status=form.querySelector('[data-graphics-status]'),save=form.querySelector('[type=submit]'),fields=form.querySelector('[data-color-fields]'),add=form.querySelector('[data-add-color]'),preview=form.querySelector('[data-logo-preview]');
 save.disabled=true;let owner,pending=null,previewUrl='',candidate=null,candidateUrl='',selection=0,selecting=false;
 const choose=form.querySelector('[data-choose-logo]'),logoDialog=form.querySelector('[data-logo-dialog]'),confirmLogo=logoDialog.querySelector('[data-confirm-logo]'),logoError=logoDialog.querySelector('[data-logo-error]'),comparison=logoDialog.querySelector('[data-logo-comparison]'),logoLoading=logoDialog.querySelector('[data-logo-loading]'),candidateInfo=logoDialog.querySelector('[data-logo-candidate-info]');
 const show=blob=>{if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);preview.src=previewUrl;preview.hidden=false;form.querySelector('[data-logo-empty]').hidden=true;};
 const clearCandidate=()=>{candidate=null;if(candidateUrl)URL.revokeObjectURL(candidateUrl);candidateUrl='';logoDialog.querySelectorAll('[data-logo-candidate]').forEach(image=>image.removeAttribute('src'));comparison.hidden=true;confirmLogo.disabled=true;};
 choose.onclick=()=>form.elements.logo.click();
 logoDialog.querySelector('[data-replace-logo]').onclick=()=>form.elements.logo.click();
 logoDialog.querySelector('[data-close-logo]').onclick=()=>logoDialog.close();
 window.NeuroartanCloseButtons?.initCloseButtonPrimitive(logoDialog);
 logoDialog.addEventListener('close',()=>{if(logoDialog.open)return;selection++;selecting=false;clearCandidate();logoLoading.hidden=true;save.disabled=!owner;choose.focus({preventScroll:true});});
 confirmLogo.onclick=()=>{if(!candidate)return;pending=candidate.asset;show(pending.display);form.querySelector('[data-logo-file]').textContent=candidate.name;form.querySelector('[data-logo-status]').textContent='Logo selected. Choose Save to keep this change.';status.textContent='';logoDialog.close();};
 form.elements.logo.onchange=async()=>{
  const file=form.elements.logo.files[0];form.elements.logo.value='';if(!file||!owner)return;
  const version=++selection;clearCandidate();selecting=true;save.disabled=true;logoError.textContent='';candidateInfo.textContent=file.name;logoLoading.hidden=false;if(!logoDialog.open)logoDialog.showModal();
  try{
   const asset=await exportLogo(file);if(version!==selection)return;
   candidateUrl=URL.createObjectURL(asset.display);const images=[...logoDialog.querySelectorAll('[data-logo-candidate]')];for(const image of images)image.src=candidateUrl;await Promise.all(images.map(image=>image.decode()));if(version!==selection)return;
   candidate={asset,name:file.name};candidateInfo.textContent=file.name+' · '+images[0].naturalWidth+' × '+images[0].naturalHeight+' · Transparent PNG preview';comparison.hidden=false;confirmLogo.disabled=false;
  }catch(error){if(version===selection){clearCandidate();logoError.textContent=error.message;}}
  finally{if(version===selection){selecting=false;logoLoading.hidden=true;save.disabled=false;}}
 };
 const swatches=form.querySelector('[data-colour-swatches]');
 const syncSwatches=()=>{
  const selected=[...fields.querySelectorAll('input[type=text]')].filter(input=>/^#[0-9a-f]{6}$/i.test(input.value));
  const options=selected.length?selected.map(input=>({value:input.value.toUpperCase(),label:'Edit '+input.value.toUpperCase(),input})):config.defaultColors;
  swatches.replaceChildren(...options.map(option=>{const button=document.createElement('button');button.type='button';button.dataset.colourSwatch=option.value;button.style.backgroundColor=option.value;button.setAttribute('aria-label',option.label);button.title=option.value;button.onclick=()=>{if(!option.input){append(option.value);return;}colourDialog.showModal();option.input.focus();};return button;}));
 };
 const append=color=>{
  const row=document.createElement('div');row.className='studio-color-field';row.setAttribute('role','group');row.setAttribute('aria-label','Artist colour');
  const picker=document.createElement('input');picker.type='color';picker.value=color;picker.setAttribute('aria-label','Choose artist colour');
  const hex=document.createElement('input');hex.type='text';hex.className='ui-field';hex.value=color;hex.pattern='#[0-9a-fA-F]{6}';hex.maxLength=7;hex.required=true;hex.setAttribute('aria-label','Artist colour hex code');
  const remove=document.createElement('button');remove.type='button';remove.className='studio-color-remove';remove.setAttribute('aria-label','Remove colour');remove.title='Remove colour';const image=document.createElement('img');image.src='/app/icons/close.svg';image.alt='';image.className='studio-icon';remove.append(image);remove.onclick=()=>{row.remove();add.disabled=fields.children.length>=config.maxColors;syncSwatches();};
  picker.oninput=()=>{hex.value=picker.value;syncSwatches();};hex.oninput=()=>{if(/^#[0-9a-f]{6}$/i.test(hex.value))picker.value=hex.value;syncSwatches();};row.append(picker,hex,remove);fields.append(row);add.disabled=fields.children.length>=config.maxColors;syncSwatches();
 };
 add.onclick=()=>{if(fields.children.length<config.maxColors)append('#000000');};
 const colourDialog=form.querySelector('#artist-colour-picker');
 window.NeuroartanCloseButtons?.initCloseButtonPrimitive(colourDialog);
 colourDialog.addEventListener('close',()=>form.querySelector('[data-open-colour]').focus({preventScroll:true}));
 form.querySelector('[data-close-colour]').onclick=()=>colourDialog.close();
 form.querySelector('[data-open-colour]').addEventListener('click',()=>{if(!fields.children.length)append('#000000');colourDialog.showModal();});
 syncSwatches();
 try{
  if(!client||(owner=await resolveUser(client))==null)throw Error('Sign in to manage artist graphics.');
  const result=await client.from('studio_artist_graphics').select('palette,logo_public,palette_public').eq('account_id',owner.id).maybeSingle();if(result.error)throw Error('Artist graphics are not available yet. No changes have been saved.');
  for(const color of result.data?.palette||[])append(color);
  form.elements.share_logo.checked=result.data?.logo_public===true;form.elements.share_palette.checked=result.data?.palette_public===true;
  const logo=await client.storage.from('studio-logos').download(owner.id+'/logo');if(!logo.error){show(logo.data);form.querySelector('[data-logo-status]').textContent=result.data?.logo_public?'Public display selected':'Saved privately';}
  save.disabled=false;choose.disabled=false;
 }catch(error){status.textContent=error.message;return;}
 form.onsubmit=async event=>{
  event.preventDefault();if(selecting||logoDialog.open)return;save.disabled=true;
  try{
   const current=await resolveUser(client);if(current?.id!==owner.id)throw Error('Your session changed. Refresh before saving.');
   if(pending){for(const [path,blob] of [['source',pending.original],['logo',pending.display]]){const result=await client.storage.from('studio-logos').upload(owner.id+'/'+path,blob,{upsert:true,contentType:blob.type});if(result.error)throw Error('Your logo could not be uploaded. Try again.');}}
   const colors=[...fields.querySelectorAll('input[type=text]')].map(input=>input.value.toUpperCase());
   const result=await client.rpc('studio_save_artist_graphics',{colors,share_logo:form.elements.share_logo.checked,share_palette:form.elements.share_palette.checked});if(result.error)throw Error('Graphics could not be saved. Try again.');
   pending=null;status.textContent='';showSaveConfirmation('Graphics saved.');
  }catch(error){status.textContent=error.message;}finally{save.disabled=false;}
 };
}
