import {showArtistSaveConfirmation} from './artist-save.js';
import {navigationLinks} from './artist-navigation-values.js';
import {bindReorderList} from './neuroartan/assets/js/core/02-systems/reorder-list.js';
export async function bindArtistNavigation({client,resolveUser}){
 const root=document.querySelector('[data-artist-navigation]');if(!root||!client)return;
 const form=root.querySelector('form'),status=root.querySelector('[data-navigation-status]'),save=form.querySelector('[type=submit]');save.disabled=true;
 const user=await resolveUser(client).catch(()=>null);if(!user)return;
 let loaded=false,saved='',pending;
 const read=()=>{const footer_text=form.elements.footer_text.value.trim();if(footer_text.length>500)throw Error('Use up to 500 characters for the footer.');return {menu:navigationLinks(rows('menu')),footer:navigationLinks(rows('footer')),footer_text,published:form.elements.published.checked};};
 const rows=group=>[...root.querySelectorAll('[data-navigation-links="'+group+'"] [data-navigation-row]')].map(row=>({label:row.querySelector('[data-link-label]').value,url:row.querySelector('[data-link-url]').value}));
 const changed=()=>{if(!loaded)return;try{const value=read();root.dataset.dirty=String(JSON.stringify(value)!==saved);status.textContent=root.dataset.dirty==='true'?'Unsaved navigation changes. Save to apply your sharing choice.':'';document.dispatchEvent(new CustomEvent('studio:artist-navigation-preview',{detail:value}));}catch(error){root.dataset.dirty='true';status.textContent=error.message;}document.dispatchEvent(new CustomEvent('studio:artist-navigation-dirty',{detail:{dirty:root.dataset.dirty==='true'}}));};
 form.addEventListener('input',changed);form.addEventListener('change',changed);
 document.addEventListener('studio:artist-navigation-preview-request',changed);
 function add(group,value={label:'',url:''}){
  const list=root.querySelector('[data-navigation-links="'+group+'"]');if(list.children.length>=8)return;
  const row=document.createElement('div'),name=document.createElement('label'),address=document.createElement('label'),remove=document.createElement('button');
  row.dataset.navigationRow='';row.draggable=true;const handle=document.createElement('button'),image=document.createElement('img');handle.type='button';handle.dataset.reorderHandle='';handle.className='ui-reorder-handle';handle.setAttribute('aria-label','Reorder '+(value.label||group+' link'));image.src='/app/neuroartan/registry/icons/public/assets/core/actions/drag/drag.svg';image.className='studio-icon';image.alt='';handle.append(image);const label=document.createElement('input'),url=document.createElement('input');label.className=url.className='ui-field';label.maxLength=60;url.maxLength=2000;label.value=value.label;url.value=value.url;label.dataset.linkLabel='';url.dataset.linkUrl='';label.oninput=()=>handle.setAttribute('aria-label','Reorder '+(label.value||group+' link'));name.append('Link name',label);address.append('Address',url);remove.type='button';remove.className='ui-button';remove.textContent='Remove link';remove.onclick=()=>{row.remove();sync();};row.append(handle,name,address,remove);list.append(row);bindReorderList(list,{rowSelector:'[data-navigation-row]',handleSelector:'[data-reorder-handle]',onChange:sync});sync();
 }
 function sync(){for(const button of root.querySelectorAll('[data-navigation-add]'))button.disabled=root.querySelector('[data-navigation-links="'+button.dataset.navigationAdd+'"]').children.length>=8;changed();}
 for(const button of root.querySelectorAll('[data-navigation-add]'))button.onclick=()=>add(button.dataset.navigationAdd);
 document.addEventListener('studio:artist-menu-order',event=>{try{const links=navigationLinks(event.detail);root.querySelector('[data-navigation-links=menu]').replaceChildren();for(const link of links)add('menu',link);status.textContent='Menu order changed. Save to apply your sharing choice.';}catch{status.textContent='Menu order could not be applied.';}});
 try{const {data,error}=await client.from('studio_artist_navigation').select('menu,footer,footer_text,published').eq('account_id',user.id).maybeSingle();if(error)throw error;for(const group of ['menu','footer'])for(const value of data?.[group]||[])add(group,value);form.elements.footer_text.value=data?.footer_text||'';form.elements.published.checked=data?.published===true;saved=JSON.stringify(read());loaded=true;save.disabled=false;changed();}
 catch{status.textContent='Website navigation could not be loaded. Your public page is unchanged.';return;}
 const persist=()=>{
  if(pending)return pending;
  pending=(async()=>{save.disabled=true;try{if((await resolveUser(client))?.id!==user.id)throw Error('Your session changed. Refresh before saving.');const value=read(),snapshot=JSON.stringify(value);if(snapshot===saved)return false;const {error}=await client.from('studio_artist_navigation').upsert({account_id:user.id,...value,updated_at:new Date().toISOString()},{onConflict:'account_id'});if(error)throw Error('Website navigation could not be saved. Try again.');saved=snapshot;changed();return true;}catch(error){status.textContent=error.message;throw error;}finally{save.disabled=false;}})().finally(()=>{pending=null;});return pending;
 };
 document.addEventListener('studio:artist-navigation-save',event=>event.detail?.register?.(persist()));
 form.onsubmit=async event=>{event.preventDefault();try{if(await persist())showArtistSaveConfirmation('Website navigation saved.');}catch{}};
}
