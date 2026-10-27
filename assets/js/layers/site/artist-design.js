// The same allowlisted design contract is used by the public page and its editor.
export function validArtistDesign(draft,config){
 const ids=items=>Array.isArray(items)&&items.length<=config.sections.length&&new Set(items).size===items.length&&items.every(id=>config.sections.some(item=>item.id===id));
 return Boolean(draft&&config.fonts.some(item=>item.id===draft.font)&&config.sizes.some(item=>item.id===draft.size)&&(draft.ribbon===null||/^#[0-9a-f]{6}$/i.test(draft.ribbon))&&ids(draft.sections)&&ids(draft.dividers||[])&&typeof(draft.copyright||'')==='string'&&(draft.copyright||'').length<=160&&Array.isArray(draft.buttons||[])&&(draft.buttons||[]).length<=3&&(draft.buttons||[]).every(item=>{
  if(!item||typeof item.label!=='string'||!item.label.trim()||item.label.length>60||typeof item.url!=='string'||item.url.length>2000)return false;
  if(/^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(item.url))return true;
  try{const url=new URL(item.url);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
 }));
}
export function applyArtistDesign(root,draft,config){
 if(!validArtistDesign(draft,config))return false;
 const font=config.fonts.find(item=>item.id===draft.font),heading=root.querySelector('[data-artist-name]');
 let sheet=document.querySelector('[data-artist-font]');
 if(font.google){if(!sheet){sheet=document.createElement('link');sheet.rel='stylesheet';sheet.dataset.artistFont='';sheet.referrerPolicy='no-referrer';document.head.append(sheet);}const url=new URL('https://fonts.googleapis.com/css2');url.searchParams.set('family',font.google);url.searchParams.set('display','swap');if(sheet.href!==url.href)sheet.href=url.href;}else sheet?.remove();
 if(heading){heading.style.fontFamily=font.value||'';heading.style.fontSize=config.sizes.find(item=>item.id===draft.size).value||'';}
 for(const item of config.sections){const section=root.querySelector(item.selector);if(!section)continue;if(!section.id)section.id='artist-'+item.id;section.hidden=!draft.sections.includes(item.id);section.toggleAttribute('data-artist-divider',(draft.dividers||[]).includes(item.id));}
 const navigation=document.querySelector('[data-fragment=navigation]');
 if(draft.ribbon)navigation?.style.setProperty('--artist-header-ribbon',draft.ribbon);else navigation?.style.removeProperty('--artist-header-ribbon');
 const buttons=root.querySelector('[data-artist-directory]');
 if(buttons&&Array.isArray(draft.buttons)){buttons.replaceChildren();for(const item of draft.buttons){const link=document.createElement('a');link.href=item.url;link.textContent=item.label;link.rel='noopener';buttons.append(link);}}
 const credit=document.querySelector('[data-artist-copyright]');if(credit)credit.textContent=draft.copyright||credit.dataset.artistCopyright;
 return true;
}
export async function renderArtistDesign(root,record,config){
 if(root.hasAttribute('data-artist-editor-preview'))return;
 try{
  const endpoint=new URL('/rest/v1/studio_public_artist_designs',config.backend);endpoint.searchParams.set('select','design');endpoint.searchParams.set('username','eq.'+record.username);
  const response=await fetch(endpoint,{headers:{apikey:config.publishableKey},credentials:'omit',cache:'no-store'});if(!response.ok)return;
  const [recordDesign]=await response.json();if(!recordDesign?.design)return;
  const editor=await fetch('/assets/data/artists/editor.json').then(response=>response.json());applyArtistDesign(root,recordDesign.design,editor);
 }catch{/* Retain the published artist page when design preferences are unavailable. */}
}
