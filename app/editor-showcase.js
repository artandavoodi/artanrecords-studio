import {bindReorderList} from './neuroartan/assets/js/core/02-systems/reorder-list.js';
export function bindEditorShowcase(root,config,getDraft,onChange){
 let choices=[];
 const render=()=>{
  for(const group of config.showcase){
   const mount=root.querySelector('[data-showcase-choices="'+group.id+'"]');if(!mount)continue;mount.replaceChildren();
   const available=choices.find(item=>item.id===group.id)?.items||[],selected=getDraft().showcase?.[group.id]||[];
   const count=document.createElement('p'),order=document.createElement('div'),options=document.createElement('div');count.textContent=selected.length+' / '+group.limit+' selected';options.className='ui-radio-list';mount.append(count,order,options);
   const change=ids=>onChange(group,ids);
   for(const id of selected){const item=available.find(item=>item.id===id),row=document.createElement('div'),handle=document.createElement('button'),image=document.createElement('img'),button=document.createElement('button');row.dataset.reorderId=id;row.draggable=true;row.className='studio-editor-section-row';handle.type='button';handle.className='ui-reorder-handle';handle.dataset.reorderHandle='';handle.setAttribute('aria-label','Reorder '+(item?.label||id));image.src=config.dragIcon;image.className='studio-icon';image.alt='';handle.append(image);button.type='button';button.className='ui-radio-list__item';button.textContent=(item?.label||id)+(item?'':' · Not currently available');button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Remove '+(item?.label||id));button.onclick=()=>change(selected.filter(value=>value!==id));row.append(handle,button);order.append(row);}
   bindReorderList(order,{rowSelector:'[data-reorder-id]',handleSelector:'[data-reorder-handle]',onChange:rows=>change(rows.map(row=>row.dataset.reorderId))});
   for(const item of available.filter(item=>!selected.includes(item.id))){const button=document.createElement('button'),label=document.createElement('span'),indicator=document.createElement('span');button.type='button';button.className='ui-radio-list__item';button.setAttribute('aria-pressed','false');button.disabled=selected.length>=group.limit;label.textContent=item.label;indicator.className='ui-radio-list__indicator';indicator.setAttribute('aria-hidden','true');button.append(label,indicator);button.onclick=()=>change([...selected,item.id]);options.append(button);}
   if(!available.length){const empty=document.createElement('p');empty.textContent='Publish work in '+(group.id==='music'?'Releases':'Gallery')+' before selecting it here.';mount.append(empty);}
  }
 };
 return {render,update(value){if(!Array.isArray(value))return;choices=value.filter(group=>config.showcase.some(item=>item.id===group.id)&&Array.isArray(group.items)).map(group=>({id:group.id,items:group.items.filter(item=>typeof item.id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)&&typeof item.label==='string').slice(0,200)}));render();}};
}
