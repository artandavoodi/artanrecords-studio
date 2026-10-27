// The same allowlisted design contract is used by the public page and its editor.
const originalLinkOrders=new WeakMap();
export function validArtistDesign(draft,config){
 const ids=items=>Array.isArray(items)&&items.length<=config.sections.length&&new Set(items).size===items.length&&items.every(id=>config.sections.some(item=>item.id===id));
 const linkOrder=draft?.linkOrder||{};
 const presentation=draft?.presentation;
 if(presentation!==undefined&&(!presentation||typeof presentation!=='object'||Array.isArray(presentation)||Object.keys(presentation).some(key=>!['portraitSize','portraitAlign','biographyLabel','since','textSize','nameAlign','biographyAlign','sinceAlign','logoSize'].includes(key))||!Number.isInteger(presentation.portraitSize)||presentation.portraitSize<config.presentation.portrait.min||presentation.portraitSize>config.presentation.portrait.max||!config.presentation.alignments.some(item=>item.id===presentation.portraitAlign)||typeof presentation.biographyLabel!=='boolean'||typeof presentation.since!=='boolean'||!config.presentation.textSizes.some(item=>item.id===presentation.textSize)))return false;
 if(presentation){for(const key of ['nameAlign','biographyAlign','sinceAlign'])if(presentation[key]!==undefined&&!config.presentation.alignments.some(item=>item.id===presentation[key]))return false;if(presentation.logoSize!==undefined&&(!Number.isInteger(presentation.logoSize)||presentation.logoSize<config.presentation.portrait.min||presentation.logoSize>config.presentation.portrait.max))return false;}
 return Boolean(draft&&config.fonts.some(item=>item.id===draft.font)&&config.sizes.some(item=>item.id===draft.size)&&(draft.ribbon===null||/^#[0-9a-f]{6}$/i.test(draft.ribbon))&&ids(draft.sections)&&ids(draft.order||draft.sections)&&ids(draft.dividers||[])&&typeof linkOrder==='object'&&!Array.isArray(linkOrder)&&Object.keys(linkOrder).length<=6&&Object.entries(linkOrder).every(([key,items])=>/^[a-z_]+$/.test(key)&&Array.isArray(items)&&items.length<=40&&new Set(items).size===items.length&&items.every(id=>typeof id==='string'&&/^[a-z_]+$/.test(id)))&&typeof(draft.copyright||'')==='string'&&(draft.copyright||'').length<=160&&Array.isArray(draft.buttons||[])&&(draft.buttons||[]).length<=3&&(draft.buttons||[]).every(item=>{
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
 const presentation=draft.presentation,portrait=root.querySelector('[data-artist-portrait]'),fields=root.querySelector('[data-artist-fields]');
 if(portrait){portrait.style.setProperty('--artist-portrait-size',presentation?presentation.portraitSize+'px':'');portrait.style.justifySelf=({left:'start',center:'center',right:'end'})[presentation?.portraitAlign]||'';}
 if(fields){fields.style.fontFamily=font.value||'';fields.style.setProperty('--artist-detail-size',config.presentation.textSizes.find(item=>item.id===presentation?.textSize)?.value||'');for(const label of fields.querySelectorAll('h2'))label.hidden=presentation?.biographyLabel===false;const since=fields.querySelector('[data-artist-since]');if(since)since.hidden=presentation?.since===false;}
 if(heading)heading.style.textAlign=presentation?.nameAlign||'';
 if(fields){fields.style.textAlign=presentation?.biographyAlign||'';fields.style.justifySelf=({left:'start',center:'center',right:'end'})[presentation?.biographyAlign]||'';const since=fields.querySelector('[data-artist-since]');if(since)since.style.textAlign=presentation?.sinceAlign||'';}
 const logo=document.querySelector('.label-header-logo[data-artist-logo]');if(logo)logo.style.setProperty('--artist-logo-size',presentation?.logoSize?presentation.logoSize+'px':'');
 for(const item of config.sections){const section=root.querySelector(item.selector);if(!section)continue;if(!section.id)section.id='artist-'+item.id;section.hidden=!draft.sections.includes(item.id);section.toggleAttribute('data-artist-divider',(draft.dividers||[]).includes(item.id));}
 const navigation=document.querySelector('[data-fragment=navigation]');
 const ribbon=root.style.getPropertyValue('--artist-header-ribbon');if(ribbon)navigation?.style.setProperty('--artist-header-ribbon',ribbon);else navigation?.style.removeProperty('--artist-header-ribbon');
 const buttons=root.querySelector('[data-artist-directory]');
 if(buttons&&Array.isArray(draft.buttons)){const edit=buttons.querySelector(':scope > .artist-canvas-edit');buttons.replaceChildren();for(const item of draft.buttons){const link=document.createElement('a');link.href=item.url;link.textContent=item.label;link.rel='noopener';buttons.append(link);}if(edit)buttons.append(edit);}
 const credit=document.querySelector('[data-artist-copyright]');if(credit)credit.textContent=draft.copyright||credit.dataset.artistCopyright;
 for(const id of draft.order||[]){let section=root.querySelector(config.sections.find(item=>item.id===id).selector);while(section&&section.parentElement!==root)section=section.parentElement;if(section)root.append(section);}
 for(const group of root.querySelectorAll('[data-artist-group] .hub__group-links')){const links=[...group.querySelectorAll('[data-artist-link-key]')];if(!originalLinkOrders.has(group))originalLinkOrders.set(group,links.map(link=>link.dataset.artistLinkKey));const order=draft.linkOrder?.[group.closest('[data-artist-group]').dataset.artistGroup]||originalLinkOrders.get(group),rank=key=>order.includes(key)?order.indexOf(key):order.length;links.sort((a,b)=>rank(a.dataset.artistLinkKey)-rank(b.dataset.artistLinkKey));for(const link of links)group.append(link);}
 return true;
}
export async function renderArtistDesign(root,record,config){
 if(root.hasAttribute('data-artist-editor-preview'))return;
 try{
  const endpoint=new URL('/rest/v1/studio_public_artist_designs',config.backend);endpoint.searchParams.set('select','design');endpoint.searchParams.set('username','eq.'+record.username);
  const response=await fetch(endpoint,{headers:{apikey:config.publishableKey},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(config.designTimeoutMs)});if(!response.ok)return;
  const [recordDesign]=await response.json();if(!recordDesign?.design)return;
  const editor=await fetch('/assets/data/artists/editor.json').then(response=>response.json());applyArtistDesign(root,recordDesign.design,editor);
 }catch{/* Retain the published artist page when design preferences are unavailable. */}
}
