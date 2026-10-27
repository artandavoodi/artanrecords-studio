import {applyArtistDesign,validArtistDesign} from './artist-design.js';
import {bindReorderList} from '../../core/02-systems/reorder-list.js';
let bound=false;
let replay=()=>{};
// Preview messages affect this frame only. They never write artist metadata.
export function bindArtistEditorPreview(root,config){
 if(window.parent===window||new URL(location.href).searchParams.get('editor-preview')!=='1')return;
 const targets=[{id:'name',label:'Artist name',selector:'[data-artist-name]'},...config.sections,{id:'buttons',label:'Main buttons',selector:'[data-artist-directory]'}];
 for(const target of targets){
  const node=root.querySelector(target.selector);if(!node||node.querySelector(':scope > .artist-canvas-edit'))continue;
  node.dataset.artistEditTarget=target.id;
  const button=document.createElement('button'),image=document.createElement('img');button.type='button';button.className='artist-canvas-edit';button.setAttribute('aria-label','Edit '+target.label);button.title='Edit '+target.label;image.src=config.editIcon;image.alt='';image.dataset.monochrome='true';button.append(image);
  button.addEventListener('click',()=>{for(const origin of config.studioOrigins)window.parent.postMessage({type:'artanrecords:artist-preview-select',target:target.id},origin);});node.append(button);
 }
 for(const [id,label,selector] of [['menu','Menu','.site-menu__links'],['footer','Footer & copyright','.site-footer']]){
  const node=document.querySelector(selector);if(!node||node.querySelector('[data-chrome-edit]'))continue;
  node.dataset.artistEditTarget=id;const button=document.createElement('button'),image=document.createElement('img');button.type='button';button.className='artist-canvas-edit';button.dataset.chromeEdit='';button.setAttribute('aria-label','Edit '+label);image.src=config.editIcon;image.alt='';image.dataset.monochrome='true';button.append(image);button.onclick=()=>{for(const origin of config.studioOrigins)window.parent.postMessage({type:'artanrecords:artist-preview-select',target:id},origin);};node.append(button);
 }
 const menu=document.querySelector('.site-menu__links');
 if(menu){
  for(const link of menu.querySelectorAll(':scope > a')){const row=document.createElement('div'),handle=document.createElement('button'),image=document.createElement('img');row.dataset.artistMenuRow='';row.draggable=true;handle.type='button';handle.dataset.reorderHandle='';handle.setAttribute('aria-label','Reorder '+link.textContent);image.src=config.dragIcon;image.alt='';image.dataset.monochrome='true';handle.append(image);link.before(row);row.append(handle,link);}
  bindReorderList(menu,{rowSelector:'[data-artist-menu-row]',handleSelector:'[data-reorder-handle]',onChange:rows=>{const links=rows.map(row=>{const link=row.querySelector('a');return {label:link.textContent,url:link.getAttribute('href')};});for(const origin of config.studioOrigins)window.parent.postMessage({type:'artanrecords:artist-menu-order',links},origin);}});
 }
 if(bound){replay();return;}
 bound=true;
 const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/css/layers/site/artist-editor-preview.css';document.head.append(style);
 const receive=event=>{
  if(event.source!==window.parent||!config.studioOrigins.includes(event.origin)||event.data?.type!=='artanrecords:artist-preview')return;
  const draft=event.data.draft;
  if(!validArtistDesign(draft,config))return;
  applyArtistDesign(root,draft,config);
  replay=()=>receive(event);
  window.parent.postMessage({type:'artanrecords:artist-preview-applied'},event.origin);
 };
 addEventListener('message',receive);
 const links=[...root.querySelectorAll('[data-artist-group]')].map(group=>({id:group.dataset.artistGroup,label:group.querySelector('h2')?.textContent||group.dataset.artistGroup,items:[...group.querySelectorAll('[data-artist-link-key]')].map(link=>({id:link.dataset.artistLinkKey,label:link.getAttribute('aria-label')||link.textContent.trim()}))}));
 for(const origin of config.studioOrigins)window.parent.postMessage({type:'artanrecords:artist-preview-ready',links},origin);
}
