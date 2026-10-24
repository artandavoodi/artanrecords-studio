import catalogue from '../content/catalogue.json';
import account from '../content/account.json';
import iconManifest from './icon-manifest.json';
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
  for(const record of records){
   const article=document.createElement('article'),heading=document.createElement('h2'),date=document.createElement('p'),link=document.createElement('a');
   article.className='studio-published-release';heading.textContent=record.title;date.textContent=[record.type,record.releaseDate,record.duration].filter(Boolean).join(' · ');
   if(record.cover?.src){const image=document.createElement('img');const url=new URL(record.cover.variants?.[0]?.src||record.cover.src,catalogue.origin+'/');if(url.origin===catalogue.origin){image.src=url.href;image.alt=record.cover.alt||record.title;image.loading='lazy';article.append(image);}}
   article.append(heading,date);link.href=new URL('/releases/'+encodeURIComponent(record.id)+'/',catalogue.origin).href;link.textContent='Open release';article.append(link);
   const details=document.createElement('details'),summary=document.createElement('summary'),chevron=document.createElement('img');summary.textContent='Release information';chevron.className='studio-icon';chevron.src='/assets/icons/navigation/chevron-right.svg';chevron.alt='';summary.append(chevron);details.append(summary);
   for(const [label,value] of [['Genre',record.genre],['UPC',record.upc],['Story',record.story],['Lyrics',record.lyrics]])if(value){const row=document.createElement('p'),title=document.createElement('strong');title.textContent=label+': ';row.append(title,document.createTextNode(value));details.append(row);}
   const platforms=document.createElement('nav');platforms.className='studio-profile-actions';platforms.setAttribute('aria-label',record.title+' streaming links');
   for(const item of record.links||[]){try{const url=new URL(item.url);if(url.protocol!=='https:'||url.username||url.password)continue;const anchor=document.createElement('a');anchor.href=url.href;anchor.rel='noopener';anchor.setAttribute('aria-label',item.label);anchor.title=item.label;const normalized=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,'');const alias=Object.keys(account.icons).find(key=>[item.platform,item.icon,item.label].some(value=>normalized(value)===normalized(key)));if(alias){const image=document.createElement('img');image.className='studio-icon';image.src='/app/icons/'+(iconManifest.available[alias]===false?'placeholder':alias)+'.svg';image.alt='';anchor.append(image);}else anchor.textContent=item.label;platforms.append(anchor);}catch{}}
   for(const track of record.tracks||[]){const row=document.createElement('p');row.textContent=[track.number,track.title,track.duration].filter(Boolean).join(' · ');details.append(row);}
   article.append(platforms,details);list.append(article);
  }
 }catch{status.textContent='Your released catalogue could not be loaded. Please try again.';}
}
