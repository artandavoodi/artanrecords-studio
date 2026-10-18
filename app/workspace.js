export async function bindWorkspace({client,resolveUser,config}){
  for(const [type,table,fields]of[['submissions','studio_submissions','id,title,status,created_at'],['contracts','studio_contracts','id,title,version,status,created_at']]){
    const view=document.querySelector(`[data-${type}-view]`);if(!view)continue;
    const status=view.querySelector(`[data-${type}-status]`),list=view.querySelector(`[data-${type}-list]`);
    if(!client){status.textContent=config.unavailable;continue;}
    try{
      const user=await resolveUser(client);if(!user){status.textContent='Sign in to view your '+type+'.';continue;}
      const refresh=async()=>{const result=await client.from(table).select(fields).eq('account_id',user.id).order('created_at',{ascending:false}).limit(100);if(result.error)throw result.error;list.replaceChildren();for(const item of result.data){const row=document.createElement('article'),title=document.createElement('h2'),detail=document.createElement('p');title.textContent=item.title;detail.textContent=type==='contracts'?`Version ${item.version} · ${item.status}`:item.status;row.append(title,detail);list.append(row);}status.textContent=result.data.length?'Your '+type:'No '+type+' yet.';};
      await refresh();
      const form=view.querySelector('form');if(form){form.hidden=false;form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{const current=await resolveUser(client);if(current?.id!==user.id)throw Error('Session changed');const data=new FormData(form);const result=await client.from(table).insert({account_id:user.id,title:String(data.get('title')).trim(),work_type:data.get('work_type'),notes:String(data.get('notes')).trim(),status:'draft'});if(result.error)throw result.error;form.reset();await refresh();}catch{status.textContent='Your draft could not be saved. Please try again.';}finally{button.disabled=false;}});}
    }catch{status.textContent='Your '+type+' could not be loaded. Please refresh to try again.';}
  }
}
