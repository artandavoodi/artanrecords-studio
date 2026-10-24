import catalogue from '../content/catalogue.json';
export async function readArtistCatalogue(client,user){
 const handle=await client.from('studio_artist_handles').select('approved_username').eq('account_id',user.id).maybeSingle();if(handle.error)throw handle.error;
 if(!handle.data?.approved_username)return [];
 const read=async path=>{const response=await fetch(new URL(path,catalogue.origin),{cache:'no-store',credentials:'omit'});if(!response.ok)throw Error('Catalogue unavailable');return response.json();};
 const artists=await read(catalogue.artists),data=await read(catalogue.releases);
 const ids=Object.entries(artists.routes||{}).filter(([,username])=>username===handle.data.approved_username).map(([id])=>id);
 return data.items.filter(record=>ids.includes(record.artistId)&&record.status==='Released');
}
