import {showArtistSaveConfirmation} from './artist-save.js';
import {navigationLinks} from './artist-navigation-values.js';
export async function bindArtistNavigation({client,resolveUser}){
 const root=document.querySelector('[data-artist-navigation]');if(!root||!client)return;
 const form=root.querySelector('form'),status=root.querySelector('[data-navigation-status]'),save=form.querySelector('[type=submit]');save.disabled=true;
 const user=await resolveUser(client).catch(()=>null);if(!user)return;
 function add(group,value={label:'',url:''}){
  const list=root.querySelector('[data-navigation-links="'+group+'"]');if(list.children.length>=8)return;
  const row=document.createElement('div'),name=document.createElement('label'),address=document.createElement('label'),remove=document.createElement('button');
  row.dataset.navigationRow='';const label=document.createElement('input'),url=document.createElement('input');label.className=url.className='ui-field';label.maxLength=60;url.maxLength=2000;label.value=value.label;url.value=value.url;label.dataset.linkLabel='';url.dataset.linkUrl='';name.append('Link name',label);address.append('Address',url);remove.type='button';remove.className='ui-button';remove.textContent='Remove link';remove.onclick=()=>{row.remove();sync();};row.append(name,address,remove);list.append(row);sync();
 }
 function sync(){for(const button of root.querySelectorAll('[data-navigation-add]'))button.disabled=root.querySelector('[data-navigation-links="'+button.dataset.navigationAdd+'"]').children.length>=8;}
 for(const button of root.querySelectorAll('[data-navigation-add]'))button.onclick=()=>add(button.dataset.navigationAdd);
 try{const {data,error}=await client.from('studio_artist_navigation').select('menu,footer,footer_text,published').eq('account_id',user.id).maybeSingle();if(error)throw error;for(const group of ['menu','footer'])for(const value of data?.[group]||[])add(group,value);form.elements.footer_text.value=data?.footer_text||'';form.elements.published.checked=data?.published===true;save.disabled=false;status.textContent='';}
 catch{status.textContent='Website navigation could not be loaded. Your public page is unchanged.';return;}
 form.onsubmit=async event=>{event.preventDefault();save.disabled=true;try{if((await resolveUser(client))?.id!==user.id)throw Error('Your session changed. Refresh before saving.');const next={account_id:user.id,footer_text:form.elements.footer_text.value.trim(),published:form.elements.published.checked,updated_at:new Date().toISOString()};for(const group of ['menu','footer'])next[group]=navigationLinks([...root.querySelectorAll('[data-navigation-links="'+group+'"] [data-navigation-row]')].map(row=>({label:row.querySelector('[data-link-label]').value,url:row.querySelector('[data-link-url]').value})));const {error}=await client.from('studio_artist_navigation').upsert(next,{onConflict:'account_id'});if(error)throw Error('Website navigation could not be saved. Try again.');status.textContent='';showArtistSaveConfirmation('Website navigation saved.');}catch(error){status.textContent=error.message;}finally{save.disabled=false;}};
}
