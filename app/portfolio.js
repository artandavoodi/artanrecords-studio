import schema from '../content/portfolio.json' with {type:'json'};
import {showArtistSaveConfirmation} from './artist-save.js';
export function portfolioValues(form){
 const value={};
 for(const field of schema.fields){const text=String(form.get(field.name)||'').trim();if(text.length>field.max||field.required&&!text)throw Error('Check '+field.label.toLowerCase()+'.');value[field.name]=field.name==='tags'?text.split(',').map(tag=>tag.trim()).filter(Boolean):text;}
 if(value.tags.length>20||value.tags.some(tag=>tag.length>80))throw Error('Use up to 20 tags, each up to 80 characters.');
 if(value.year&&!/^\d{4}$/.test(value.year))throw Error('Use a four-digit year.');
 if(value.project_url){const url=new URL(value.project_url);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS project address.');}
 value.rights_confirmed=form.get('rights_confirmed')==='on';return value;
}
async function exportImage(file){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>schema.imageLimit||file.size===0)throw Error('Choose a PNG, JPEG or WebP up to 5 MB.');
 const bitmap=await createImageBitmap(file);
 try{if(bitmap.width*bitmap.height>40000000)throw Error('Choose an image below 40 megapixels.');const scale=Math.min(1,schema.imageDimension/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,file.type==='image/jpeg'?'image/jpeg':'image/png',0.9));if(!blob||blob.size>schema.imageLimit)throw Error('The processed image exceeds 5 MB. Choose a smaller image.');return blob;}finally{bitmap.close();}
}
export async function bindPortfolio(context){for(const root of document.querySelectorAll('[data-artist-portfolio]'))await bindPortfolioRoot(root,context);}
async function bindPortfolioRoot(root,{client,resolveUser}){
 const kind=root.dataset.artistPortfolio,status=root.querySelector('[data-portfolio-status]'),list=root.querySelector('[data-portfolio-list]'),dialog=root.querySelector('dialog'),form=dialog.querySelector('form'),error=form.querySelector('[data-portfolio-error]'),image=form.querySelector('[data-portfolio-image]');
 if(!client)return;const owner=await resolveUser(client).catch(()=>null);if(!owner)return;
 let rows=[],active=null,preview;
 const identity=async()=>{if((await resolveUser(client))?.id!==owner.id)throw Error('Your session changed. Sign in again.');};
 const refresh=async()=>{
  const result=await client.from('studio_artist_portfolio').select('id,kind,details,status,updated_at').eq('account_id',owner.id).eq('kind',kind).neq('status','archived').order('updated_at',{ascending:false});if(result.error)throw Error('Your portfolio could not be loaded. Try again.');await identity();rows=result.data||[];list.replaceChildren();
  for(const row of rows){const article=document.createElement('article'),heading=document.createElement('h2'),summary=document.createElement('p'),edit=document.createElement('button');heading.textContent=row.details.title;summary.textContent=[row.details.collection,row.details.year,row.status].filter(Boolean).join(' · ');edit.type='button';edit.className='ui-button';const icon=document.createElement('img');icon.src='/app/icons/edit.svg';icon.className='studio-icon';icon.alt='';edit.append(icon,document.createTextNode('Edit'));edit.onclick=()=>open(row);article.append(heading,summary,edit);list.append(article);}
  status.textContent=rows.length?rows.length+' '+(kind==='gallery'?'gallery items':'projects')+'.':'No items yet. Add your first '+schema.types[kind].singular+'.';
 };
 const open=async row=>{
  active=row||null;form.reset();error.textContent='';if(preview){URL.revokeObjectURL(preview);preview=null;}image.hidden=true;image.removeAttribute('src');
  for(const field of schema.fields)form.elements[field.name].value=field.name==='tags'?(row?.details.tags||[]).join(', '):row?.details[field.name]||'';
  form.elements.rights_confirmed.checked=row?.details.rights_confirmed===true;dialog.querySelector('[data-portfolio-title]').textContent=row?'Edit '+schema.types[kind].singular:'New '+schema.types[kind].singular;dialog.showModal();window.NeuroartanCloseButtons?.initCloseButtonPrimitive(dialog);
  if(row?.details.image_path){const result=await client.storage.from('studio-portfolio').createSignedUrl(row.details.image_path,300);if(!result.error&&active?.id===row.id){image.src=result.data.signedUrl;image.hidden=false;}}
 };
 root.querySelector('[data-portfolio-close]').onclick=()=>dialog.close();
 form.elements.image.onchange=async()=>{error.textContent='';try{const file=form.elements.image.files[0];if(!file)return;const blob=await exportImage(file);if(preview)URL.revokeObjectURL(preview);preview=URL.createObjectURL(blob);image.src=preview;image.hidden=false;}catch(problem){form.elements.image.value='';error.textContent=problem.message;}};
 try{await refresh();root.querySelector('[data-portfolio-add]').disabled=false;}catch(problem){status.textContent=problem.message;return;}
 root.querySelector('[data-portfolio-add]').onclick=()=>open(null);
 form.onsubmit=async event=>{
  event.preventDefault();const buttons=[...form.querySelectorAll('[type=submit]')];buttons.forEach(button=>button.disabled=true);
  try{
   await identity();const value=portfolioValues(new FormData(form)),publication=event.submitter?.name==='publish'?'published':'draft';
   if(active?.details.image_path)value.image_path=active.details.image_path;
   const file=form.elements.image.files[0];if(publication==='published'&&(file||kind==='gallery')&&(!value.rights_confirmed||!value.image_alt))throw Error('Add an image description and confirm image rights before publishing.');
   let id=active?.id||null;
   if(file){const blob=await exportImage(file);const draft=await client.rpc('studio_save_portfolio',{entry_id:id,entry_kind:kind,value,publication:'draft'});if(draft.error)throw Error('The private image draft could not be created.');id=draft.data;active={id,details:value};const path=owner.id+'/'+id+'/image';await identity();const upload=await client.storage.from('studio-portfolio').upload(path,blob,{contentType:blob.type,upsert:true,cacheControl:'0'});if(upload.error)throw Error('Image upload failed. Your draft is safe; choose the image again to retry.');value.image_path=path;}
   const result=await client.rpc('studio_save_portfolio',{entry_id:id,entry_kind:kind,value,publication});if(result.error)throw Error(publication==='published'?'Publication failed. Check your approved profile, image and sharing choices.':'Your draft could not be saved.');
   active={id:result.data,details:value};await refresh();dialog.close();showArtistSaveConfirmation(publication==='published'?'Portfolio item published.':'Portfolio draft saved.');
  }catch(problem){error.textContent=problem.message;}finally{buttons.forEach(button=>button.disabled=false);}
 };
}
