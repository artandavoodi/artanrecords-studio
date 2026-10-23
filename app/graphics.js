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
 save.disabled=true;let owner,pending=null,previewUrl='';
 const show=blob=>{if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);preview.src=previewUrl;preview.hidden=false;};
 const append=color=>{
  const row=document.createElement('label');row.className='studio-color-field';
  const picker=document.createElement('input');picker.type='color';picker.value=color;picker.setAttribute('aria-label','Choose artist colour');
  const hex=document.createElement('input');hex.type='text';hex.value=color;hex.pattern='#[0-9a-fA-F]{6}';hex.maxLength=7;hex.required=true;hex.setAttribute('aria-label','Artist colour hex code');
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remove colour';remove.onclick=()=>{row.remove();add.disabled=fields.children.length>=config.maxColors;};
  picker.oninput=()=>{hex.value=picker.value;};hex.oninput=()=>{if(/^#[0-9a-f]{6}$/i.test(hex.value))picker.value=hex.value;};row.append(picker,hex,remove);fields.append(row);add.disabled=fields.children.length>=config.maxColors;
 };
 add.onclick=()=>{if(fields.children.length<config.maxColors)append('#000000');};
 try{
  if(!client||(owner=await resolveUser(client))==null)throw Error('Sign in to manage artist graphics.');
  const result=await client.from('studio_artist_graphics').select('palette,logo_public,palette_public').eq('account_id',owner.id).maybeSingle();if(result.error)throw Error('Artist graphics are not available yet. No changes have been saved.');
  for(const color of result.data?.palette||[])append(color);
  form.elements.share_logo.checked=result.data?.logo_public===true;form.elements.share_palette.checked=result.data?.palette_public===true;
  save.disabled=false;
  const logo=await client.storage.from('studio-logos').download(owner.id+'/logo');if(!logo.error)show(logo.data);
 }catch(error){status.textContent=error.message;return;}
 form.elements.logo.onchange=async()=>{save.disabled=true;pending=null;try{const file=form.elements.logo.files[0];if(file){pending=await exportLogo(file);show(pending.display);}status.textContent='';}catch(error){status.textContent=error.message;form.elements.logo.value='';}finally{save.disabled=false;}};
 form.onsubmit=async event=>{
  event.preventDefault();save.disabled=true;
  try{
   const current=await resolveUser(client);if(current?.id!==owner.id)throw Error('Your session changed. Refresh before saving.');
   if(pending){for(const [path,blob] of [['source',pending.original],['logo',pending.display]]){const result=await client.storage.from('studio-logos').upload(owner.id+'/'+path,blob,{upsert:true,contentType:blob.type});if(result.error)throw Error('Your logo could not be uploaded. Try again.');}}
   const colors=[...fields.querySelectorAll('input[type=text]')].map(input=>input.value.toUpperCase());
   const result=await client.rpc('studio_save_artist_graphics',{colors,share_logo:form.elements.share_logo.checked,share_palette:form.elements.share_palette.checked});if(result.error)throw Error('Graphics could not be saved. Try again.');
   pending=null;status.textContent='';showSaveConfirmation('Graphics saved.');
  }catch(error){status.textContent=error.message;}finally{save.disabled=false;}
 };
}
