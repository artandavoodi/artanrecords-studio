import config from '../assets/data/artists/editor.json';
import {validArtistDesign} from '../assets/js/layers/site/artist-design.js';
import {showArtistSaveConfirmation} from './artist-save.js';
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
  const profile=['biography','connections','menu'].includes(target);
  profileTools.hidden=!profile;designTools.hidden=profile||['gallery','project','latest','archive'].includes(target);
  root.querySelector('[data-editor-selection]').textContent=({name:'Artist name',menu:'Menu',footer:'Footer & copyright',buttons:'Main buttons'})[target]||config.sections.find(item=>item.id===target)?.label||'Page design';
  if(profile){const tab=['menu','footer'].includes(target)?'profile-website':target==='connections'?'profile-catalogue':'profile-details';profileTools.querySelector('[data-settings-tab="'+tab+'"]').click();profileTools.querySelector(target==='biography'?'[name=biography]':target==='footer'?'[name=footer_text]':'input')?.focus();}
  else{const portfolio=portfolioTools.find(item=>item.dataset.editorPortfolioTools===target);if(portfolio)portfolio.hidden=false;else if(['latest','archive'].includes(target))releaseLink.hidden=false;else root.querySelector(target==='buttons'?'[data-editor-button-label]':target==='footer'?'[data-editor-copyright]':'[data-editor-font-select]')?.focus();}
 };
 const layout=root.querySelector('.studio-editor-layout');
 const resize=document.createElement('div');resize.className='studio-editor-resize';resize.tabIndex=0;resize.setAttribute('role','separator');resize.setAttribute('aria-label','Resize design tools');resize.setAttribute('aria-orientation','vertical');layout.append(resize);
 const setWidth=width=>{const maximum=layout.clientWidth/2,minimum=Math.min(maximum,panel.scrollWidth*0.65);const next=Math.max(minimum,Math.min(maximum,width));layout.style.setProperty('--studio-editor-panel-width',next+'px');resize.setAttribute('aria-valuenow',String(Math.round(next)));};
 resize.addEventListener('pointerdown',event=>{if(event.button!==0||!matchMedia('(min-width:1025px)').matches)return;event.preventDefault();resize.setPointerCapture(event.pointerId);const move=event=>setWidth(layout.getBoundingClientRect().right-event.clientX);const end=()=>{resize.removeEventListener('pointermove',move);resize.removeEventListener('pointerup',end);resize.removeEventListener('pointercancel',end);};resize.addEventListener('pointermove',move);resize.addEventListener('pointerup',end);resize.addEventListener('pointercancel',end);});
 resize.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();setWidth(panel.getBoundingClientRect().width+(event.key==='ArrowLeft'?1:-1)*parseFloat(getComputedStyle(panel).paddingInlineStart));});
 const setTools=open=>{panel.hidden=!open;layout.dataset.toolsOpen=String(open);tools.setAttribute('aria-expanded',String(open));};
 const setFocus=active=>{root.dataset.focus=String(active);focus.setAttribute('aria-pressed',String(active));focus.lastChild.textContent=active?'Workspace view':'Focus view';};
 focus.addEventListener('click',()=>setFocus(root.dataset.focus!=='true'));
 tools.addEventListener('click',()=>{resetContext();profileTools.hidden=true;designTools.hidden=false;root.querySelector('[data-editor-selection]').textContent='Page design';setTools(panel.hidden);});
 root.querySelector('[data-editor-panel-close]').addEventListener('click',()=>{setTools(false);tools.focus();});
 root.querySelector('[data-editor-profile-open]').addEventListener('click',()=>showContext('biography'));
 const searchDialog=root.querySelector('[data-editor-search-dialog]'),search=root.querySelector('[data-editor-search]'),results=root.querySelector('[data-editor-search-results]');
 const searchItems=[{id:'name',label:'Artist name, font & size'},{id:'buttons',label:'Main buttons & links'},{id:'menu',label:'Menu links'},{id:'footer',label:'Footer & copyright'},...config.sections];
 const searchTools=()=>{results.replaceChildren();const term=search.value.toLocaleLowerCase().trim();for(const item of searchItems){const scope=item.id==='connections'?profileTools.querySelector('[data-settings-panel=profile-catalogue]'):item.id==='menu'?profileTools.querySelector('[data-artist-navigation]'):portfolioTools.find(section=>section.dataset.editorPortfolioTools===item.id);const content=item.id==='biography'?profileTools.querySelector('[name=biography]')?.value||'':item.id==='name'?[profileTools.querySelector('[name=artist_name]')?.value,...config.fonts.map(font=>font.label)].join(' '):scope?[...scope.querySelectorAll('input,textarea')].map(input=>input.value).join(' '):'';if(term&&!`${item.label} ${content}`.toLocaleLowerCase().includes(term))continue;const button=document.createElement('button');button.type='button';button.className='ui-button';button.textContent=item.label;button.onclick=()=>{searchDialog.close();showContext(item.id);};results.append(button);}if(!results.children.length)results.textContent='No matching tools or artist content.';};
 root.querySelector('[data-editor-search-open]').onclick=()=>{searchTools();searchDialog.showModal();search.focus();};
 root.querySelector('[data-editor-search-close]').onclick=()=>searchDialog.close();search.oninput=searchTools;
 for(const button of root.querySelectorAll('[data-editor-open-portfolio]'))button.addEventListener('click',()=>{resetContext();profileTools.hidden=true;designTools.hidden=true;portfolioTools.find(item=>item.dataset.editorPortfolioTools===button.dataset.editorOpenPortfolio).hidden=false;setTools(true);});
 document.addEventListener('keydown',event=>{if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;if(!panel.hidden){setTools(false);tools.focus();}else setFocus(false);});
 const status=root.querySelector('[data-editor-status]'),frame=root.querySelector('iframe'),controls=[...root.querySelectorAll('[data-editor-focus],[data-editor-tools],[data-editor-font-select],[data-editor-size],[data-editor-ribbon],[data-editor-section],[data-editor-reset],[data-editor-profile-open]')];controls.forEach(item=>item.disabled=true);
 if(!client)return;
 const owner=await resolveUser(client).catch(()=>null);if(!owner)return;
 const response=await client.from('studio_artist_handles').select('approved_username').eq('account_id',owner.id).maybeSingle();
 if((await resolveUser(client).catch(()=>null))?.id!==owner.id)return;
 const username=response.data?.approved_username;
 if(response.error||!username||!/^[a-z0-9][a-z0-9.]{1,30}[a-z0-9]$/.test(username)){status.textContent='An approved username and published artist page are needed for the design preview.';return;}
 const local=location.hostname==='127.0.0.1';
 const url=new URL('/'+encodeURIComponent(username)+'/',local?'http://127.0.0.1:8912':'https://artanrecords.com');url.searchParams.set('editor-preview','1');
 const initial=()=>({font:config.fonts[0].id,size:'standard',ribbon:null,sections:config.sections.map(item=>item.id),dividers:[],buttons:[{label:'Releases',url:'#artist-releases'}],copyright:''});
 let draft=initial(),ready=false;
 let storageReady=false;
 const save=root.querySelector('[data-editor-save]'),publish=root.querySelector('[data-editor-publish]');
 try{const result=await client.from('studio_artist_designs').select('draft,published_design').eq('account_id',owner.id).eq('surface','website').maybeSingle();if(result.error)throw result.error;if(validEditorDraft(result.data?.draft))draft=result.data.draft;storageReady=true;}catch{status.textContent='Design storage is unavailable. You can preview changes, but saving and publishing are disabled.';}
 const persist=async publishing=>{
  if(!storageReady||!validEditorDraft(draft)||(publishing&&!config.publicationEnabled))return;
  save.disabled=publish.disabled=true;
  try{if((await resolveUser(client))?.id!==owner.id)throw Error('Your session changed. Refresh before saving.');const snapshot=structuredClone(draft),next={account_id:owner.id,surface:'website',draft:snapshot,updated_at:new Date().toISOString()};if(publishing)next.published_design=snapshot;const result=await client.from('studio_artist_designs').upsert(next,{onConflict:'account_id,surface'});if(result.error)throw Error('Your design could not be saved. Please try again.');showArtistSaveConfirmation(publishing?'Artist design published.':'Design draft saved privately.');}
  catch(error){status.classList.remove('sr-only');status.textContent=error.message;}
  finally{save.disabled=publish.disabled=false;}
 };
 save.onclick=()=>persist(false);publish.onclick=()=>persist(true);
 const send=()=>{if(ready&&validEditorDraft(draft))frame.contentWindow.postMessage({type:'artanrecords:artist-preview',draft},url.origin);};
 const sync=()=>{
  root.querySelector('[data-editor-font-select]').value=draft.font;
  for(const button of root.querySelectorAll('[data-editor-size]'))button.setAttribute('aria-pressed',String(button.dataset.editorSize===draft.size));
  for(const button of root.querySelectorAll('[data-editor-section]'))button.setAttribute('aria-pressed',String(draft.sections.includes(button.dataset.editorSection)));
  for(const button of root.querySelectorAll('[data-editor-divider]'))button.setAttribute('aria-pressed',String((draft.dividers||[]).includes(button.dataset.editorDivider)));
  for(const [index,row] of [...root.querySelectorAll('[data-editor-button-row]')].entries()){row.querySelector('[data-editor-button-label]').value=draft.buttons?.[index]?.label||'';row.querySelector('[data-editor-button-url]').value=draft.buttons?.[index]?.url||'';}
  root.querySelector('[data-editor-copyright]').value=draft.copyright||'';
  root.querySelector('[data-editor-ribbon]').value=draft.ribbon||'#000000';send();
 };
 addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==url.origin)return;
  if(event.data?.type==='artanrecords:artist-preview-ready'){const first=!ready;ready=true;controls.forEach(item=>item.disabled=false);save.disabled=publish.disabled=!storageReady;status.textContent=storageReady?'Preview ready.':'Preview ready. Design storage is unavailable; saving and publishing are disabled.';status.classList.toggle('sr-only',storageReady);if(first){setFocus(true);setTools(false);}sync();}
  if(event.data?.type==='artanrecords:artist-preview-select'&&['name','menu','footer','buttons',...config.sections.map(item=>item.id)].includes(event.data.target))showContext(event.data.target);
 });
 root.querySelector('[data-editor-font-select]').addEventListener('change',event=>{draft.font=event.target.value;sync();});
 for(const button of root.querySelectorAll('[data-editor-size]'))button.addEventListener('click',()=>{draft.size=button.dataset.editorSize;sync();});
 root.querySelector('[data-editor-ribbon]').addEventListener('input',event=>{draft.ribbon=event.target.value;send();});
 for(const button of root.querySelectorAll('[data-editor-section]'))button.addEventListener('click',()=>{const id=button.dataset.editorSection;draft.sections=draft.sections.includes(id)?draft.sections.filter(item=>item!==id):[...draft.sections,id];sync();});
 for(const button of root.querySelectorAll('[data-editor-divider]'))button.onclick=()=>{const id=button.dataset.editorDivider;draft.dividers=(draft.dividers||[]).includes(id)?draft.dividers.filter(item=>item!==id):[...(draft.dividers||[]),id];sync();};
 const updateButtons=()=>{const buttons=[...root.querySelectorAll('[data-editor-button-row]')].map(row=>({label:row.querySelector('[data-editor-button-label]').value.trim(),url:row.querySelector('[data-editor-button-url]').value.trim()})).filter(item=>item.label||item.url);const next={...draft,buttons};save.disabled=publish.disabled=!storageReady||!validEditorDraft(next);if(validEditorDraft(next)){draft=next;send();}};
 for(const input of root.querySelectorAll('[data-editor-button-row] input'))input.oninput=updateButtons;
 root.querySelector('[data-editor-copyright]').oninput=event=>{draft.copyright=event.target.value;send();};
 root.querySelector('[data-editor-reset]').addEventListener('click',()=>{draft=initial();sync();});
 document.addEventListener('studio:artist-saved',()=>{frame.src=url.href;});
 frame.src=url.href;frame.hidden=false;root.querySelector('[data-editor-empty]').hidden=true;status.textContent='Opening your public page preview. If it does not load, check that your artist page is published.';
}
