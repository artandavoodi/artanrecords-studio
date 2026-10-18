export function configured(config){
  if(!config.supabase.url&&!config.supabase.publishableKey)return false;
  const url=new URL(config.supabase.url);
  if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||!config.supabase.publishableKey)throw Error('Studio requires its own valid backend configuration.');
  if(['hahtbepdrjkjluhespbs.supabase.co','dwlgvujubkpycrvhngku.supabase.co'].includes(url.hostname))throw Error('Studio must not use Store or Neuroartan credentials.');
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
export function profileValues(form){
  const fields={display_name:100,artist_name:100,biography:2000,website:500};const result={};
  for(const [name,max] of Object.entries(fields)){const value=String(form.get(name)||'').trim();if(value.length>max)throw Error('Please shorten your profile information.');result[name]=value;}
  if(result.website&&new URL(result.website).protocol!=='https:')throw Error('Use an HTTPS website address.');return result;
}
export function validPhoto(file){return file&&['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size>0&&file.size<=2*1024*1024;}
