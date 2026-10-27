import config from '../assets/data/artists/editor.json';
import {validArtistDesign} from '../assets/js/layers/site/artist-design.js';
import {showArtistSaveConfirmation} from './artist-save.js';
import {bindReorderList} from './neuroartan/assets/js/core/02-systems/reorder-list.js';
import {navigationLinks} from './artist-navigation-values.js';
import editor from '../content/editor.json';
export function validEditorDraft(draft){
 return validArtistDesign(draft,config);
}
export async function bindArtistEditor({client,resolveUser}){
 const root=document.querySelector('[data-artist-editor]');if(!root)return;
 const focus=root.querySelector('[data-editor-focus]'),tools=root.querySelector('[data-editor-tools]'),panel=root.querySelector('.studio-editor-controls');
 const profileTools=root.querySelector('[data-editor-profile-tools]'),designTools=root.querySelector('[data-editor-design-tools]');
 const portfolioTools=[...root.querySelectorAll('[data-editor-portfolio-tools]')],releaseLink=root.querySelector('[data-editor-release-link]');
 const resetContext=()=>{portfolioTools.forEach(item=>item.hidden=true);releaseLink.hidden=true;};
 const showContext=target=>{
  resetContext();setTools(true);
  root.querySelector('.studio-editor-tool-navigation').hidden=target!=='name';root.querySelector('[data-editor-context-back]').hidden=target==='name';
  root.querySelector('[data-editor-selection]').hidden=target==='name';
  for(const action of root.querySelectorAll('[data-editor-profile-open],[data-editor-open-portfolio]'))action.hidden=target!=='name';
  const selectedDesign=({buttons:'[data-editor-buttons]',links:'[data-editor-links]',footer:'[data-editor-footer]'})[target];for(const child of designTools.children)child.hidden=Boolean(selectedDesign)&&!child.matches(selectedDesign);
  designTools.dataset.overview=String(!selectedDesign);
  profileTools.querySelector('[data-artist-navigation]').hidden=target!=='menu';profileTools.querySelector('[data-artist-pages]').hidden=target!=='pages';
  for(const button of root.querySelectorAll('[data-editor-context]'))button.setAttribute('aria-pressed',String(button.dataset.editorContext===target));
  const profile=['biography','connections','menu','pages'].includes(target);
  profileTools.hidden=!profile;designTools.hidden=profile||['gallery','project','latest','archive'].includes(target);
  root.querySelector('[data-editor-selection]').textContent=({name:'Design',biography:'Profile',menu:'Menu',pages:'Pages',footer:'Footer & copyright',buttons:'Main buttons',links:'Streaming & social order'})[target]||config.sections.find(item=>item.id===target)?.label||'Page design';
  panel.getBoundingClientRect();
  if(profile){const tab=['menu','footer','pages'].includes(target)?'profile-website':target==='connections'?'profile-catalogue':'profile-details';profileTools.querySelector('[data-settings-tab="'+tab+'"]').click();profileTools.querySelector('[data-settings-panel="'+tab+'"] '+(target==='pages'?'[data-site-page-new]':target==='biography'?'[name=biography]':target==='footer'?'[name=footer_text]':'input'))?.focus();}
  else{const portfolio=portfolioTools.find(item=>item.dataset.editorPortfolioTools===target);if(portfolio){portfolio.hidden=false;portfolio.querySelector('button,input,a')?.focus();}else if(['latest','archive'].includes(target)){releaseLink.hidden=false;releaseLink.focus();}else root.querySelector(target==='buttons'?'[data-editor-button-label]':target==='footer'?'[data-editor-copyright]':target==='links'?'[data-editor-link-order] button':'[data-editor-font-select]')?.focus();}
 };
 const layout=root.querySelector('.studio-editor-layout');
 const resize=document.createElement('div');resize.className='studio-editor-resize';resize.tabIndex=0;resize.setAttribute('role','separator');resize.setAttribute('aria-label','Resize design tools');resize.setAttribute('aria-orientation','vertical');layout.append(resize);
 const limits=()=>{const minimum=Math.min(layout.clientWidth,editor.views.find(view=>view.id==='mobile').width),maximum=Math.max(minimum,layout.clientWidth/2),step=parseFloat(getComputedStyle(panel).rowGap);return {minimum,maximum,step};};
 const setWidth=width=>{const {minimum,maximum}=limits(),next=Math.max(minimum,Math.min(maximum,width));layout.style.setProperty('--studio-editor-panel-width',next+'px');resize.setAttribute('aria-valuemin',String(minimum));resize.setAttribute('aria-valuemax',String(Math.round(maximum)));resize.setAttribute('aria-valuenow',String(Math.round(next)));};
 // Match the shared rail's magnetic threshold; never squeeze the open controls.
 const dragWidth=width=>{const {minimum,step}=limits();if(width<minimum-step*2){setTools(false);tools.focus({preventScroll:true});return;}setWidth(width);};
 resize.addEventListener('pointerdown',event=>{if(event.button!==0||!matchMedia('(min-width:1025px) and (pointer:fine)').matches)return;event.preventDefault();resize.setPointerCapture(event.pointerId);layout.dataset.resizing='true';const start=event.clientX,width=panel.getBoundingClientRect().width;const move=event=>{if(layout.dataset.toolsOpen==='true')dragWidth(width+start-event.clientX);};const end=()=>{delete layout.dataset.resizing;resize.removeEventListener('pointermove',move);resize.removeEventListener('pointerup',end);resize.removeEventListener('pointercancel',end);resize.removeEventListener('lostpointercapture',end);};resize.addEventListener('pointermove',move);resize.addEventListener('pointerup',end);resize.addEventListener('pointercancel',end);resize.addEventListener('lostpointercapture',end);});
 resize.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const {minimum,step}=limits(),width=panel.getBoundingClientRect().width;if(event.key==='ArrowRight'&&width<=minimum){setTools(false);tools.focus({preventScroll:true});}else setWidth(width+(event.key==='ArrowLeft'?step:-step));});
 let drawerVersion=0;
 const setTools=open=>{
  const version=++drawerVersion;delete layout.dataset.resizing;
  if(open){panel.hidden=false;if(panel.inert)panel.inert=false;panel.removeAttribute('aria-hidden');if(matchMedia('(min-width:1025px)').matches)setWidth(parseFloat(layout.style.getPropertyValue('--studio-editor-panel-width'))||panel.getBoundingClientRect().width);}
  // Establish the current position before changing tracks, including on reversal.
  panel.getBoundingClientRect();layout.dataset.toolsOpen=String(open);tools.setAttribute('aria-expanded',String(open));
  if(!open){panel.inert=true;panel.setAttribute('aria-hidden','true');panel.getBoundingClientRect();Promise.all([...layout.getAnimations(),...panel.getAnimations()].map(animation=>animation.finished.catch(()=>{}))).then(()=>{if(version===drawerVersion&&layout.dataset.toolsOpen!=='true')panel.hidden=true;});}
 };
 const setFocus=active=>{root.dataset.focus=String(active);focus.setAttribute('aria-pressed',String(active));focus.setAttribute('aria-label',active?'Exit focus mode':'Enter focus mode');focus.title=focus.getAttribute('aria-label');};
 for(const button of root.querySelectorAll('[data-editor-context]'))button.onclick=()=>showContext(button.dataset.editorContext);
 focus.addEventListener('click',()=>setFocus(root.dataset.focus!=='true'));
 tools.addEventListener('click',()=>{const opening=layout.dataset.toolsOpen!=='true';if(opening)showContext('name');else setTools(false);});
 root.querySelector('[data-editor-context-back]').onclick=()=>showContext('name');
 root.querySelector('[data-editor-panel-close]').addEventListener('click',()=>{showContext('name');setTools(false);tools.focus();});
 root.querySelector('[data-editor-profile-open]').addEventListener('click',()=>showContext('biography'));
 for(const button of root.querySelectorAll('[data-editor-open-portfolio]'))button.addEventListener('click',()=>{resetContext();profileTools.hidden=true;designTools.hidden=true;portfolioTools.find(item=>item.dataset.editorPortfolioTools===button.dataset.editorOpenPortfolio).hidden=false;setTools(true);});
 document.addEventListener('keydown',event=>{if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;if(!panel.hidden){setTools(false);tools.focus();}else setFocus(false);});
 const status=root.querySelector('[data-editor-status]'),frame=root.querySelector('iframe'),controls=[...root.querySelectorAll('[data-editor-focus],[data-editor-tools],[data-editor-font-select],[data-editor-size],[data-editor-ribbon],[data-editor-section],[data-editor-reset],[data-editor-profile-open],[data-editor-presentation] input,[data-editor-presentation] select,[data-editor-presentation] button')];controls.forEach(item=>item.disabled=true);
 const canvas=root.querySelector('.studio-editor-canvas'),viewport=root.querySelector('.studio-editor-viewport');let device=editor.views[0];
 const measurePreview=()=>{const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)return;const scale=Math.min(1,width/device.width);viewport.style.setProperty('--preview-width',device.width+'px');viewport.style.setProperty('--preview-height',height/scale+'px');viewport.style.setProperty('--preview-scale',String(scale));viewport.style.setProperty('--preview-offset',Math.max(0,(width-device.width*scale)/2)+'px');};
 const observer=new ResizeObserver(measurePreview);observer.observe(canvas);
 for(const button of root.querySelectorAll('[data-editor-view]'))button.onclick=()=>{device=editor.views.find(item=>item.id===button.dataset.editorView);for(const item of root.querySelectorAll('[data-editor-view]'))item.setAttribute('aria-pressed',String(item===button));measurePreview();};
 if(!client)return;
 const owner=await resolveUser(client).catch(()=>null);if(!owner)return;
 const response=await client.from('studio_artist_handles').select('approved_username').eq('account_id',owner.id).maybeSingle();
 if((await resolveUser(client).catch(()=>null))?.id!==owner.id)return;
 const username=response.data?.approved_username;
 if(response.error||!username||!/^[a-z0-9][a-z0-9.]{1,30}[a-z0-9]$/.test(username)){status.textContent='An approved username and published artist page are needed for the design preview.';return;}
 const local=location.hostname==='127.0.0.1';
 const url=new URL('/'+encodeURIComponent(username)+'/',local?'http://127.0.0.1:8912':'https://artanrecords.com');url.searchParams.set('editor-preview','1');
 const initial=()=>({font:config.fonts[0].id,size:'standard',ribbon:null,sections:config.sections.map(item=>item.id),order:config.sections.map(item=>item.id),linkOrder:{},dividers:[],buttons:[{label:'Releases',url:'#artist-releases'}],copyright:''});
 let draft=initial(),ready=false;
 const defaultPresentation=()=>({portraitSize:config.presentation.portrait.default,portraitAlign:'left',biographyLabel:true,since:true,textSize:'small'});
 let storageReady=false;
 const save=root.querySelector('[data-editor-save]'),publish=root.querySelector('[data-editor-publish]');
 try{const result=await client.from('studio_artist_designs').select('draft,published_design').eq('account_id',owner.id).eq('surface','website').maybeSingle();if(result.error)throw result.error;if(validEditorDraft(result.data?.draft))draft=result.data.draft;storageReady=true;}catch{status.textContent='Design storage is unavailable. You can preview changes, but saving and publishing are disabled.';}
 const workingKey='artanrecords-editor:'+owner.id;
 try{const working=JSON.parse(sessionStorage.getItem(workingKey));if(validEditorDraft(working))draft=working;}catch{}
 const persist=async publishing=>{
  if(!storageReady||!validEditorDraft(draft)||(publishing&&!config.publicationEnabled))return;
  save.disabled=publish.disabled=true;
  try{if((await resolveUser(client))?.id!==owner.id)throw Error('Your session changed. Refresh before saving.');const snapshot=structuredClone(draft),next={account_id:owner.id,surface:'website',draft:snapshot,updated_at:new Date().toISOString()};if(publishing)next.published_design=snapshot;const result=await client.from('studio_artist_designs').upsert(next,{onConflict:'account_id,surface'});if(result.error)throw Error('Your design could not be saved. Please try again.');showArtistSaveConfirmation(publishing?'Artist design published.':'Design draft saved privately.');}
  catch(error){status.classList.remove('sr-only');status.textContent=error.message;}
  finally{save.disabled=publish.disabled=false;}
 };
 save.onclick=()=>persist(false);publish.onclick=()=>persist(true);
 const send=()=>{if(!validEditorDraft(draft))return;try{sessionStorage.setItem(workingKey,JSON.stringify(draft));}catch{}if(ready)frame.contentWindow.postMessage({type:'artanrecords:artist-preview',draft},url.origin);};
 const sync=()=>{
  const presentation=draft.presentation||defaultPresentation();
  for(const select of root.querySelectorAll('[data-editor-align]'))select.value=presentation[select.dataset.editorAlign]||'left';root.querySelector('[data-editor-logo-size]').value=presentation.logoSize||config.presentation.portrait.max;root.querySelector('[data-editor-logo-output]').textContent=(presentation.logoSize||config.presentation.portrait.max)+' px';
  root.querySelector('[data-editor-portrait-size]').value=presentation.portraitSize;root.querySelector('[data-editor-portrait-output]').textContent=presentation.portraitSize+' px';root.querySelector('[data-editor-portrait-align]').value=presentation.portraitAlign;root.querySelector('[data-editor-detail-size]').value=presentation.textSize;
  root.querySelector('[data-editor-biography-label]').setAttribute('aria-pressed',String(presentation.biographyLabel));root.querySelector('[data-editor-since]').setAttribute('aria-pressed',String(presentation.since));
  root.querySelector('[data-editor-font-select]').value=draft.font;
  for(const button of root.querySelectorAll('[data-editor-size]'))button.setAttribute('aria-pressed',String(button.dataset.editorSize===draft.size));
  for(const button of root.querySelectorAll('[data-editor-section]'))button.setAttribute('aria-pressed',String(draft.sections.includes(button.dataset.editorSection)));
  for(const button of root.querySelectorAll('[data-editor-divider]'))button.setAttribute('aria-pressed',String((draft.dividers||[]).includes(button.dataset.editorDivider)));
  for(const [index,row] of [...root.querySelectorAll('[data-editor-button-row]')].entries()){row.querySelector('[data-editor-button-label]').value=draft.buttons?.[index]?.label||'';row.querySelector('[data-editor-button-url]').value=draft.buttons?.[index]?.url||'';}
  root.querySelector('[data-editor-copyright]').value=draft.copyright||'';
  const list=root.querySelector('[data-editor-section-order]');for(const id of draft.order||config.sections.map(item=>item.id)){const row=list.querySelector('[data-reorder-id="'+id+'"]');if(row)list.append(row);}
  root.querySelector('[data-editor-ribbon]').value=draft.ribbon||'#000000';send();
 };
 addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==url.origin)return;
  if(event.data?.type==='artanrecords:artist-menu-order'&&Array.isArray(event.data.links)){document.dispatchEvent(new CustomEvent('studio:artist-menu-order',{detail:event.data.links}));showContext('menu');}
  if(event.data?.type==='artanrecords:artist-preview-ready'){const first=!ready;ready=true;controls.forEach(item=>item.disabled=false);save.disabled=publish.disabled=!storageReady;status.textContent=storageReady?'Preview ready.':'Preview ready. Design storage is unavailable; saving and publishing are disabled.';status.classList.toggle('sr-only',storageReady);if(first){setFocus(true);setTools(false);}sync();renderLinkOrder(event.data.links);const target=new URL(location.href).searchParams.get('tool');if(first&&['name','menu','footer','buttons','links',...config.sections.map(item=>item.id)].includes(target))showContext(target);}
  if(event.data?.type==='artanrecords:artist-preview-select'&&['name','menu','footer','buttons',...config.sections.map(item=>item.id)].includes(event.data.target))showContext(event.data.target);
 });
 root.querySelector('[data-editor-font-select]').addEventListener('change',event=>{draft.font=event.target.value;sync();});
 const updatePresentation=(key,value)=>{draft.presentation={...(draft.presentation||defaultPresentation()),[key]:value};sync();};
 root.querySelector('[data-editor-portrait-size]').oninput=event=>updatePresentation('portraitSize',Number(event.target.value));
 root.querySelector('[data-editor-portrait-align]').onchange=event=>updatePresentation('portraitAlign',event.target.value);
 root.querySelector('[data-editor-detail-size]').onchange=event=>updatePresentation('textSize',event.target.value);
 for(const select of root.querySelectorAll('[data-editor-align]'))select.onchange=()=>updatePresentation(select.dataset.editorAlign,select.value);
 root.querySelector('[data-editor-logo-size]').oninput=event=>updatePresentation('logoSize',Number(event.target.value));
 root.querySelector('[data-editor-biography-label]').onclick=()=>updatePresentation('biographyLabel',!(draft.presentation||defaultPresentation()).biographyLabel);
 root.querySelector('[data-editor-since]').onclick=()=>updatePresentation('since',!(draft.presentation||defaultPresentation()).since);
 for(const button of root.querySelectorAll('[data-editor-size]'))button.addEventListener('click',()=>{draft.size=button.dataset.editorSize;sync();});
 root.querySelector('[data-editor-ribbon]').addEventListener('input',event=>{draft.ribbon=event.target.value;send();});
 for(const button of root.querySelectorAll('[data-editor-section]'))button.addEventListener('click',()=>{const id=button.dataset.editorSection;draft.sections=draft.sections.includes(id)?draft.sections.filter(item=>item!==id):[...draft.sections,id];sync();});
 for(const button of root.querySelectorAll('[data-editor-divider]'))button.onclick=()=>{const id=button.dataset.editorDivider;draft.dividers=(draft.dividers||[]).includes(id)?draft.dividers.filter(item=>item!==id):[...(draft.dividers||[]),id];sync();};
 const updateButtons=()=>{const feedback=root.querySelector('[data-editor-button-status]');try{const buttons=navigationLinks([...root.querySelectorAll('[data-editor-button-row]')].map(row=>({label:row.querySelector('[data-editor-button-label]').value,url:row.querySelector('[data-editor-button-url]').value})));const next={...draft,buttons};save.disabled=publish.disabled=!storageReady||!validEditorDraft(next);if(validEditorDraft(next)){draft=next;send();feedback.textContent='';}}catch(error){save.disabled=publish.disabled=true;feedback.textContent=error.message;}};
 for(const input of root.querySelectorAll('[data-editor-button-row] input'))input.oninput=updateButtons;
 root.querySelector('[data-editor-copyright]').oninput=event=>{draft.copyright=event.target.value;send();};
 root.querySelector('[data-editor-reset]').addEventListener('click',()=>{draft=initial();sync();});
 bindReorderList(root.querySelector('[data-editor-section-order]'),{rowSelector:'[data-reorder-id]',handleSelector:'[data-reorder-handle]',onChange:rows=>{draft.order=rows.map(row=>row.dataset.reorderId);send();}});
 function renderLinkOrder(groups){
  if(!Array.isArray(groups)||groups.length>6)return;const mount=root.querySelector('[data-editor-link-order]');mount.replaceChildren();
  for(const group of groups){if(!/^[a-z_]+$/.test(group.id)||typeof group.label!=='string'||!Array.isArray(group.items)||group.items.length>40)continue;const heading=document.createElement('h3'),list=document.createElement('div');heading.textContent=group.label;mount.append(heading,list);
   const ranked=[...group.items].sort((a,b)=>{const order=draft.linkOrder?.[group.id]||[];return (order.indexOf(a.id)<0?99:order.indexOf(a.id))-(order.indexOf(b.id)<0?99:order.indexOf(b.id));});
   for(const item of ranked){if(!/^[a-z_]+$/.test(item.id)||typeof item.label!=='string')continue;const row=document.createElement('div'),handle=document.createElement('button'),image=document.createElement('img'),label=document.createElement('span');row.draggable=true;row.dataset.reorderId=item.id;handle.type='button';handle.dataset.reorderHandle='';handle.className='ui-reorder-handle';handle.setAttribute('aria-label','Reorder '+item.label);image.src='/app/neuroartan/registry/icons/public/assets/core/actions/drag/drag.svg';image.className='studio-icon';image.alt='';handle.append(image);label.textContent=item.label;row.append(handle,label);list.append(row);}
   bindReorderList(list,{rowSelector:'[data-reorder-id]',handleSelector:'[data-reorder-handle]',onChange:rows=>{draft.linkOrder={...(draft.linkOrder||{}),[group.id]:rows.map(row=>row.dataset.reorderId)};send();}});
  }
 }
 document.addEventListener('studio:artist-saved',()=>{frame.src=url.href;});
 frame.src=url.href;frame.hidden=false;root.querySelector('[data-editor-empty]').hidden=true;status.textContent='Opening your public page preview. If it does not load, check that your artist page is published.';
}
