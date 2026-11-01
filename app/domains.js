import config from '../content/domains.json' with {type:'json'};
import {domainHostname} from './domain-values.js';
import {showSaveConfirmation} from './neuroartan/assets/js/core/02-systems/toast.js';
const node=(tag,text)=>{const item=document.createElement(tag);if(text)item.textContent=text;return item;};
export async function bindDomains({client,resolveUser}){
 const root=document.querySelector('[data-domains]');if(!root)return;
 const status=root.querySelector('[data-domains-status]'),controls=root.querySelector('[data-domains-controls]');
 const tabs=[...root.querySelectorAll('[data-domain-tab]')];
 const select=selected=>{for(const tab of tabs){const active=tab===selected;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}for(const panel of root.querySelectorAll('[data-domain-panel]'))panel.hidden=panel.dataset.domainPanel!==selected.dataset.domainTab;};
 tabs.forEach((tab,index)=>{tab.onclick=()=>select(tab);tab.onkeydown=event=>{let target;if(['ArrowRight','ArrowDown'].includes(event.key))target=tabs[(index+1)%tabs.length];else if(['ArrowLeft','ArrowUp'].includes(event.key))target=tabs[(index+tabs.length-1)%tabs.length];else if(event.key==='Home')target=tabs[0];else if(event.key==='End')target=tabs.at(-1);if(target){event.preventDefault();select(target);target.focus();}};});
 if(!client)return;
 const user=await resolveUser(client).catch(()=>null);if(!user)return;
 let busy=false;
 const owner=async()=>{if((await resolveUser(client))?.id!==user.id)throw Error('Your session changed. Sign in again.');};
 const checked=async query=>{const result=await query;if(result.error)throw Error('Domain settings could not be loaded or saved. Try again.');return result.data;};
 async function action(button,work){if(busy)return;busy=true;button.disabled=true;try{await owner();await work();await refresh();showSaveConfirmation('Domain settings saved.');}catch(error){status.textContent=error.message;}finally{busy=false;button.disabled=false;}}
 async function refresh(){
  await owner();const creator=await checked(client.from('studio_creators').select('id').eq('account_id',user.id).maybeSingle());
  const records=creator?await checked(client.from('studio_creator_domains').select('id,surface,hostname,status,verified_at,tls_ready,is_primary').eq('creator_id',creator.id).order('created_at')):[];
  await owner();
  for(const surface of config.surfaces){const list=root.querySelector(`[data-domain-list="${surface.id}"]`);list.replaceChildren();const items=records.filter(item=>item.surface===surface.id&&item.status!=='removed');
   if(!items.length)list.append(node('p','No custom domain added.'));
   for(const record of items){const row=node('article'),title=node('h4',record.hostname),state=node('p',config.statuses[record.status]||'Status needs review');row.className='studio-commerce-row';const copy=node('div');copy.append(title,state);row.append(copy);
    if(record.status==='active'&&record.verified_at&&record.tls_ready){const open=node('a','Open');open.href='https://'+record.hostname+'/';open.target='_blank';open.rel='noopener noreferrer';row.append(open);}
    if(record.status==='requested'){const cancel=node('button','Cancel request');cancel.type='button';cancel.className='ui-button';cancel.onclick=()=>action(cancel,async()=>{const deleted=await checked(client.from('studio_creator_domains').delete().eq('id',record.id).eq('creator_id',creator.id).eq('status','requested').select('id'));if(!deleted?.length)throw Error('The request changed. Refresh before cancelling.');});row.append(cancel);}
    list.append(row);
   }
  }
  controls.hidden=false;status.textContent='Website and store connections are managed separately.';
 }
 for(const form of root.querySelectorAll('[data-domain-form]'))form.onsubmit=event=>{event.preventDefault();action(form.querySelector('[type=submit]'),async()=>{const hostname=domainHostname(form.elements.hostname.value);await checked(client.rpc('studio_request_domain',{surface:form.dataset.domainForm,hostname}));form.reset();});};
 try{await refresh();}catch(error){controls.hidden=true;status.textContent=error.message;}
}
