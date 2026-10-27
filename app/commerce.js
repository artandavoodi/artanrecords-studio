import config from '../content/commerce.json' with {type:'json'};
import reserved from '../assets/data/artists/reserved-routes.json' with {type:'json'};
import {contract,creatorPath,domainHostname,draftValues,ownDraft,priceInput} from './commerce-model.js';
import {showSaveConfirmation} from './neuroartan/assets/js/core/02-systems/toast.js';
const node=(tag,text,classes)=>{const element=document.createElement(tag);if(text)element.textContent=text;if(classes)element.className=classes;return element;};
export async function bindCommerce({client,resolveUser}){
 const root=document.querySelector('[data-commerce]');if(!root)return;
 const status=root.querySelector('[data-commerce-status]'),controls=root.querySelector('[data-commerce-controls]'),prepare=root.querySelector('[data-commerce-prepare]');
 if(!client)return;
 const user=await resolveUser(client).catch(()=>null);if(!user)return;
 let store=null,products=[],collections=[],domains=[],busy=false;
 const current={product:null,collection:null};
 async function owner(){if((await resolveUser(client))?.id!==user.id)throw Error('Your session changed. Sign in again.');}
 async function checked(query){const result=await query;if(result.error)throw Error('Store drafts could not be saved or loaded. Please try again.');return result.data;}
 async function action(button,work){if(busy)return;busy=true;button.disabled=true;status.textContent='';try{await owner();await work();await refresh();showSaveConfirmation('Changes saved.');}catch(error){status.textContent=error.message;}finally{busy=false;button.disabled=false;}}
 function showEditor(kind,record){
  current[kind]=record;const form=root.querySelector(`[data-commerce-editor="${kind}"]`);form.reset();form.hidden=false;
  let heading=form.querySelector('[data-commerce-editor-title]');if(!heading){heading=node('h2');heading.dataset.commerceEditorTitle='';form.prepend(heading);}
  heading.textContent=record?'Edit '+record.title:'New '+kind;
  root.querySelector(`[data-commerce-new="${kind}"]`).hidden=true;
  for(const field of kind==='product'?config.productFields:config.collectionFields){let value=record?.[field.name]??'';if(kind==='product'&&field.name==='price')value=record?priceInput(record):'';if(field.name==='sku')value=record?.details?.sku||'';if(field.name==='image_url')value=record?.details?.media?.[0]?.url||'';form.elements[field.name].value=value;}
  if(kind==='product'){form.elements.kind.value=record?.kind||contract.productKinds[0].id;form.elements.currency.value=record?.currency||'';form.elements.collection_id.value=record?.collection_id||'';}
  form.elements.title.focus();
 }
 function renderList(kind,records){
  const list=root.querySelector(`[data-commerce-list="${kind}"]`);list.replaceChildren();
  if(!records.length){list.append(node('p',kind==='product'?'No product drafts yet. Start with one product.':'No collections yet. Create a collection to organise products.','studio-field-note'));return;}
  for(const record of records){const row=node('article',null,'studio-commerce-row'),copy=node('div');copy.append(node('h3',record.title),node('p',kind==='product'?'Private '+record.status+' · '+record.kind:'Private collection','studio-field-note'));const edit=node('button','Edit','ui-button');edit.type='button';edit.disabled=kind==='product'&&record.status!=='draft';edit.onclick=()=>{try{showEditor(kind,record);}catch(error){status.textContent=error.message;}};row.append(copy,edit);list.append(row);}
 }
 async function refresh(){
  await owner();const identity=await checked(client.from('studio_creators').select('id').eq('account_id',user.id).maybeSingle());
  if(!identity){controls.hidden=true;prepare.hidden=false;status.textContent='Prepare private product and collection drafts. This does not open a shop or enable sales.';return;}
  const next=await checked(client.from('studio_store_drafts').select('id,creator_id,title,introduction,status').eq('creator_id',identity.id).maybeSingle());
  if(!next)throw Error('Your private store could not be loaded.');
  const records=await Promise.all([
   checked(client.from('studio_store_products').select('*').eq('store_id',next.id).order('created_at')),
   checked(client.from('studio_store_collections').select('*').eq('store_id',next.id).order('created_at')),
   checked(client.from('studio_creator_domains').select('id,surface,hostname,status').eq('creator_id',identity.id).order('created_at'))
  ]);
  await owner();store=next;[products,collections,domains]=records;prepare.hidden=true;controls.hidden=false;status.textContent='Private preparation · not published';
  root.querySelector('[data-commerce-summary]').textContent=products.length+' product drafts · '+collections.length+' collections. No public shop is active.';
  const settings=root.querySelector('[data-commerce-settings]');settings.elements.title.value=store.title;settings.elements.introduction.value=store.introduction;
  settings.querySelector('button').disabled=store.status!=='draft';
  const collection=root.querySelector('[data-commerce-collection]'),selected=collection.value;collection.replaceChildren(new Option('No collection',''),...collections.map(record=>new Option(record.title,record.id)));collection.value=selected;
  renderList('product',products);renderList('collection',collections);
  const list=root.querySelector('[data-commerce-domains]');list.replaceChildren();if(!domains.length)list.append(node('p','No domain requests yet.','studio-field-note'));
  for(const record of domains){const row=node('article',null,'studio-commerce-row'),copy=node('div');copy.append(node('h3',record.hostname),node('p',(record.surface==='profile'?'Official website':'Shop')+' · '+record.status+' · connection not activated','studio-field-note'));row.append(copy);list.append(row);}
  const handle=await checked(client.from('studio_artist_handles').select('approved_username').eq('account_id',user.id).maybeSingle());
  root.querySelector('[data-commerce-fallback]').textContent=handle?.approved_username?'Planned shop address: https://artanrecords.com'+creatorPath(handle.approved_username,contract,reserved)+' — not published.':'Your future shop address will use your label-approved username.';
 }
 prepare.onclick=()=>action(prepare,async()=>{await checked(client.rpc('studio_prepare_store'));});
 for(const kind of ['product','collection']){
  const form=root.querySelector(`[data-commerce-editor="${kind}"]`),create=root.querySelector(`[data-commerce-new="${kind}"]`);create.onclick=()=>showEditor(kind,null);form.querySelector('[data-commerce-cancel]').onclick=()=>{form.hidden=true;current[kind]=null;create.hidden=false;create.focus();};
  form.onsubmit=event=>{event.preventDefault();action(form.querySelector('[type=submit]'),async()=>{
   const values=draftValues(new FormData(form),kind,current[kind]?.details),table=kind==='product'?'studio_store_products':'studio_store_collections';
   const result=current[kind]?await checked(client.from(table).update(values).eq('id',current[kind].id).eq('store_id',store.id).select('id').single()):await checked(client.from(table).insert(ownDraft(values,store)).select('id').single());
   if(!result)throw Error('The draft could not be saved.');form.hidden=true;current[kind]=null;create.hidden=false;create.focus();
  });};
 }
 const settings=root.querySelector('[data-commerce-settings]');settings.onsubmit=event=>{event.preventDefault();action(settings.querySelector('button'),async()=>{
  const title=settings.elements.title.value.trim(),introduction=settings.elements.introduction.value.trim();if(!title||title.length>120||introduction.length>contract.limits.introduction)throw Error('Check the store name and introduction.');
  await checked(client.from('studio_store_drafts').update({title,introduction}).eq('id',store.id).select('id').single());
 });};
 const domainForm=root.querySelector('[data-commerce-domain]');domainForm.onsubmit=event=>{event.preventDefault();action(domainForm.querySelector('button'),async()=>{
  const surface=domainForm.elements.surface.value;if(!contract.domainSurfaces.includes(surface))throw Error('Choose website or shop.');
  await checked(client.from('studio_creator_domains').insert({creator_id:store.creator_id,surface,hostname:domainHostname(domainForm.elements.hostname.value)}).select('id').single());domainForm.reset();
 });};
 try{await refresh();}catch{controls.hidden=true;prepare.hidden=true;status.textContent='Store preparation is not connected yet. Your existing shop has not changed.';}
}
