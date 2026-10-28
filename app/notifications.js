import {renderNotificationFeed} from './neuroartan/assets/js/core/02-systems/notification-feed.js';
export async function bindNotifications({client,resolveUser}){
 const button=document.querySelector('[data-studio-notifications]'),popover=document.getElementById('studio-notifications');if(!button||!client)return;
 let user;try{user=await resolveUser(client);}catch{return;}if(!user)return;button.disabled=false;
 const heading=document.createElement('h2'),feed=document.createElement('div');heading.textContent='Notifications';popover.replaceChildren(heading,feed);
 const count=button.querySelector('[data-studio-notification-count]');count.classList.add('system-notification-badge');
 let busy=false,history=false,records=[];const acknowledged=new Set();
 function render(){
  const items=records.map(item=>({id:item.id,kind:item.kind,title:(item.kind==='release'?'Release':item.kind==='username'?'Username':item.kind==='payout'?'Payout application':'Partnership')+' · '+item.status.replaceAll('_',' '),message:item.message,status:item.status,createdAt:item.created_at,read:Boolean(item.read_at||acknowledged.has(item.id)),openLabel:item.kind==='release'?'View releases':item.kind==='payout'?'View payout application':'View in your profile'}));
  const unread=items.filter(item=>!item.read).length;button.setAttribute('aria-label',unread?'Notifications, '+unread+' unread':'Notifications');button.dataset.unread=String(unread>0);count.hidden=!unread;count.textContent=String(unread);
  renderNotificationFeed(feed,{items,history,onHistory:value=>{history=value;render();},onRead:async item=>{
   if((await resolveUser(client))?.id!==user.id)throw Error('Your session changed.');
   const result=await client.rpc('studio_read_notification',{notification:item.id});if(result.error)throw result.error;
   acknowledged.add(item.id);render();
  },onOpen:item=>{popover.hidePopover();location.assign(item.kind==='release'?'/releases/#release-drafts':item.kind==='payout'?'/settings/#payments':'/profile/#profile-publication');}});
 }
 async function refresh(){
  if(busy||!button.isConnected)return;busy=true;
  try{
   if((await resolveUser(client))?.id!==user.id){button.hidden=true;popover.replaceChildren();return;}
   const result=await client.from('studio_notifications').select('id,kind,status,message,created_at,read_at').eq('account_id',user.id).order('created_at',{ascending:false}).limit(100);if(result.error)throw result.error;
   records=result.data;render();
  }catch{const error=document.createElement('p');error.setAttribute('role','status');error.textContent='Notifications could not be loaded. Close and reopen to retry.';feed.replaceChildren(error);}finally{busy=false;}
 }
 popover.addEventListener('beforetoggle',event=>{if(event.newState==='open')refresh();});await refresh();
 const poll=()=>setTimeout(async()=>{if(!button.isConnected)return;if(document.visibilityState==='visible')await refresh();poll();},15000);poll();
}
