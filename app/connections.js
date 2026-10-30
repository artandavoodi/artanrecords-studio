import {bindPersonalMusic} from './music-connections.js';
export function catalogueConnections(result){
 if(!Array.isArray(result?.artists)||!Array.isArray(result?.unavailable))throw Error('Catalogue response could not be verified.');
 return Object.fromEntries(['apple','spotify'].map(id=>[id,!result.unavailable.includes(id)]));
}
export async function bindConnections({client,config,resolveUser}){
 const root=document.querySelector('#settings-connections');if(!root)return;
 const set=(id,connected,label)=>{const row=root.querySelector(`[data-service="${id}"]`);row.dataset.connected=String(connected);row.querySelector('[data-service-status]').textContent=label||(connected?'Connected':'Not connected');};
 if(client){try{const owner=await resolveUser(client);set('account',Boolean(owner),owner?'Connected':'Sign in to connect');}catch{set('account',false,'Could not verify');}}
 const button=root.querySelector('[data-check-catalogues]'),status=root.querySelector('[data-catalogue-status]');let checked=false;
 button.onclick=async()=>{
  if(button.disabled)return;button.disabled=true;status.textContent='Checking catalogue services…';for(const id of ['apple','spotify'])set(id,false,'Checking…');
  try{
   const response=await fetch(config.supabase.url+'/functions/v1/artist-discovery',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'Artan',provider:'all'}),credentials:'omit',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error();const result=catalogueConnections(await response.json());for(const [id,connected]of Object.entries(result))set(id,connected);checked=true;
   status.textContent='Checked '+new Date().toLocaleTimeString()+'. Catalogue access only; no personal account or financial reporting was connected.';
  }catch{for(const id of ['apple','spotify'])set(id,false,'Could not verify');status.textContent='Catalogue services could not be verified. Try again later.';}
  finally{button.disabled=false;}
 };
 let personalBound=false;
 const verifyVisible=()=>{if(root.hidden)return;if(!checked)button.onclick();if(!personalBound){personalBound=true;bindPersonalMusic({client,resolveUser}).catch(()=>{status.textContent='Account connections could not be loaded.';});}};
 const tab=document.querySelector('[data-settings-tab=connections]');tab?.addEventListener('click',verifyVisible);addEventListener('hashchange',verifyVisible);
 if(new URL(location.href).searchParams.get('music-provider')==='spotify')tab?.click();
 verifyVisible();
}
