const key='artanrecords.spotify.authorization';
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export async function spotifyAuthorization({clientId,redirectUri,accountId,cryptoApi=crypto}){
 if(!/^[a-z0-9]{32}$/i.test(clientId||'')||!['https://studio.artanrecords.com/settings/?music-provider=spotify','http://127.0.0.1:8930/settings/?music-provider=spotify','http://127.0.0.1:9038/settings/?music-provider=spotify'].includes(redirectUri))throw Error('Spotify configuration is unavailable.');
 const verifier=encode(cryptoApi.getRandomValues(new Uint8Array(48))),state=encode(cryptoApi.getRandomValues(new Uint8Array(32)));
 const challenge=encode(new Uint8Array(await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
 const url=new URL('https://accounts.spotify.com/authorize');url.search=new URLSearchParams({client_id:clientId,response_type:'code',redirect_uri:redirectUri,state,scope:'user-read-private',code_challenge_method:'S256',code_challenge:challenge}).toString();
 return {url:url.href,pending:{state,verifier,redirectUri,accountId,created:Date.now()}};
}
export function validMusicCallback(pending,state,accountId,origin,now=Date.now()){
 return Boolean(pending&&pending.state===state&&pending.accountId===accountId&&pending.created<=now&&now-pending.created<600000&&pending.redirectUri===origin+'/settings/?music-provider=spotify'&&/^[A-Za-z0-9_-]{64}$/.test(pending.verifier));
}
export async function bindPersonalMusic({client,resolveUser}){
 const root=document.querySelector('#settings-connections');if(!root)return;
 const callback=new URL(location.href);
 if(callback.searchParams.get('music-provider')==='spotify'&&(callback.searchParams.has('code')||callback.searchParams.has('error')))history.replaceState(null,'','/settings/#connections');
 const buttons=[...root.querySelectorAll('[data-connect-music]')];let configuration,owner;
 buttons.forEach(button=>button.disabled=true);
 const update=(id,connected,label)=>{const row=root.querySelector(`[data-service="${id}"]`);row.dataset.connected=String(connected);row.querySelector('[data-service-status]').textContent=label;};
 const explain=(provider,text)=>root.querySelector(`[data-music-message="${provider}"]`).textContent=text;
 try{
  owner=client&&await resolveUser(client);if(!owner){
   buttons.forEach(button=>{button.disabled=false;button.textContent='Sign in to connect';button.onclick=()=>location.assign('/account/');});
   explain('spotify','Sign in to Studio first, then return to Connections.');return;
  }
  const result=await client.functions.invoke('music-connections',{body:{}});if(result.error)throw Error('Music account setup is unavailable. Catalogue search remains separate.');configuration=result.data;
 }catch(error){buttons.forEach(button=>button.disabled=true);explain('spotify',error.message);return;}
 if(callback.searchParams.get('music-provider')==='spotify'&&(callback.searchParams.has('code')||callback.searchParams.has('error'))){
  const code=callback.searchParams.get('code'),state=callback.searchParams.get('state');let pending;
  try{pending=JSON.parse(sessionStorage.getItem(key));}catch{}sessionStorage.removeItem(key);
  history.replaceState(null,'','/settings/#connections');
  try{
   if(!validMusicCallback(pending,state,owner.id,location.origin)||!code||callback.searchParams.has('error'))throw Error('Spotify authorization was cancelled or expired. Try connecting again.');
   const response=await fetch('https://accounts.spotify.com/api/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:configuration.spotify.clientId,grant_type:'authorization_code',code,redirect_uri:pending.redirectUri,code_verifier:pending.verifier}),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Spotify could not authorize this connection.');const token=await response.json();
   const profile=await fetch('https://api.spotify.com/v1/me',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(15000)});if(!profile.ok)throw Error('Spotify account could not be verified.');const account=await profile.json();if(!account.id)throw Error('Spotify account could not be verified.');
   update('spotify-account',true,'Connected in this tab');explain('spotify',account.display_name||'Spotify account authorized.');
   root.querySelector('[data-connect-music=spotify]').textContent='Disconnect';root.querySelector('[data-connect-music=spotify]').dataset.authorized='true';
   setTimeout(()=>{update('spotify-account',false,'Authorization expired');root.querySelector('[data-connect-music=spotify]').textContent='Connect Spotify';delete root.querySelector('[data-connect-music=spotify]').dataset.authorized;},Math.min(Number(token.expires_in)||3600,3600)*1000);
  }catch(error){explain('spotify',error.message);}
 }
 for(const button of buttons){button.disabled=false;button.onclick=async()=>{
  const provider=button.dataset.connectMusic;if(button.dataset.authorized==='true'){
   delete button.dataset.authorized;update('spotify-account',false,'Not connected');button.textContent='Connect Spotify';explain(provider,'Disconnected from this tab. You can also revoke access in Spotify.');return;
  }
  button.disabled=true;
  try{
   if(provider==='spotify'){
    if((await resolveUser(client))?.id!==owner.id)throw Error('Sign in again before connecting.');
    if(!configuration.spotify?.clientId)throw Error('The label must configure its Spotify developer app first.');
    const flow=await spotifyAuthorization({...configuration.spotify,accountId:owner.id});sessionStorage.setItem(key,JSON.stringify(flow.pending));location.assign(flow.url);return;
   }
  }catch(error){explain(provider,error.message||'Connection could not be completed.');}finally{button.disabled=false;}
 };}
}
