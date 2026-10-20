import schema from '../content/metadata.json';
import {artistMetadata,releaseMetadata} from './metadata-values.js';
function values(root,definitions){return Object.fromEntries(definitions.map(field=>{const input=root.querySelector(`[name="${field.name}"]`);return [field.name,field.type==='checkbox'?input.checked:input.value];}));}
function populate(root,definitions,data={}){for(const field of definitions){const input=root.querySelector(`[name="${field.name}"]`);if(field.type==='checkbox')input.checked=data[field.name]===true;else input.value=data[field.name]??(field.options?.[0]||'');}}
const visibilityValues=root=>Object.fromEntries([...root.querySelectorAll('[data-visibility-key]')].map(input=>[input.dataset.visibilityKey,input.checked?'public':'private']));
function populateVisibility(root,data={}){root.querySelectorAll('[data-visibility-key]').forEach(input=>input.checked=data[input.dataset.visibilityKey]==='public');}
async function identity(client,resolveUser,expected){const user=await resolveUser(client);if(!user||expected&&user.id!==expected)throw Error('Your session changed. Sign in again.');return user;}
export async function bindArtistMetadata({client,config,resolveUser}){
  const view=document.querySelector('[data-artist-metadata]');if(!view||!client)return;
  const status=view.querySelector('[data-metadata-status]'),form=view.querySelector('form'),button=form.querySelector('[type=submit]');
  let user;try{user=await identity(client,resolveUser);}catch{return;}
  view.hidden=false;
  if(!config.workspace.metadata){button.disabled=true;status.textContent='Catalogue draft storage is being prepared. It is not available yet.';return;}
  try{const result=await client.from('studio_artist_metadata').select('metadata').eq('account_id',user.id).maybeSingle();if(result.error)throw result.error;populate(form,schema.artist.groups.flatMap(group=>group.fields),result.data?.metadata);populateVisibility(form,result.data?.metadata?.visibility);}
  catch{button.disabled=true;status.textContent='Catalogue information could not be loaded. Refresh before editing.';return;}
  form.addEventListener('submit',async event=>{event.preventDefault();button.disabled=true;try{await identity(client,resolveUser,user.id);const metadata=artistMetadata({...values(form,schema.artist.groups.flatMap(group=>group.fields)),visibility:visibilityValues(form)},schema);const exists=await client.from('studio_artist_metadata').select('account_id').eq('account_id',user.id).maybeSingle();if(exists.error)throw exists.error;const result=exists.data?await client.from('studio_artist_metadata').update({metadata}).eq('account_id',user.id):await client.from('studio_artist_metadata').insert({account_id:user.id,metadata});if(result.error)throw Error('Catalogue information could not be saved. Please try again.');status.textContent='Catalogue information and visibility saved. Public selections require approval.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}});
}
export async function bindReleaseMetadata({client,config,resolveUser}){
  const view=document.querySelector('[data-release-metadata]');if(!view)return;
  const status=view.querySelector('[data-metadata-status]'),controls=view.querySelector('[data-release-controls]'),guest=view.querySelector('[data-release-guest]');
  if(!client){status.textContent=config.unavailable;guest.hidden=false;return;}
  let user;try{user=await resolveUser(client);if(!user){status.textContent='Sign in to prepare a private release draft.';guest.hidden=false;return;}}catch{status.textContent='Your account could not be checked. Refresh to retry.';return;}
  if(!config.workspace.metadata){status.textContent='Release metadata storage is being prepared. No draft has been saved or submitted.';return;}
  const form=view.querySelector('form'),tracks=view.querySelector('[data-tracks]'),picker=view.querySelector('[data-draft-picker]');let current=null,dirty=false,busy=false,records=[];
  const renumber=()=>{[...tracks.children].forEach((track,index)=>{track.querySelector('[data-track-heading]').textContent='Track '+(index+1);track.querySelector('[data-remove-track]').disabled=tracks.children.length===1;});};
  const addPerson=(track,data={})=>{const list=track.querySelector('[data-contributors]');if(list.children.length>=schema.release.maxContributors)return;const row=view.querySelector('[data-contributor-template]').content.firstElementChild.cloneNode(true);row.querySelector('input').value=data.name||'';row.querySelector('select').value=data.role||schema.release.roles[0];list.append(row);};
  const addTrack=(data={})=>{if(tracks.children.length>=schema.release.maxTracks)return;const track=view.querySelector('[data-track-template]').content.firstElementChild.cloneNode(true);populate(track,schema.release.trackFields,data);for(const person of data.contributors||[])addPerson(track,person);tracks.append(track);renumber();};
  const load=data=>{if(data)data=releaseMetadata(data,schema);populate(form,schema.release.fields,data);populate(view.querySelector('[data-release-links]'),schema.release.linkFields,data?.links);populateVisibility(form,data?.visibility);tracks.replaceChildren();for(const track of data?.tracks||[{}])addTrack(track);dirty=false;};
  const list=async()=>{const result=await client.from('studio_release_drafts').select('id,title').eq('account_id',user.id).order('created_at',{ascending:false}).limit(100);if(result.error)throw result.error;records=result.data;picker.replaceChildren(new Option('New release',''),...records.map(row=>new Option(row.title,row.id)));picker.value=current||'';};
  try{await list();load();controls.hidden=false;status.textContent='Private drafts only. Nothing is delivered or published.';}catch{status.textContent='Your drafts could not be loaded. Refresh to retry.';return;}
  form.addEventListener('input',()=>dirty=true);
  const canLeave=()=>!busy&&(!dirty||window.confirm('Discard unsaved changes to this draft?'));
  picker.addEventListener('change',async()=>{if(!canLeave()){picker.value=current||'';return;}const next=picker.value||null;busy=true;controls.inert=true;try{await identity(client,resolveUser,user.id);let data;if(next){const result=await client.from('studio_release_drafts').select('metadata').eq('account_id',user.id).eq('id',next).single();if(result.error)throw result.error;data=result.data.metadata;}load(data);current=next;}catch{picker.value=current||'';status.textContent='This draft could not be opened. Your current work has not been replaced.';}finally{busy=false;controls.inert=false;}});
  view.querySelector('[data-new-draft]').addEventListener('click',()=>{if(!canLeave())return;current=null;picker.value='';load();});
  view.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||busy)return;
    if(button.matches('[data-add-track]')){addTrack();dirty=true;}
    if(button.matches('[data-remove-track]')&&tracks.children.length>1){button.closest('[data-track]').remove();renumber();dirty=true;}
    if(button.matches('[data-add-contributor]')){addPerson(button.closest('[data-track]'));dirty=true;}
    if(button.matches('[data-remove-contributor]')){button.closest('.studio-contributor').remove();dirty=true;}
  });
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;busy=true;const save=form.querySelector('[type=submit]');save.disabled=true;
    try{await identity(client,resolveUser,user.id);const data=values(form,schema.release.fields);data.visibility=visibilityValues(form);data.links=values(view.querySelector('[data-release-links]'),schema.release.linkFields);data.tracks=[...tracks.children].map(track=>({...values(track,schema.release.trackFields),contributors:[...track.querySelector('[data-contributors]').children].map(row=>({name:row.querySelector('input').value,role:row.querySelector('select').value}))}));const metadata=releaseMetadata(data,schema);const query=current?client.from('studio_release_drafts').update({title:metadata.title,metadata}).eq('account_id',user.id).eq('id',current):client.from('studio_release_drafts').insert({account_id:user.id,title:metadata.title,metadata});const result=await query.select('id').single();if(result.error)throw Error('Your draft could not be saved. Please try again.');current=result.data.id;dirty=false;await list();status.textContent='Release draft and visibility saved. Nothing is submitted or published until approved.';}catch(error){status.textContent=error.message;}finally{busy=false;save.disabled=false;}
  });
}
