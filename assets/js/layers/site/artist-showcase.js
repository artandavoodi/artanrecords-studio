// Selections reference work already rendered from this artist's public sources.
export function validArtistShowcase(value,config){
 if(value===undefined)return true;
 return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>config.showcase.some(group=>group.id===key))&&config.showcase.every(group=>{
  const ids=Object.hasOwn(value,group.id)?value[group.id]:[];
  return Array.isArray(ids)&&ids.length<=group.limit&&new Set(ids).size===ids.length&&ids.every(id=>typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&id.length<=100);
 }));
}
export function artistShowcaseChoices(root,config){
 return config.showcase.map(group=>({id:group.id,items:[...root.querySelectorAll(group.selector)].filter(node=>group.id!=='music'||node.dataset.releaseStatus==='Released').slice(0,200).map(node=>({id:node.dataset[group.key],label:node.querySelector(group.heading)?.textContent||''}))}));
}
export function applyArtistShowcase(root,value,config){
 if(!validArtistShowcase(value,config))return;
 for(const group of config.showcase){
  root.querySelector('[data-artist-showcase="'+group.id+'"]')?.remove();
  const originals=new Map([...root.querySelectorAll(group.selector)].filter(node=>group.id!=='music'||node.dataset.releaseStatus==='Released').map(node=>[node.dataset[group.key],node]));
  const selected=(value?.[group.id]||[]).map(id=>originals.get(id)).filter(Boolean);if(!selected.length)continue;
  const section=document.createElement('section'),heading=document.createElement('h2'),list=document.createElement('div');section.className='site-section artist-showcase';section.dataset.artistShowcase=group.id;heading.textContent=group.title;list.className=group.id==='music'?'catalogue':'artist-portfolio-grid';
  for(const original of selected){const card=original.cloneNode(true);card.hidden=false;list.append(card);}section.append(heading,list);root.append(section);
 }
}
