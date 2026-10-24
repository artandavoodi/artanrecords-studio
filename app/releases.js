import catalogue from '../content/catalogue.json';
import account from '../content/account.json';
import iconManifest from './icon-manifest.json';
function streamingLinks(items,title){
 const platforms=document.createElement('nav');platforms.className='studio-profile-actions';platforms.setAttribute('aria-label',title+' streaming links');
 const normalized=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 for(const item of items||[]){try{const url=new URL(item.url);if(url.protocol!=='https:'||url.username||url.password)continue;const anchor=document.createElement('a');anchor.href=url.href;anchor.rel='noopener';anchor.setAttribute('aria-label',item.label);anchor.title=item.label;const alias=Object.keys(account.icons).find(key=>[item.platform,item.icon,item.label].some(value=>normalized(value)===normalized(key)));if(alias){const image=document.createElement('img');image.className='studio-icon';image.src='/app/icons/'+(iconManifest.available[alias]===false?'placeholder':alias)+'.svg';image.alt='';anchor.append(image);}else anchor.textContent=item.label;platforms.append(anchor);}catch{}}
 return platforms;
}
export async function bindPublishedReleases({client,resolveUser}){
 const root=document.querySelector('[data-published-releases]');if(!root)return;
 const status=root.querySelector('[role=status]'),list=root.querySelector('[data-published-list]');
 if(!client){status.textContent='Sign in to see your released catalogue.';return;}
 try{
  const user=await resolveUser(client);if(!user){status.textContent='Sign in to see your released catalogue.';return;}
  const handle=await client.from('studio_artist_handles').select('approved_username').eq('account_id',user.id).maybeSingle();if(handle.error)throw handle.error;
  if(!handle.data?.approved_username){status.textContent='Your released catalogue will appear after your artist address is approved.';return;}
  const read=async path=>{const response=await fetch(new URL(path,catalogue.origin),{cache:'no-store',credentials:'omit'});if(!response.ok)throw Error();return response.json();};
  const artists=await read(catalogue.artists),data=await read(catalogue.releases);
  const ids=Object.entries(artists.routes||{}).filter(([,username])=>username===handle.data.approved_username).map(([id])=>id);
  const records=data.items.filter(record=>ids.includes(record.artistId)&&record.status==='Released');
  status.textContent=records.length?catalogue.notice:'No released catalogue entries are linked to your approved artist address.';
  for(const [recordIndex,record] of records.entries()){
   const article=document.createElement('article'),heading=document.createElement('h2'),date=document.createElement('p'),link=document.createElement('a');
   article.className='studio-published-release';const copy=document.createElement('div');copy.className='studio-release-copy';heading.textContent=record.title;date.textContent=[record.type,record.releaseDate,record.duration].filter(Boolean).join(' · ');
   if(record.cover?.src){const image=document.createElement('img');const url=new URL(record.cover.variants?.[0]?.src||record.cover.src,catalogue.origin+'/');if(url.origin===catalogue.origin){image.src=url.href;image.alt=record.cover.alt||record.title;image.loading=recordIndex<2?'eager':'lazy';article.append(image);}}
   copy.append(heading,date);link.href=new URL('/releases/'+encodeURIComponent(record.id)+'/',catalogue.origin).href;link.textContent='Open release';copy.append(link);
   const details=document.createElement('details'),summary=document.createElement('summary'),chevron=document.createElement('img');summary.textContent='Release information';chevron.className='studio-icon';chevron.src='/assets/icons/navigation/chevron-right.svg';chevron.alt='';summary.append(chevron);details.append(summary);
   const appendFacts=(mount,source,fields)=>{const facts=document.createElement('dl');facts.className='studio-release-facts';for(const field of fields){const value=source[field.key];if(typeof value!=='string'||!value)continue;const row=document.createElement('div'),title=document.createElement('dt'),text=document.createElement('dd');title.textContent=field.label;text.textContent=value;row.append(title,text);facts.append(row);}if(facts.childElementCount)mount.append(facts);};
   appendFacts(details,record,catalogue.details);
   for(const [index,track] of (record.tracks||[]).entries()){const section=document.createElement('section'),title=document.createElement('h3');title.textContent=[track.number||index+1,track.title,track.duration].filter(Boolean).join(' · ');section.append(title);appendFacts(section,track,catalogue.trackDetails);if(track.links?.length)section.append(streamingLinks(track.links,track.title));details.append(section);}
   copy.append(streamingLinks(record.links,record.title),details);article.append(copy);list.append(article);
  }
 }catch{status.textContent='Your released catalogue could not be loaded. Please try again.';}
}
