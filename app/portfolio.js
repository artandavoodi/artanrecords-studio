import schema from '../content/portfolio.json' with {type:'json'};
import {showArtistSaveConfirmation} from './artist-save.js';
import {syncCharacterCounter} from './neuroartan/assets/js/core/02-systems/character-counter.js';
import {bindGalleryCollections} from './gallery-collections.js';
export function portfolioVideoUrl(value){
 const url=new URL(value),host=url.hostname.toLowerCase();
 const youtube=(host==='youtube.com'||host==='www.youtube.com'||host==='m.youtube.com')&&((url.pathname==='/watch'&&/^[\w-]{11}$/.test(url.searchParams.get('v')||''))||/^\/(shorts|embed)\/[\w-]{11}\/?$/.test(url.pathname));
 const short=host==='youtu.be'&&/^\/[\w-]{11}\/?$/.test(url.pathname);
 const vimeo=(host==='vimeo.com'||host==='www.vimeo.com')&&/^\/\d+(?:\/[a-zA-Z0-9]+)?\/?$/.test(url.pathname)||host==='player.vimeo.com'&&/^\/video\/\d+\/?$/.test(url.pathname);
 if(url.protocol!=='https:'||url.username||url.password||url.port||!(youtube||short||vimeo))throw Error('Use an HTTPS YouTube or Vimeo video address.');
 if(youtube||short){const video=short?url.pathname.split('/')[1]:url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.split('/')[2];return 'https://www.youtube.com/watch?v='+video;}
 const parts=url.pathname.split('/').filter(Boolean),video=host==='player.vimeo.com'?parts[1]:parts[0],token=parts[1]&&host!=='player.vimeo.com'?parts[1]:url.searchParams.get('h');
 return 'https://vimeo.com/'+video+(token&&/^[a-zA-Z0-9]+$/.test(token)?'?h='+token:'');
}
async function withImageTimeout(operation){
 let timer;
 try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Image loading timed out. Close and reopen to retry.')),schema.imageLoadTimeoutMs);})]);}
 finally{clearTimeout(timer);}
}
export function portfolioValues(form){
 const value={};
 for(const field of schema.fields){const text=String(form.get(field.name)||'').trim();if(text.length>field.max||field.required&&!text)throw Error('Check '+field.label.toLowerCase()+'.');value[field.name]=field.name==='tags'?text.split(',').map(tag=>tag.trim()).filter(Boolean):text;}
 if(value.tags.length>20||value.tags.some(tag=>tag.length>80))throw Error('Use up to 20 tags, each up to 80 characters.');
 const minimum=schema.fields.find(field=>field.name==='year').min;
 if(value.year&&(!/^\d{4}$/.test(value.year)||Number(value.year)<minimum||Number(value.year)>new Date().getFullYear()))throw Error('Choose a year from '+minimum+' to '+new Date().getFullYear()+'.');
 if(value.project_url){const url=new URL(value.project_url);if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS project address.');}
 if(form.has('media_type')){
  value.media_type=String(form.get('media_type')||'photo');if(!schema.mediaTypes.some(item=>item.id===value.media_type))throw Error('Choose Photograph or Video.');
  const video=String(form.get('video_url')||'').trim();if(video.length>schema.videoUrlMax)throw Error('Check the video address.');
  value.video_url=value.media_type==='video'&&video?portfolioVideoUrl(video):'';
 }
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
 let rows=[],active=null,preview,editRevision=0,renderRevision=0,viewerRevision=0,selection=[],viewerIndex=0,collectionRows=[],collectionManager;
 const viewer=root.querySelector('[data-portfolio-viewer]'),viewerImage=viewer.querySelector('[data-viewer-image]'),viewerStatus=viewer.querySelector('[data-viewer-status]'),strip=viewer.querySelector('[data-viewer-filmstrip]');
 const filename=form.querySelector('[data-portfolio-file-name]'),collection=form.querySelector('[data-portfolio-collection]');
 const description=form.elements.description,limit=schema.fields.find(field=>field.name==='description').max;
 const count=()=>{const {count}=syncCharacterCounter(description,form.querySelector('[data-portfolio-counter]'),limit);form.querySelector('[data-portfolio-count]').textContent=count+' / '+limit+' characters';description.setCustomValidity(count>limit?'Shorten the description to '+limit+' characters.':'');};
 description.addEventListener('input',count);
 form.querySelector('[data-portfolio-clear-tags]').onclick=()=>{form.elements.tags.value='';form.elements.tags.focus();};
 collection.onchange=()=>{if(kind==='gallery'||collection.value)form.elements.collection.value=collection.value;};
 const syncMedia=()=>{if(kind!=='gallery')return;const video=form.elements.media_type.value==='video';form.querySelector('[data-portfolio-video]').hidden=!video;};
 form.elements.media_type?.addEventListener('change',syncMedia);
 for(const button of root.querySelectorAll('[data-gallery-section]'))button.onclick=()=>{const collections=button.dataset.gallerySection==='collections';root.querySelector('[data-gallery-media]').hidden=collections;root.querySelector('[data-gallery-collections]').hidden=!collections;for(const tab of root.querySelectorAll('[data-gallery-section]'))tab.setAttribute('aria-pressed',String(tab===button));};
 const identity=async()=>{if((await resolveUser(client))?.id!==owner.id)throw Error('Your session changed. Sign in again.');};
 // Signed URLs live only in this owner session, never in persisted details or public markup.
 const signed=new Map();
 const imageUrl=async(row,renew=false)=>{
  const path=row.details.image_path;if(!path||!path.startsWith(owner.id+'/'+row.id+'/'))throw Error('No private image available.');
  await identity();const cached=signed.get(path);if(!renew&&cached?.expires>Date.now())return cached.url;
  const result=await client.storage.from('studio-portfolio').createSignedUrl(path,300);await identity();
  if(result.error||!result.data?.signedUrl)throw Error('Image unavailable. Close and reopen to retry.');
  signed.set(path,{url:result.data.signedUrl,expires:Date.now()+240000});return result.data.signedUrl;
 };
 const loadImage=async(node,row,current)=>{
  node.hidden=true;node.removeAttribute('src');node.alt=row.details.image_alt||row.details.title||'';
  for(let attempt=0;attempt<2;attempt++){
   try{
    const url=await withImageTimeout(imageUrl(row,attempt>0));if(!current())return;
    const pending=new Image();
    try{await withImageTimeout(new Promise((resolve,reject)=>{pending.onload=resolve;pending.onerror=()=>reject(Error('Image unavailable. Close and reopen to retry.'));pending.src=url;}));}
    finally{pending.onload=null;pending.onerror=null;pending.removeAttribute('src');}
    if(current()){node.src=url;node.hidden=false;}return;
   }
   catch(problem){if(!current())return;if(attempt)throw problem;}
  }
 };
 const options=(select,values,label)=>{const selected=select.value;select.replaceChildren(new Option(label,''),...values.map(value=>new Option(value,value)));if(values.includes(selected))select.value=selected;};
 const filters={collection:root.querySelector('[data-filter-collection]'),year:root.querySelector('[data-filter-year]'),tag:root.querySelector('[data-filter-tag]')};
 const unique=values=>[...new Set(values.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b));
 const showSlide=async index=>{
  if(index<0||index>=selection.length)return;viewerIndex=index;const revision=++viewerRevision,row=selection[index];
  viewer.querySelector('[data-viewer-count]').textContent=(index+1)+' / '+selection.length;
  viewer.querySelector('[data-viewer-caption]').textContent=[row.details.title,row.details.collection,row.details.year,row.details.description].filter(Boolean).join(' · ');
  viewer.querySelector('[data-viewer-previous]').disabled=index===0;viewer.querySelector('[data-viewer-next]').disabled=index===selection.length-1;
  [...strip.children].forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
  const selected=strip.children[index];if(selected){const frame=strip.getBoundingClientRect(),item=selected.getBoundingClientRect();if(item.left<frame.left||item.right>frame.right)strip.scrollLeft+=item.left-frame.left-(strip.clientWidth-item.width)/2;}
  viewerStatus.textContent='Loading image…';
  try{await loadImage(viewerImage,row,()=>viewer.open&&revision===viewerRevision);if(viewer.open&&revision===viewerRevision)viewerStatus.textContent='';}catch(problem){if(viewer.open&&revision===viewerRevision)viewerStatus.textContent=problem.message;}
 };
 const openViewer=(items,index)=>{
  selection=items;strip.replaceChildren();
  for(const [i,row] of items.entries()){const button=document.createElement('button'),thumbnail=document.createElement('img');button.type='button';button.setAttribute('aria-label',row.details.title||'Image '+(i+1));button.append(thumbnail);button.onclick=()=>showSlide(i);strip.append(button);loadImage(thumbnail,row,()=>viewer.open&&selection===items).catch(()=>{button.textContent=row.details.title||'Image '+(i+1);});}
  viewer.showModal();window.NeuroartanCloseButtons?.initCloseButtonPrimitive(viewer);showSlide(index);
 };
 viewer.querySelector('[data-viewer-close]').onclick=()=>viewer.close();
 viewer.addEventListener('close',()=>{viewerRevision++;viewerImage.removeAttribute('src');viewerImage.hidden=true;strip.replaceChildren();selection=[];});
 viewer.querySelector('[data-viewer-previous]').onclick=()=>showSlide(viewerIndex-1);
 viewer.querySelector('[data-viewer-next]').onclick=()=>showSlide(viewerIndex+1);
 viewer.addEventListener('keydown',event=>{if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();showSlide(viewerIndex+(event.key==='ArrowLeft'?-1:1));}});
 const photo=viewer.querySelector('[data-viewer-photo]');let start;
 photo.addEventListener('touchstart',event=>{start=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},{passive:true});
 photo.addEventListener('touchcancel',()=>{start=null;},{passive:true});
 photo.addEventListener('touchend',event=>{if(!start)return;const origin=start;start=null;if(event.touches.length||!event.changedTouches.length)return;const touch=event.changedTouches[0],dx=touch.clientX-origin.x,dy=touch.clientY-origin.y;if(Math.abs(dx)<photo.clientWidth/5||Math.abs(dx)<Math.abs(dy)*2)return;showSlide(viewerIndex+(dx<0?1:-1));},{passive:true});
 const render=()=>{
  const revision=++renderRevision;list.replaceChildren();
  const visible=rows.filter(row=>(!filters.collection.value||row.details.collection===filters.collection.value)&&(!filters.year.value||String(row.details.year)===filters.year.value)&&(!filters.tag.value||(row.details.tags||[]).includes(filters.tag.value)));
  const images=visible.filter(row=>row.details.image_path);
  for(const row of visible){
   const article=document.createElement('article'),heading=document.createElement('h2'),summary=document.createElement('p'),edit=document.createElement('button');heading.textContent=row.details.title;summary.textContent=[row.details.collection,row.details.year,row.status].filter(Boolean).join(' · ');
   if(row.details.image_path){const button=document.createElement('button'),thumbnail=document.createElement('img'),notice=document.createElement('span');button.type='button';button.className='studio-portfolio-preview';button.setAttribute('aria-label','View '+row.details.title);notice.textContent='Loading image…';button.append(thumbnail,notice);button.onclick=()=>openViewer(images,images.indexOf(row));article.append(button);loadImage(thumbnail,row,()=>revision===renderRevision).then(()=>{if(revision===renderRevision)notice.textContent='';}).catch(problem=>{if(revision===renderRevision)notice.textContent=problem.message;});}
   edit.type='button';edit.className='ui-button';const icon=document.createElement('img');icon.src='/app/icons/edit.svg';icon.className='studio-icon';icon.alt='';edit.append(icon,document.createTextNode('Edit'));edit.onclick=()=>open(row);article.append(heading,summary,edit);list.append(article);
  }
  status.textContent=rows.length?visible.length+' of '+rows.length+' '+(kind==='gallery'?'gallery items':'projects')+'.':'No items yet. Add your first '+schema.types[kind].singular+'.';
 };
 for(const filter of Object.values(filters))filter.onchange=render;
 const refresh=async()=>{
  const result=await client.from('studio_artist_portfolio').select('id,kind,details,status,updated_at').eq('account_id',owner.id).eq('kind',kind).neq('status','archived').order('updated_at',{ascending:false});if(result.error)throw Error('Your portfolio could not be loaded. Try again.');await identity();rows=result.data||[];list.replaceChildren();
  const collections=unique([...rows.map(row=>row.details.collection),...collectionRows.map(row=>row.name)]);options(collection,collections,kind==='gallery'?'No collection':'Choose an existing collection');options(filters.collection,collections,'All collections');options(filters.year,unique(rows.map(row=>row.details.year)).reverse(),'All years');options(filters.tag,unique(rows.flatMap(row=>row.details.tags||[])),'All tags');render();
 };
 const open=async row=>{
  const revision=++editRevision;active=row||null;form.reset();filename.textContent='No image selected';error.textContent='';if(preview){URL.revokeObjectURL(preview);preview=null;}image.hidden=true;image.removeAttribute('src');
  const year=form.elements.year,minimum=schema.fields.find(field=>field.name==='year').min;options(year,Array.from({length:new Date().getFullYear()-minimum+1},(_,i)=>String(new Date().getFullYear()-i)),'No year');
  if(row?.details.year&&!Array.from(year.options).some(option=>option.value===String(row.details.year)))year.add(new Option(String(row.details.year),String(row.details.year)));
  for(const field of schema.fields)form.elements[field.name].value=field.name==='tags'?(row?.details.tags||[]).join(', '):row?.details[field.name]||'';
  collection.value=row?.details.collection||'';
  if(kind==='gallery'){form.elements.media_type.value=row?.details.media_type||'photo';form.elements.video_url.value=row?.details.video_url||'';syncMedia();}
  count();form.elements.rights_confirmed.checked=row?.details.rights_confirmed===true;dialog.querySelector('[data-portfolio-title]').textContent=row?'Edit '+schema.types[kind].singular:'New '+schema.types[kind].singular;dialog.showModal();window.NeuroartanCloseButtons?.initCloseButtonPrimitive(dialog);
  if(row?.details.image_path)try{await loadImage(image,row,()=>dialog.open&&revision===editRevision);}catch(problem){if(dialog.open&&revision===editRevision)error.textContent=problem.message;}
 };
 root.querySelector('[data-portfolio-close]').onclick=()=>dialog.close();
 form.querySelector('[data-portfolio-pick]').onclick=()=>form.elements.image.click();
 dialog.addEventListener('close',()=>{editRevision++;if(preview)URL.revokeObjectURL(preview);preview=null;image.removeAttribute('src');image.hidden=true;form.reset();filename.textContent='No image selected';count();});
 form.elements.image.onchange=async()=>{const file=form.elements.image.files[0];if(!file)return;const revision=++editRevision;error.textContent='';filename.textContent=file.name;image.hidden=true;image.removeAttribute('src');if(preview)URL.revokeObjectURL(preview);preview=null;try{const blob=await exportImage(file);if(!dialog.open||revision!==editRevision)return;preview=URL.createObjectURL(blob);image.src=preview;image.alt='Selected image preview';image.hidden=false;}catch(problem){if(revision!==editRevision)return;form.elements.image.value='';filename.textContent='No image selected';error.textContent=problem.message;}};
 client.auth?.onAuthStateChange((_event,session)=>{if(session?.user?.id===owner.id)return;renderRevision++;editRevision++;viewerRevision++;signed.clear();rows=[];collectionManager?.clear();list.replaceChildren();if(viewer.open)viewer.close();if(dialog.open)dialog.close();root.querySelector('[data-portfolio-add]').disabled=true;status.textContent='Sign in again to manage your portfolio.';});
 try{await refresh();}catch(problem){status.textContent=problem.message;return;}
 if(kind==='gallery'){
  collectionManager=await bindGalleryCollections(root,{client,owner,identity,onChange:async items=>{collectionRows=items;await refresh();}});
  if((await resolveUser(client).catch(()=>null))?.id!==owner.id){collectionManager.clear();return;}
 }
 root.querySelector('[data-portfolio-add]').onclick=()=>open(null);
 root.querySelector('[data-portfolio-add]').disabled=false;
 form.onsubmit=async event=>{
  event.preventDefault();const buttons=[...form.querySelectorAll('[type=submit]')];buttons.forEach(button=>button.disabled=true);
  try{
   await identity();const value=portfolioValues(new FormData(form)),publication=event.submitter?.name==='publish'?'published':'draft';
   if(publication==='published'&&value.media_type==='video'&&!value.video_url)throw Error('Add a YouTube or Vimeo video address before publishing.');
   if(active?.details.image_path)value.image_path=active.details.image_path;
   const file=form.elements.image.files[0];if(publication==='published'&&(file||kind==='gallery')&&(!value.rights_confirmed||!value.image_alt))throw Error('Add an image description and confirm image rights before publishing.');
   let id=active?.id||null;
   if(file){const blob=await exportImage(file);const draft=await client.rpc('studio_save_portfolio',{entry_id:id,entry_kind:kind,value,publication:'draft'});if(draft.error)throw Error('The private image draft could not be created.');id=draft.data;active={id,details:value};const path=owner.id+'/'+id+'/image';await identity();const upload=await client.storage.from('studio-portfolio').upload(path,blob,{contentType:blob.type,upsert:true,cacheControl:'0'});if(upload.error)throw Error('Image upload failed. Your draft is safe; choose the image again to retry.');value.image_path=path;}
   const result=await client.rpc('studio_save_portfolio',{entry_id:id,entry_kind:kind,value,publication});if(result.error)throw Error(publication==='published'?'Publication failed. Check your approved profile, image and sharing choices.':'Your draft could not be saved.');
   active={id:result.data,details:value};signed.clear();await refresh();dialog.close();showArtistSaveConfirmation(publication==='published'?'Portfolio item published.':'Portfolio draft saved.');
  }catch(problem){error.textContent=problem.message;}finally{buttons.forEach(button=>button.disabled=false);}
 };
}
