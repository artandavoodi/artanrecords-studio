export async function bindNotifications({client,resolveUser}){
 const button=document.querySelector('[data-studio-notifications]'),popover=document.getElementById('studio-notifications');if(!button||!client)return;
 let user;try{user=await resolveUser(client);}catch{return;}if(!user)return;button.hidden=false;
 let busy=false;
 async function refresh(){
  if(busy||!button.isConnected)return;busy=true;
  try{
   const identity=await resolveUser(client);if(identity?.id!==user.id){button.hidden=true;popover.replaceChildren();return;}
   const result=await client.from('studio_notifications').select('id,kind,status,message,created_at,read_at').eq('account_id',user.id).order('created_at',{ascending:false}).limit(50);if(result.error)throw result.error;
   const heading=document.createElement('h2');heading.textContent='Notifications';popover.replaceChildren(heading);
   const unread=result.data.filter(item=>!item.read_at).length;button.setAttribute('aria-label',unread?'Notifications, '+unread+' unread':'Notifications');button.dataset.unread=String(unread>0);const count=button.querySelector('[data-studio-notification-count]');count.hidden=!unread;count.textContent=String(unread);
   if(!result.data.length){const empty=document.createElement('p');empty.textContent='No notifications yet.';popover.append(empty);}
   for(const item of result.data){
    const article=document.createElement('article'),title=document.createElement('strong'),message=document.createElement('p'),time=document.createElement('time'),link=document.createElement('a');
    title.textContent=(item.kind==='username'?'Username':'Partnership')+' · '+item.status;message.textContent=item.message;time.dateTime=item.created_at;time.textContent=new Date(item.created_at).toLocaleString();link.href='/profile/';link.textContent='View in your profile';article.append(title,message,time,link);
    if(!item.read_at){const read=document.createElement('button');read.type='button';read.textContent='Mark as read';read.addEventListener('click',async()=>{read.disabled=true;const result=await client.rpc('studio_read_notification',{notification:item.id});if(result.error){read.disabled=false;read.textContent='Try again';}else await refresh();});article.append(read);}
    popover.append(article);
   }
  }catch{popover.textContent='Notifications could not be loaded. Close and reopen to retry.';}finally{busy=false;}
 }
 popover.addEventListener('beforetoggle',event=>{if(event.newState==='open')refresh();});await refresh();
 const poll=()=>setTimeout(async()=>{if(!button.isConnected)return;if(document.visibilityState==='visible')await refresh();poll();},15000);poll();
}
