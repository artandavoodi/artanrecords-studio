import config from '../content/release-artwork.json';
import {releaseArtworkValues} from './metadata-values.js';

export async function inspectReleaseArtwork(file){
 if(!file||file.size>config.maxBytes)throw Error('Choose a JPEG or PNG up to 10 MB.');
 const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
 const png=[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
 const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 const type=png?'image/png':jpeg?'image/jpeg':null;
 if(!type||(file.type&&file.type!==type))throw Error('Choose a valid JPEG or PNG image.');
 let image;try{image=await createImageBitmap(file);}catch{throw Error('This image could not be opened.');}
 const width=image.width,height=image.height;image.close();
 if(width!==height)throw Error('Cover artwork must be square. Export a square image before uploading.');
 if(width<config.minDimension||width>config.maxDimension)throw Error('Use artwork between 1000 and 6000 pixels per side.');
 return {name:file.name.slice(0,200),type,bytes:file.size,width,height};
}

export function bindReleaseArtwork(view,{client,user,resolveUser,onDirty}){
 const root=view.querySelector('[data-release-artwork]'),input=root.querySelector('input[type=file]'),preview=root.querySelector('img[data-cover-preview]'),status=root.querySelector('[data-cover-status]'),empty=root.querySelector('[data-cover-empty]');
 let pending=null,stored=null,uploaded=null,url='',revision=0;
 const display=(blob,info)=>{
  if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);preview.src=url;preview.hidden=false;empty.hidden=true;
  status.textContent=info.name+' · '+info.width+' x '+info.height+' · '+(info.bytes/1048576).toFixed(1)+' MB';
 };
 const clear=()=>{if(url)URL.revokeObjectURL(url);url='';preview.removeAttribute('src');preview.hidden=true;empty.hidden=false;};
 root.querySelector('[data-choose-cover]').onclick=()=>input.click();
 input.onchange=async()=>{
  const version=++revision;root.inert=true;
  try{const file=input.files[0];if(!file)return;const info=await inspectReleaseArtwork(file);if(version!==revision)return;pending={file,info};uploaded=null;display(file,info);onDirty();}
  catch(error){status.textContent=error.message;}finally{input.value='';root.inert=false;}
 };
 return {
  get asset(){return stored;},
  get hasPending(){return Boolean(pending);},
  get busy(){return root.inert;},
  async load(asset){
   const version=++revision;pending=null;uploaded=null;stored=null;clear();status.textContent='No cover artwork added.';
   if(!asset)return;
   try{asset=releaseArtworkValues(asset);}catch{status.textContent='This cover record could not be opened.';return;}
   if(!asset.path.startsWith(user.id+'/')){status.textContent='This cover does not belong to your account.';return;}
   stored=asset;status.textContent='Loading private cover artwork...';
   try{const result=await client.storage.from(config.bucket).download(asset.path);if(result.error)throw result.error;if(version===revision)display(result.data,asset);}
   catch{if(version===revision)status.textContent='The saved cover could not be loaded. Try reopening this draft.';}
  },
  async prepare(draft){
   if(!pending)return stored;
   if(!/^[0-9a-f-]{36}$/.test(draft))throw Error('Save a release draft before adding its artwork.');
   if((await resolveUser(client))?.id!==user.id)throw Error('Your session changed. Sign in again.');
   if(uploaded?.draft===draft)return uploaded.asset;
   const path=user.id+'/'+draft+'/'+crypto.randomUUID()+(pending.info.type==='image/png'?'.png':'.jpg');
   const result=await client.storage.from(config.bucket).upload(path,pending.file,{contentType:pending.info.type,upsert:false});
   if(result.error)throw Error('The cover upload failed. Your text draft is saved; choose Save again to retry the artwork.');
   const asset={...pending.info,path};uploaded={draft,asset};return asset;
  },
  commit(asset){stored=asset;pending=null;uploaded=null;}
 };
}
