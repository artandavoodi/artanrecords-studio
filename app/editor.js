import config from '../assets/data/artists/editor.json';
import {showSaveConfirmation} from './neuroartan/assets/js/core/02-systems/toast.js';
export function validEditorDraft(draft){
 return Boolean(draft&&config.fonts.some(item=>item.id===draft.font)&&config.sizes.some(item=>item.id===draft.size)&&(draft.ribbon===null||/^#[0-9a-f]{6}$/i.test(draft.ribbon))&&Array.isArray(draft.sections)&&draft.sections.length<=config.sections.length&&new Set(draft.sections).size===draft.sections.length&&draft.sections.every(id=>config.sections.some(item=>item.id===id)));
}
export async function bindArtistEditor({client,resolveUser}){
 const root=document.querySelector('[data-artist-editor]');if(!root)return;
 const focus=root.querySelector('[data-editor-focus]'),tools=root.querySelector('[data-editor-tools]'),panel=root.querySelector('.studio-editor-controls');
 const profileTools=root.querySelector('[data-editor-profile-tools]'),designTools=root.querySelector('[data-editor-design-tools]');
 const portfolioTools=[...root.querySelectorAll('[data-editor-portfolio-tools]')],releaseLink=root.querySelector('[data-editor-release-link]');
 const resetContext=()=>{portfolioTools.forEach(item=>item.hidden=true);releaseLink.hidden=true;};
 const setTools=open=>{panel.hidden=!open;tools.setAttribute('aria-expanded',String(open));};
 const setFocus=active=>{root.dataset.focus=String(active);focus.setAttribute('aria-pressed',String(active));focus.lastChild.textContent=active?'Workspace view':'Focus view';};
 focus.addEventListener('click',()=>setFocus(root.dataset.focus!=='true'));
 tools.addEventListener('click',()=>{resetContext();profileTools.hidden=true;designTools.hidden=false;setTools(panel.hidden);});
 root.querySelector('[data-editor-panel-close]').addEventListener('click',()=>{setTools(false);tools.focus();});
 root.querySelector('[data-editor-profile-open]').addEventListener('click',()=>{resetContext();profileTools.hidden=false;designTools.hidden=true;setTools(true);});
 for(const button of root.querySelectorAll('[data-editor-open-portfolio]'))button.addEventListener('click',()=>{resetContext();profileTools.hidden=true;designTools.hidden=true;portfolioTools.find(item=>item.dataset.editorPortfolioTools===button.dataset.editorOpenPortfolio).hidden=false;setTools(true);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')setFocus(false);});
 const status=root.querySelector('[data-editor-status]'),frame=root.querySelector('iframe'),controls=[...root.querySelectorAll('[data-editor-focus],[data-editor-tools],[data-editor-font-select],[data-editor-size],[data-editor-ribbon],[data-editor-section],[data-editor-reset],[data-editor-profile-open]')];controls.forEach(item=>item.disabled=true);
 if(!client)return;
 const owner=await resolveUser(client).catch(()=>null);if(!owner)return;
 const response=await client.from('studio_artist_handles').select('approved_username').eq('account_id',owner.id).maybeSingle();
 if((await resolveUser(client).catch(()=>null))?.id!==owner.id)return;
 const username=response.data?.approved_username;
 if(response.error||!username||!/^[a-z0-9][a-z0-9.]{1,30}[a-z0-9]$/.test(username)){status.textContent='An approved username and published artist page are needed for the design preview.';return;}
 const local=location.hostname==='127.0.0.1';
 const url=new URL('/'+encodeURIComponent(username)+'/',local?'http://127.0.0.1:8912':'https://artanrecords.com');url.searchParams.set('editor-preview','1');
 const initial=()=>({font:config.fonts[0].id,size:'standard',ribbon:null,sections:config.sections.map(item=>item.id)});
 let draft=initial(),ready=false,noticeTimer;
 const send=()=>{if(ready&&validEditorDraft(draft))frame.contentWindow.postMessage({type:'artanrecords:artist-preview',draft},url.origin);};
 const sync=()=>{
  root.querySelector('[data-editor-font-select]').value=draft.font;
  for(const button of root.querySelectorAll('[data-editor-size]'))button.setAttribute('aria-pressed',String(button.dataset.editorSize===draft.size));
  for(const button of root.querySelectorAll('[data-editor-section]'))button.setAttribute('aria-pressed',String(draft.sections.includes(button.dataset.editorSection)));
  root.querySelector('[data-editor-ribbon]').value=draft.ribbon||'#000000';send();
 };
 addEventListener('message',event=>{
  if(event.source!==frame.contentWindow||event.origin!==url.origin)return;
  if(event.data?.type==='artanrecords:artist-preview-ready'){const first=!ready;ready=true;controls.forEach(item=>item.disabled=false);status.textContent='Preview ready.';status.classList.add('sr-only');if(first){setFocus(true);setTools(false);}sync();}
  if(event.data?.type==='artanrecords:artist-preview-select'&&['name',...config.sections.map(item=>item.id)].includes(event.data.target)){
   const target=event.data.target;resetContext();setTools(true);profileTools.hidden=!['name','biography','connections'].includes(target);designTools.hidden=target!=='name';root.querySelector('[data-editor-selection]').textContent='Selected: '+(target==='name'?'Artist name':config.sections.find(item=>item.id===target).label);
   if(!profileTools.hidden){profileTools.querySelector('[data-settings-tab="'+(target==='connections'?'profile-catalogue':'profile-details')+'"]').click();profileTools.querySelector(target==='name'?'[name=artist_name]':target==='biography'?'[name=biography]':'input')?.focus();}
   else {const portfolio=portfolioTools.find(item=>item.dataset.editorPortfolioTools===target);if(portfolio)portfolio.hidden=false;else releaseLink.hidden=false;panel.querySelector('button')?.focus();}
  }
  if(event.data?.type==='artanrecords:artist-preview-applied'){clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>showSaveConfirmation('Design preview updated. Not published.'),500);}
 });
 root.querySelector('[data-editor-font-select]').addEventListener('change',event=>{draft.font=event.target.value;sync();});
 for(const button of root.querySelectorAll('[data-editor-size]'))button.addEventListener('click',()=>{draft.size=button.dataset.editorSize;sync();});
 root.querySelector('[data-editor-ribbon]').addEventListener('input',event=>{draft.ribbon=event.target.value;send();});
 for(const button of root.querySelectorAll('[data-editor-section]'))button.addEventListener('click',()=>{const id=button.dataset.editorSection;draft.sections=draft.sections.includes(id)?draft.sections.filter(item=>item!==id):[...draft.sections,id];sync();});
 root.querySelector('[data-editor-reset]').addEventListener('click',()=>{draft=initial();sync();});
 document.addEventListener('studio:artist-saved',()=>{frame.src=url.href;});
 frame.src=url.href;frame.hidden=false;root.querySelector('[data-editor-empty]').hidden=true;status.textContent='Opening your public page preview. If it does not load, check that your artist page is published.';
}
