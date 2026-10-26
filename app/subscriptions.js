export function hasProAccess(value){
 return value?.entitled===true&&value.plan==='studio-pro'&&['active','trialing'].includes(value.status)&&Number.isFinite(Date.parse(value.period_ends_at))&&Date.parse(value.period_ends_at)>Date.now();
}
export async function bindSubscriptions({client,resolveUser}){
 const status=document.querySelector('[data-subscription-status]');
 if(!client)return;
 const owner=await resolveUser(client).catch(()=>null);if(!owner)return;
 try{
  const result=await client.rpc('studio_subscription_status');if(result.error)throw result.error;
  const current=await resolveUser(client);if(current?.id!==owner.id)return;
  const pro=hasProAccess(result.data);
  if(status)status.textContent=pro?'Studio Pro · '+(result.data.status==='trialing'?'Trial':'Active subscription'):'No active paid subscription or verified included access';
  if(pro){const badge=document.createElement('span');badge.className='studio-pro-badge';badge.textContent='Pro';badge.setAttribute('aria-label','Studio Pro subscription');document.querySelector('.studio-brand')?.append(badge);}
 }catch{if(status)status.textContent='Subscription status could not be verified. No paid access has been granted.';}
}
