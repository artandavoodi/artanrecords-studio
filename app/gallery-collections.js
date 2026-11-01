import schema from '../content/portfolio.json' with {type:'json'};
import {syncCharacterCounter} from './neuroartan/assets/js/core/02-systems/character-counter.js';

// Dedicated owner records; item labels are not a substitute for collection identity.
export async function bindGalleryCollections(root,{client,owner,identity,onChange}){
 const section=root.querySelector('[data-gallery-collections]'),form=section.querySelector('form'),list=section.querySelector('[data-collections-list]'),status=section.querySelector('[data-collections-status]'),error=section.querySelector('[data-collection-error]'),rename=section.querySelector('[data-collection-rename]');
 const description=form.elements.description,limit=schema.collectionFields.find(field=>field.name==='description').max;
 let rows=[],active=null,revision=0,busy=false,available=false;
 const count=()=>{const {count}=syncCharacterCounter(description,section.querySelector('[data-collection-counter]'),limit);section.querySelector('[data-collection-count]').textContent=count+' / '+limit+' characters';description.setCustomValidity(count>limit?'Shorten the description to '+limit+' characters.':'');};
 const reset=()=>{active=null;form.reset();count();error.textContent='';rename.hidden=true;section.querySelector('[data-collection-rename-notice]').hidden=true;section.querySelector('[data-collection-heading]').textContent='New collection';};
 description.addEventListener('input',count);
 section.querySelector('[data-collection-reset]').onclick=()=>{if(!busy){reset();lock(false);form.elements.name.focus();}};
 const lock=value=>{busy=value;const changed=Boolean(active&&form.elements.name.value.trim()!==active.name);rename.hidden=!changed;section.querySelector('[data-collection-rename-notice]').hidden=!changed;for(const button of form.querySelectorAll('button'))button.disabled=value||!available||(button.type==='submit'&&changed);for(const button of list.querySelectorAll('button'))button.disabled=value;};
 form.elements.name.addEventListener('input',()=>lock(busy));
 const refresh=async()=>{
  const current=++revision;
  try{
   await identity();const result=await client.from('studio_gallery_collections').select('id,name,description,status,updated_at').eq('account_id',owner.id).neq('status','archived').order('name',{ascending:true});
   if(result.error)throw Error('Collections could not be loaded. Reopen the page to retry.');await identity();if(current!==revision)return;
   rows=result.data||[];available=true;list.replaceChildren();
   for(const row of rows){
    const article=document.createElement('article'),heading=document.createElement('h3'),summary=document.createElement('p'),edit=document.createElement('button'),archive=document.createElement('button');heading.textContent=row.name;summary.textContent=[row.description,row.status].filter(Boolean).join(' · ');
    edit.type=archive.type='button';edit.className=archive.className='ui-button';edit.textContent='Edit collection';archive.textContent='Archive collection';
    edit.onclick=()=>{if(busy)return;active=row;form.elements.name.value=row.name;description.value=row.description||'';count();error.textContent='';section.querySelector('[data-collection-heading]').textContent='Edit collection';lock(false);form.elements.name.focus();};
    archive.onclick=()=>save(row,{name:row.name,description:row.description||''},'archived');
    article.append(heading,summary,edit,archive);list.append(article);
   }
   status.textContent=rows.length?rows.length+' collections.':'No collections yet. Create your first collection.';await onChange(rows);lock(busy);
  }catch(problem){if(current!==revision)return;available=false;status.textContent=problem.message;lock(false);}
 };
 const save=async(row,value,publication)=>{
  if(busy||!available)return;lock(true);error.textContent='';
  try{
   await identity();const result=await client.rpc('studio_save_gallery_collection',{collection_id:row?.id||null,collection_name:value.name,collection_description:value.description,publication});
   if(result.error)throw Error('Collection could not be saved. Try again.');await identity();reset();await refresh();if(available)status.textContent=publication==='archived'?'Collection archived. Existing items have not been deleted.':'Collection saved.';
  }catch(problem){error.textContent=problem.message;}finally{lock(false);}
 };
 rename.onclick=async()=>{
  if(busy||!available||!active)return;const name=form.elements.name.value.trim(),limit=schema.collectionFields.find(field=>field.name==='name').max;
  if(!name||name.length>limit){error.textContent='Check collection name.';return;}
  lock(true);error.textContent='';
  try{await identity();const result=await client.rpc('studio_rename_gallery_collection',{collection_id:active.id,collection_name:name});if(result.error)throw Error('Collection could not be renamed. Try again.');await identity();active={...active,name};await refresh();if(available)status.textContent='Collection renamed. Existing gallery items have been updated.';}
  catch(problem){error.textContent=problem.message;}finally{lock(false);}
 };
 form.onsubmit=event=>{event.preventDefault();const value={};for(const field of schema.collectionFields){const text=String(form.elements[field.name].value||'').trim();if(text.length>field.max||field.required&&!text){error.textContent='Check '+field.label.toLowerCase()+'.';return;}value[field.name]=text;}save(active,value,event.submitter?.name==='publish'?'published':'draft');};
 reset();lock(false);await refresh();
 return {clear(){revision++;rows=[];available=false;list.replaceChildren();reset();lock(false);status.textContent='Sign in again to manage your collections.';}};
}
