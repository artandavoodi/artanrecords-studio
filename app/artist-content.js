import config from '../content/artist-content.json' with {type:'json'};
import {readArtistCatalogue} from './catalogue-data.js';
import {showArtistSaveConfirmation as showSaveConfirmation} from './artist-save.js';
export async function bindArtistContent({client,resolveUser}){
 const root=document.querySelector('[data-artist-content]');if(!root)return;
 const status=root.querySelector('[data-content-status]'),dialog=root.querySelector('dialog'),form=dialog.querySelector('form'),fields=form.querySelector('[data-content-fields]'),error=form.querySelector('[data-content-error]');
 let user,content={},active,releases=[];
 const preview=()=>{for(const group of config.groups){const values=group.fields.map(field=>content[field.name]).filter(Boolean);root.querySelector('[data-content-preview="'+group.id+'"]').textContent=values.length?values.join(' · '):'Not added';}};
 try{
  if(!client||(user=await resolveUser(client))==null)throw Error('Sign in to manage your artist content.');
  const result=await client.from('studio_artist_content').select('content,updated_at').eq('account_id',user.id).maybeSingle();if(result.error)throw Error('Artist content is not available yet. Your existing profile is unchanged.');
  content=result.data?.content||{};preview();status.textContent='';root.querySelectorAll('[data-content-edit]').forEach(button=>button.disabled=false);
 }catch(problem){status.textContent=problem.message;return;}
 root.querySelector('[data-content-close]').onclick=()=>dialog.close();
 for(const button of root.querySelectorAll('[data-content-edit]'))button.onclick=async()=>{
  active=config.groups.find(group=>group.id===button.dataset.contentEdit);error.textContent='';fields.replaceChildren();form.querySelector('[data-content-title]').textContent=active.title;
  if(active.id==='spotlight'){button.disabled=true;try{releases=await readArtistCatalogue(client,user);}catch{status.textContent='Your released catalogue could not be loaded. Try again.';return;}finally{button.disabled=false;}}
  for(const field of active.fields){
   const label=document.createElement('label'),title=document.createElement('span');title.textContent=field.label;
   const input=document.createElement(field.type==='release'?'select':field.multiline?'textarea':'input');input.className='ui-field';input.name=field.name;
   if(field.type==='release'){for(const record of [{id:'',title:'No Spotlight'},...releases]){const option=document.createElement('option');option.value=record.id;option.textContent=record.title;input.append(option);}}
   else if(!field.multiline)input.type=field.type||'text';
   if(field.multiline)input.rows=4;if(field.type!=='release')input.maxLength=4000;input.value=content[field.name]||'';label.append(title,input);fields.append(label);
   if(!field.private){const share=document.createElement('label'),checkbox=document.createElement('input'),caption=document.createElement('span');share.className='studio-sharing';checkbox.type='checkbox';checkbox.dataset.contentShare=field.name;checkbox.checked=content.visibility?.[field.name]===true;caption.textContent=field.name==='spotlight_release'?'Show Spotlight on my public artist page':'Show '+field.label.toLowerCase()+' on my public artist page';share.append(checkbox,caption);fields.append(share);}
  }
  dialog.showModal();window.NeuroartanCloseButtons?.initCloseButtonPrimitive(dialog);
 };
 form.onsubmit=async event=>{event.preventDefault();const save=form.querySelector('[type=submit]');save.disabled=true;
  try{
   if((await resolveUser(client))?.id!==user.id)throw Error('Your session changed. Refresh before saving.');
   const next={...content,visibility:{...content.visibility}};
   for(const field of active.fields){next[field.name]=form.elements[field.name].value.trim();const share=fields.querySelector('[data-content-share="'+field.name+'"]');if(share)next.visibility[field.name]=share.checked;}
   if(active.id==='spotlight'&&next.spotlight_release&&!releases.some(record=>record.id===next.spotlight_release))throw Error('Choose one of your released recordings.');
   if(next.spotlight_start&&next.spotlight_end&&next.spotlight_end<next.spotlight_start)throw Error('Choose an end date after the start date.');
   const result=await client.rpc('studio_save_artist_content',{value:next});if(result.error)throw Error('Artist content could not be saved. Try again.');
   content=next;preview();dialog.close();showSaveConfirmation(active.title+' saved.');
  }catch(problem){error.textContent=problem.message;}finally{save.disabled=false;}
 };
}
