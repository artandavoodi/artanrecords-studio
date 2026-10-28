import artworkRules from '../content/release-artwork.json' with {type:'json'};
export function releaseArtworkValues(value){
 const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
 if(!value||!new RegExp('^'+uuid+'/'+uuid+'/'+uuid+'\\.(jpg|png)$').test(value.path)||!['image/jpeg','image/png'].includes(value.type))throw Error('Check the saved cover artwork.');
 if(!value.path.endsWith(value.type==='image/png'?'.png':'.jpg')||!Number.isInteger(value.bytes)||value.bytes<1||value.bytes>artworkRules.maxBytes||!Number.isInteger(value.width)||value.width!==value.height||value.width<artworkRules.minDimension||value.width>artworkRules.maxDimension)throw Error('Check the saved cover artwork.');
 return {path:value.path,name:String(value.name||'Cover artwork').slice(0,200),type:value.type,bytes:value.bytes,width:value.width,height:value.height};
}
function fields(values,definitions){
  const result={};
  for(const field of definitions){
    if(field.type==='checkbox'){result[field.name]=values[field.name]===true;continue;}
    const value=String(values[field.name]??'').trim();
    if(field.required&&!value)throw Error('Enter '+field.label.toLowerCase()+'.');
    if(value.length>(field.maxLength||2000))throw Error('Please shorten '+field.label.toLowerCase()+'.');
    if(value&&field.type==='select'&&!field.options.includes(value))throw Error('Choose '+field.label.toLowerCase()+'.');
    if(value&&field.type==='url'){
      let url;try{url=new URL(value);}catch{throw Error('Enter a complete HTTPS link for '+field.label+'.');}
      if(url.protocol!=='https:'||url.username||url.password)throw Error('Use an HTTPS link without credentials for '+field.label+'.');
      const host=url.hostname.toLowerCase().replace(/^www\./,'');
      if(field.hosts&&!field.hosts.some(allowed=>host===allowed||host.endsWith('.'+allowed)))throw Error('Use the correct platform link for '+field.label+'.');
    }
    if(value&&field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Enter a valid '+field.label.toLowerCase()+'.');
    if(value&&field.type==='number'&&(!/^\d{4}$/.test(value)||+value<field.min||+value>field.max))throw Error('Enter a valid '+field.label.toLowerCase()+'.');
    if(value&&field.type==='date'&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))throw Error('Enter a valid date.');
    result[field.name]=value;
  }
  return result;
}
export function artistMetadata(values,schema){
  const definitions=schema.artist.groups.flatMap(group=>group.fields);
  const result={schemaVersion:1,...fields(values,definitions),visibility:visibility(values.visibility,[...definitions.map(field=>field.name),...schema.publication.artistBaseFields])};
  if(result.years_active_end&&(!result.years_active_start||+result.years_active_end<+result.years_active_start))throw Error('The final active year must follow the starting year.');
  return result;
}
export function releaseMetadata(values,schema){
  const result={schemaVersion:1,...fields(values,schema.release.fields),links:fields(values.links||{},schema.release.linkFields),visibility:visibility(values.visibility,schema.publication.releaseFields)};
  if(values.artwork)result.artwork=releaseArtworkValues(values.artwork);
  if(result.upc&&!/^\d{12,13}$/.test(result.upc))throw Error('Use an existing 12- or 13-digit UPC/EAN, or leave it blank.');
  if(!Array.isArray(values.tracks)||!values.tracks.length||values.tracks.length>schema.release.maxTracks)throw Error('Add between 1 and '+schema.release.maxTracks+' tracks.');
  if(result.type==='Single'&&values.tracks.length!==1)throw Error('A single draft must contain one track; choose EP or Album for more tracks.');
  result.tracks=values.tracks.map((value,index)=>{
    const track={...fields(value,schema.release.trackFields),number:index+1};
    if(value.id!==undefined){if(typeof value.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value.id))throw Error('Check the track identity.');track.id=value.id;}
    if(track.isrc&&!/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/.test(track.isrc))throw Error('Use the existing 12-character ISRC, without spaces or dashes.');
    if(track.duration&&!/^\d{1,4}:[0-5]\d$/.test(track.duration))throw Error('Use minutes:seconds for duration.');
    if(track.preview_start&&!/^\d{1,4}:[0-5]\d$/.test(track.preview_start))throw Error('Use minutes:seconds for the preview start.');
    if(track.preview_start&&track.duration){const seconds=value=>value.split(':').reduce((minutes,part)=>minutes*60+Number(part),0);if(seconds(track.preview_start)>=seconds(track.duration))throw Error('The preview must start before the track ends.');}
    if(track.composition_type==='Cover song'&&(!track.original_artist||!track.original_song_title))throw Error('Add the original artist and song title for this cover.');
    if(track.clean_version&&track.explicit==='Explicit')throw Error('A clean edit cannot be marked explicit.');
    if(track.instrumental&&track.lyrics)throw Error('An instrumental track cannot contain lyrics.');
    if(!Array.isArray(value.contributors)||value.contributors.length>schema.release.maxContributors)throw Error('Check the contributor list.');
    track.contributors=value.contributors.map(person=>{
      const name=String(person.name||'').trim();if(!name||name.length>200||!schema.release.roles.includes(person.role))throw Error('Enter each contributor name and role.');
      return {name,role:person.role};
    });return track;
  });
  const trackIds=result.tracks.map(track=>track.id).filter(Boolean);if(new Set(trackIds).size!==trackIds.length)throw Error('Each track needs its own identity.');
  if(new TextEncoder().encode(JSON.stringify(result)).length>450000)throw Error('This draft is too large. Shorten the notes or lyrics.');
  return result;
}
function visibility(value={},keys){return Object.fromEntries(keys.map(key=>[key,value?.[key]==='public'?'public':'private']));}
export function googlePhoto(user){
  if(user?.app_metadata?.provider!=='google'&&!user?.app_metadata?.providers?.includes('google'))return null;
  try{const url=new URL(user.user_metadata?.avatar_url||user.user_metadata?.picture);return url.protocol==='https:'&&(url.hostname==='googleusercontent.com'||url.hostname.endsWith('.googleusercontent.com'))&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
// Publication tooling may use these allowlists after approval; drafts never publish themselves.
export function catalogueSelection(profile,metadata,schema){
  const allowed=[...schema.artist.groups.flatMap(group=>group.fields.map(field=>field.name)),...schema.publication.artistBaseFields].filter(key=>!schema.publication.artistPrivateFields?.includes(key));
  return Object.fromEntries(allowed.filter(key=>metadata.visibility?.[key]==='public').map(key=>[key,schema.publication.artistBaseFields.includes(key)?profile[key]||'':metadata[key]||'']));
}
export function releaseSelection(metadata,schema){
  return Object.fromEntries(schema.publication.releaseFields.filter(key=>metadata.visibility?.[key]==='public').map(key=>[key,key==='tracks'?(metadata.tracks||[]).map(track=>Object.fromEntries(schema.publication.trackFields.filter(field=>Object.hasOwn(track,field)).map(field=>[field,track[field]]))):metadata[key]]));
}
