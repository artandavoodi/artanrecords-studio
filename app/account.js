import artistAccount from '../content/artist-account.json' with {type:'json'};
export function configured(config){
  if(!config.supabase.url&&!config.supabase.publishableKey)return false;
  const url=new URL(config.supabase.url);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||!config.supabase.publishableKey)throw Error('Studio requires its own valid backend configuration.');
  if(url.hostname==='dwlgvujubkpycrvhngku.supabase.co')throw Error('Studio must not use Neuroartan credentials.');
  if(url.hostname==='hahtbepdrjkjluhespbs.supabase.co'&&config.supabase.identityMode!=='shared-store')throw Error('Store identity requires the approved shared-account configuration.');
  if(config.supabase.identityMode==='shared-store'&&url.hostname!=='hahtbepdrjkjluhespbs.supabase.co')throw Error('Shared identity must use the approved Store project.');
  if(config.supabase.publishableKey.startsWith('sb_secret_'))throw Error('Private backend keys must never be sent to browsers.');
  if(config.supabase.publishableKey.split('.').length===3){let role;try{role=JSON.parse(atob(config.supabase.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role;}catch{throw Error('Invalid public project key.');}if(role!=='anon')throw Error('Only a public anonymous project key may be distributed.');}
  return true;
}
export async function resolveUser(client){
  const session=await client.auth.getSession();if(session.error)throw Error('Could not read your session. Please retry.');
  if(!session.data.session)return null;
  const result=await client.auth.getUser();if(result.error||!result.data.user)throw Error('Could not verify your session. Please retry.');
  return result.data.user;
}
export async function requestGoogleSignIn(client,config,redirectTo){
  if(!client||!config.providers.google)throw Error('Google sign-in is not connected.');
  const result=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
  if(result.error)throw result.error;
  return result.data;
}
export function readAccountCallback(url){
  const query=new URLSearchParams(url.search),hash=new URLSearchParams(url.hash.slice(1));
  return {code:query.get('code'),token:query.get('token_hash')||hash.get('token_hash'),type:query.get('type')||hash.get('type'),recovery:query.get('flow')==='recovery'||query.get('type')==='recovery'||hash.get('type')==='recovery',error:query.has('error')||hash.has('error')};
}
export function profileValues(form){
  const fields={display_name:100,artist_name:100,biography:artistAccount.biographyMaxLength,website:500};const result={};
  for(const [name,max] of Object.entries(fields)){const value=String(form.get(name)||'').trim();if(value.length>max)throw Error('Please shorten your profile information.');result[name]=value;}
  const phone=String(form.get('phone')||'').replace(/[\s()-]/g,'');if(phone&&!/^\+[1-9]\d{6,14}$/.test(phone))throw Error('Enter a phone number with its country code.');result.contact_phone=phone;
  if(result.website&&new URL(result.website).protocol!=='https:')throw Error('Use an HTTPS website address.');return result;
}
export function validPhoto(file){return file&&['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size>0&&file.size<=2*1024*1024;}
