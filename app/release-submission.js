import {Upload} from 'tus-js-client';
import rules from '../content/release-submission.json';
import {inspectMaster} from './release-audio-values.js';
import {showArtistSaveConfirmation} from './artist-save.js';
export function bindReleaseSubmission(view,{client,config,user,resolveUser,getDraft,isDirty,getArtwork}){
 const root=view.querySelector('[data-release-submission]'),history=root.querySelector('[data-submission-history]'),status=root.querySelector('[data-submission-status]'),submit=root.querySelector('[data-submit-release]'),submitLabel=submit.querySelector('[data-submit-release-label]'),refreshButton=root.querySelector('[data-refresh-submissions]'),readiness=root.querySelector('[data-submission-readiness]');let assets=[],busy=false,pending=false,refreshing=false,verified=false,turn=0;
 const nextAction=()=>!getDraft()||isDirty()?rules.readiness.save:!getArtwork()?.path?rules.readiness.artwork:[...view.querySelectorAll('[data-track]')].some(track=>!assets.some(asset=>asset.track_id===track.dataset.trackId))?rules.readiness.masters:!root.querySelector('[data-submission-rights]').checked?rules.readiness.permission:rules.readiness.ready;
 const sync=()=>{submit.disabled=busy||refreshing||pending||Boolean(getDraft()&&!verified);refreshButton.disabled=busy||refreshing;submitLabel.textContent=pending?rules.pendingLabel:rules.submit;readiness.classList.toggle('studio-loading-status',busy||refreshing);if(busy||refreshing){readiness.innerHTML='<span class="ui-loader-circle" aria-hidden="true"></span>';readiness.setAttribute('aria-label','Updating release');}else{readiness.removeAttribute('aria-label');readiness.textContent=!verified&&getDraft()?'Refresh the release status before submitting.':pending?rules.pendingNotice:nextAction();}};
 view.addEventListener('input',sync);root.addEventListener('change',sync);
 const partnershipLabel=document.createElement('label'),partnership=document.createElement('input'),partnershipText=document.createElement('span');partnershipLabel.className='studio-sharing';partnership.type='checkbox';partnership.dataset.submitPartnership='';partnershipText.textContent=rules.partnershipDeclaration;partnershipLabel.append(partnership,partnershipText);root.querySelector('[data-submit-release]').before(partnershipLabel);
 const identity=async()=>{if((await resolveUser(client))?.id!==user.id)throw Error('Your session changed. Sign in again.');};
 const refresh=async()=>{
  const draft=getDraft(),requestTurn=++turn;refreshing=true;verified=false;pending=false;assets=[];history.replaceChildren();refreshButton.disabled=true;sync();
  try{if(!draft){status.textContent='';renderMasters();return;}
  const [files,submissions]=await Promise.all([client.from('studio_release_assets').select('id,track_id,details,path,created_at').eq('account_id',user.id).eq('draft_id',draft).order('created_at',{ascending:false}),client.from('studio_release_submissions').select('id,revision,status,requested_tier,decision_note,submitted_at').eq('account_id',user.id).eq('draft_id',draft).order('revision',{ascending:false})]);await identity();if(getDraft()!==draft||requestTurn!==turn)return;
  if(files.error||submissions.error)throw Error('Release submissions could not be loaded. Your private draft is unchanged.');assets=files.data||[];
  verified=true;pending=(submissions.data||[]).some(record=>['submitted','under_review'].includes(record.status));
  for(const record of submissions.data||[]){const card=document.createElement('article'),heading=document.createElement('h3'),detail=document.createElement('p'),note=document.createElement('p');card.dataset.submissionState=record.status;heading.textContent='Version '+record.revision+' · '+(rules.states[record.status]||'Status unavailable');detail.textContent=new Date(record.submitted_at).toLocaleString()+' · Requested '+record.requested_tier;note.textContent=record.decision_note;card.append(heading,detail);if(record.decision_note)card.append(note);history.append(card);}status.textContent='';renderMasters();
  }finally{if(requestTurn===turn){refreshing=false;refreshButton.disabled=false;sync();}}
 };
 refreshButton.onclick=()=>refresh().catch(error=>status.textContent=error.message);
 const upload=async(track,file,feedback)=>{
  if(busy)return;if(!getDraft()||isDirty())throw Error('Save your latest release and track changes before uploading a master.');
  busy=true;view.dataset.masterUploading='true';view.querySelector('[data-release-controls]').inert=true;sync();
  try{
   const draft=getDraft(),tracks=[...view.querySelectorAll('[data-track]')],number=tracks.indexOf(track)+1,info=await inspectMaster(file);await identity();const session=await client.auth.getSession(),token=session.data.session?.access_token;if(!token)throw Error('Sign in again.');const path=user.id+'/'+draft+'/'+crypto.randomUUID()+(info.type==='audio/flac'?'.flac':'.wav');
   const endpoint=new URL('/storage/v1/upload/resumable',config.supabase.url);endpoint.hostname=endpoint.hostname.replace('.supabase.co','.storage.supabase.co');
   await new Promise((resolve,reject)=>{const task=new Upload(file,{endpoint:endpoint.href,headers:{authorization:'Bearer '+token,apikey:config.supabase.publishableKey,'x-upsert':'false'},chunkSize:6*1024*1024,retryDelays:[0,3000,5000,10000,20000],uploadDataDuringCreation:true,storeFingerprintForResuming:false,removeFingerprintOnSuccess:true,metadata:{bucketName:rules.bucket,objectName:path,contentType:info.type,cacheControl:'0'},onProgress:(sent,total)=>feedback.textContent='Uploading master · '+Math.round(sent/total*100)+'%',onError:()=>reject(Error('Master upload failed. Check the project’s file-size and storage limits, then retry.')),onSuccess:()=>resolve()});task.start();});
   await identity();if(getDraft()!==draft)throw Error('The active release changed. Reopen the saved release to check its files.');
   const registered=await client.rpc('studio_register_master',{draft,track:number,object_path:path,info});if(registered.error)throw Error('The upload finished but could not be attached. Do not submit until the master appears as saved.');await refresh();showArtistSaveConfirmation('Master uploaded privately.');
  }finally{busy=false;delete view.dataset.masterUploading;view.querySelector('[data-release-controls]').inert=false;sync();}
 };
 function renderMasters(){
  for(const track of view.querySelectorAll('[data-track]')){
   let mount=track.querySelector('[data-track-master]');if(!mount){mount=document.createElement('section');mount.dataset.trackMaster='';track.append(mount);}mount.replaceChildren();const title=document.createElement('h4'),feedback=document.createElement('p'),input=document.createElement('input'),choose=document.createElement('button'),icon=document.createElement('img');title.textContent='Final master';feedback.setAttribute('role','status');const asset=assets.find(asset=>asset.track_id===track.dataset.trackId);feedback.textContent=asset?asset.details.name+' · '+asset.details.sampleRate+' Hz · '+asset.details.bitDepth+'-bit':'No saved master for this track.';input.type='file';input.accept='.wav,.flac,audio/wav,audio/flac';input.hidden=true;choose.type='button';choose.className='ui-button';icon.className='studio-icon';icon.src='/app/icons/upload.svg';icon.alt='';choose.append(icon,document.createTextNode(asset?'Replace master':'Upload master'));choose.onclick=()=>{if(!getDraft()||isDirty()){feedback.textContent='Save this release before choosing a master.';return;}input.click();};input.onchange=async()=>{const file=input.files[0];input.value='';if(!file)return;choose.disabled=true;try{await upload(track,file,feedback);}catch(error){feedback.textContent=error.message;}finally{choose.disabled=false;}};mount.append(title,feedback,choose,input);
  }
 }
 root.querySelector('[data-submit-release]').onclick=async()=>{
  if(pending){status.textContent=rules.pendingNotice;return;}
  if(busy||refreshing||isDirty()||!getDraft()){status.textContent='Save all draft changes and finish uploads before submitting.';return;}
  if(!root.querySelector('[data-submission-rights]').checked){status.textContent='Confirm that you have permission to submit this work.';return;}
  if(!getArtwork()?.path){status.textContent=rules.readiness.artwork;return;}
  if([...view.querySelectorAll('[data-track]')].some(track=>!assets.some(asset=>asset.track_id===track.dataset.trackId))){status.textContent=rules.readiness.masters;return;}
  if(!window.confirm('Submit this saved version for label review? It will not publish music, approve a tier, sign a contract or charge a fee.'))return;
  busy=true;view.querySelector('[data-release-controls]').inert=true;sync();let recorded=false;
  try{await identity();const response=await client.rpc('studio_submit_release',{draft:getDraft(),tier:root.querySelector('[data-submission-tier]').value,rights_confirmed:true,apply_partnership:partnership.checked});if(response.error)throw Error(response.error.message||'The submission was not saved. Check every track master and the cover artwork.');recorded=true;pending=true;showArtistSaveConfirmation('Release submitted for label review.');await refresh();}catch(error){if(recorded){pending=true;verified=true;status.textContent='Your release was submitted. Refresh to load its latest status.';}else status.textContent=error.message;}finally{busy=false;view.querySelector('[data-release-controls]').inert=false;sync();}
 };
 return {get busy(){return busy;},sync,renderMasters,refresh:()=>refresh().catch(error=>status.textContent=error.message)};
}
