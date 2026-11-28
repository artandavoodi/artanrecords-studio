import platform from '../content/platform.json' with {type:'json'};
import {bindReorderList} from './neuroartan/assets/js/core/02-systems/reorder-list.js';
const actions=platform.overview.actions;
export function overviewShortcuts(value){
 const ids=actions.map(item=>item.id);
 if(!value||!Array.isArray(value.shortcuts))return ids;
 return [...new Set(value.shortcuts.filter(id=>ids.includes(id)))];
}
export async function bindOverviewPreferences({client,resolveUser}){
 const list=document.querySelector('[data-overview-shortcuts]'),settings=document.querySelector('[data-overview-settings]');
 if(!client||(!list&&!settings))return;
 const owner=await resolveUser(client);if(!owner)return;
 const result=await client.from('studio_user_preferences').select('overview').eq('account_id',owner.id).maybeSingle();
 const status=settings?.querySelector('[data-overview-preferences-status]')||document.querySelector('[data-overview-status]');
 if(result.error){status.textContent='Your Overview settings could not be loaded. Please refresh.';return;}
 if((await resolveUser(client))?.id!==owner.id)return;
 const apply=ids=>{if(!list)return;const cards=[...list.children];for(const id of [...ids,...actions.map(item=>item.id).filter(id=>!ids.includes(id))]){const card=cards.find(item=>item.dataset.overviewShortcut===id);if(card)list.append(card);}for(const card of cards)card.hidden=!ids.includes(card.dataset.overviewShortcut);document.querySelector('[data-overview-empty]').hidden=ids.length>0;};
 const selected=overviewShortcuts(result.data?.overview);apply(selected);
 if(!settings)return;
 const form=settings.querySelector('form'),options=settings.querySelector('[data-overview-options]'),rows=[...options.children];
 const populate=ids=>{for(const id of [...ids,...actions.map(item=>item.id).filter(id=>!ids.includes(id))]){const row=rows.find(item=>item.dataset.overviewOption===id);row.querySelector('input').checked=ids.includes(id);options.append(row);}};
 populate(selected);bindReorderList(options,{rowSelector:'[data-overview-option]',handleSelector:'[data-overview-reorder]',onChange:()=>{status.textContent='Save to apply your order.';}});
 form.addEventListener('reset',()=>{populate(actions.map(item=>item.id));status.textContent='Default shortcuts selected. Save to apply.';});
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;status.textContent='Saving…';
  try{
   if((await resolveUser(client))?.id!==owner.id)throw Error('Your session changed. Sign in again.');
   const shortcuts=[...options.children].filter(row=>row.querySelector('input').checked).map(row=>row.dataset.overviewOption);
   const saved=await client.rpc('studio_save_overview_preferences',{value:{shortcuts}});if(saved.error)throw Error('Your Overview could not be saved. Please retry.');
   apply(shortcuts);status.textContent='Overview saved.';
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 });
}
