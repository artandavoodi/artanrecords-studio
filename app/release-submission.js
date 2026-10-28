import {Upload} from 'tus-js-client';
import rules from '../content/release-submission.json';
import {inspectMaster} from './release-audio-values.js';
import {showArtistSaveConfirmation} from './artist-save.js';
export function bindReleaseSubmission(view,{client,config,user,resolveUser,getDraft,isDirty}){
 const root=view.querySelector('[data-release-submission]'),history=root.querySelector('[data-submission-history]'),status=root.querySelector('[data-submission-status]');let assets=[],busy=false;
 const partnershipLabel=document.createElement('label'),partnership=document.createElement('input'),partnershipText=document.createElement('span');partnershipLabel.className='studio-sharing';partnership.type='checkbox';partnership.dataset.submitPartnership='';partnershipText.textContent=rules.partnershipDeclaration;partnershipLabel.append(partnership,partnershipText);root.querySelector('[data-submit-release]').before(partnershipLabel);
 const identity=async()=>{if((await resolveUser(client))?.id!==user.id)throw Error('Your session changed. Sign in again.');};
 const refresh=async()=>{
  const draft=getDraft();assets=[];history.replaceChildren();if(!draft){status.textContent='Save your release draft before uploading masters or submitting.';renderMasters();return;}
  const [files,submissions]=await Promise.all([client.from('studio_release_assets').select('id,track_id,details,path,created_at').eq('account_id',user.id).eq('draft_id',draft).order('created_at',{ascending:false}),client.from('studio_release_submissions').select('id,revision,status,requested_tier,decision_note,submitted_at').eq('account_id',user.id).eq('draft_id',draft).order('revision',{ascending:false})]);await identity();if(getDraft()!==draft)return;
  if(files.error||submissions.error)throw Error('Release submissions could not be loaded. Your private draft is unchanged.');assets=files.data||[];
  for(const record of submissions.data||[]){const card=document.createElement('article'),heading=document.createElement('h3'),detail=document.createElement('p'),note=document.createElement('p');heading.textContent='Submission '+record.revision+' · '+record.status.replaceAll('_',' ');detail.textContent=new Date(record.submitted_at).toLocaleString()+' · Requested '+record.requested_tier;note.textContent=record.decision_note;card.append(heading,detail,note);history.append(card);}status.textContent='Masters and submissions stay private. Acceptance is not a signed agreement or distribution.';renderMasters();
 };
 const upload=async(track,file,feedback)=>{
  if(busy)return;if(!getDraft()||isDirty())throw Error('Save your latest release and track changes before uploading a master.');
  busy=true;view.dataset.masterUploading='true';view.querySelector('[data-release-controls]').inert=true;
  try{
   const draft=getDraft(),tracks=[...view.querySelectorAll('[data-track]')],number=tracks.indexOf(track)+1,info=await inspectMaster(file);await identity();const session=await client.auth.getSession(),token=session.data.session?.access_token;if(!token)throw Error('Sign in again.');const path=user.id+'/'+draft+'/'+crypto.randomUUID()+(info.type==='audio/flac'?'.flac':'.wav');
   const endpoint=new URL('/storage/v1/upload/resumable',config.supabase.url);endpoint.hostname=endpoint.hostname.replace('.supabase.co','.storage.supabase.co');
   await new Promise((resolve,reject)=>{const task=new Upload(file,{endpoint:endpoint.href,headers:{authorization:'Bearer '+token,apikey:config.supabase.publishableKey,'x-upsert':'false'},chunkSize:6*1024*1024,retryDelays:[0,3000,5000,10000,20000],uploadDataDuringCreation:true,storeFingerprintForResuming:false,removeFingerprintOnSuccess:true,metadata:{bucketName:rules.bucket,objectName:path,contentType:info.type,cacheControl:'0'},onProgress:(sent,total)=>feedback.textContent='Uploading master · '+Math.round(sent/total*100)+'%',onError:()=>reject(Error('Master upload failed. Check the project’s file-size and storage limits, then retry.')),onSuccess:()=>resolve()});task.start();});
   await identity();if(getDraft()!==draft)throw Error('The active release changed. Reopen the saved release to check its files.');
   const registered=await client.rpc('studio_register_master',{draft,track:number,object_path:path,info});if(registered.error)throw Error('The upload finished but could not be attached. Do not submit until the master appears as saved.');await refresh();showArtistSaveConfirmation('Master uploaded privately.');
  }finally{busy=false;delete view.dataset.masterUploading;view.querySelector('[data-release-controls]').inert=false;}
 };
 function renderMasters(){
  for(const track of view.querySelectorAll('[data-track]')){
   let mount=track.querySelector('[data-track-master]');if(!mount){mount=document.createElement('section');mount.dataset.trackMaster='';track.append(mount);}mount.replaceChildren();const title=document.createElement('h4'),feedback=document.createElement('p'),input=document.createElement('input'),choose=document.createElement('button'),icon=document.createElement('img');title.textContent='Final master';feedback.setAttribute('role','status');const asset=assets.find(asset=>asset.track_id===track.dataset.trackId);feedback.textContent=asset?asset.details.name+' · '+asset.details.sampleRate+' Hz · '+asset.details.bitDepth+'-bit':'No saved master for this track.';input.type='file';input.accept='.wav,.flac,audio/wav,audio/flac';input.hidden=true;choose.type='button';choose.className='ui-button';icon.className='studio-icon';icon.src='/app/icons/upload.svg';icon.alt='';choose.append(icon,document.createTextNode(asset?'Replace master':'Upload master'));choose.onclick=()=>{if(!getDraft()||isDirty()){feedback.textContent='Save this release before choosing a master.';return;}input.click();};input.onchange=async()=>{const file=input.files[0];input.value='';if(!file)return;choose.disabled=true;try{await upload(track,file,feedback);}catch(error){feedback.textContent=error.message;}finally{choose.disabled=false;}};mount.append(title,feedback,choose,input);
  }
 }
 root.querySelector('[data-submit-release]').onclick=async()=>{
  if(busy||isDirty()||!getDraft()){status.textContent='Save all draft changes and finish uploads before submitting.';return;}
  if(!root.querySelector('[data-submission-rights]').checked){status.textContent='Confirm that you have permission to submit this work.';return;}
  if(!window.confirm('Submit this saved version for label review? It will not publish music, approve a tier, sign a contract or charge a fee.'))return;
  const button=root.querySelector('[data-submit-release]');button.disabled=true;
  try{await identity();const response=await client.rpc('studio_submit_release',{draft:getDraft(),tier:root.querySelector('[data-submission-tier]').value,rights_confirmed:true,apply_partnership:partnership.checked});if(response.error)throw Error(response.error.message||'The submission was not saved. Check every track master and the cover artwork.');await refresh();showArtistSaveConfirmation('Release submitted for label review.');}catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 };
 return {get busy(){return busy;},renderMasters,refresh:()=>refresh().catch(error=>status.textContent=error.message)};
}
