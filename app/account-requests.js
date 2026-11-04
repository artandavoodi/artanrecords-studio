import labels from '../content/account-requests.json';
export async function bindAccountRequests({client,resolveUser}){
 const root=document.querySelector('[data-account-requests]');if(!root||!client)return;
 window.NeuroartanCloseButtons?.initCloseButtonPrimitive(root);
 const form=root.querySelector('form'),status=root.querySelector('[data-account-request-status]'),list=root.querySelector('[data-account-request-list]');
 let user;try{user=await resolveUser(client);}catch{status.textContent=labels.unavailable;}if(!user)return;
 const scope=()=>root.querySelector('[data-account-request-scope]').textContent=labels.scopes[form.elements.kind.value];form.elements.kind.onchange=scope;scope();
 let opener;
 for(const button of document.querySelectorAll('[data-account-request-open]'))button.onclick=()=>{opener=button;form.reset();form.elements.kind.value=button.dataset.accountRequestOpen;root.querySelector('[data-account-request-title]').textContent=labels.actions[form.elements.kind.value];scope();root.showModal();load();};
 root.addEventListener('close',()=>opener?.focus());
 root.querySelector('[data-account-request-close]').onclick=()=>root.close();
 async function load(){try{const result=await client.from('studio_account_change_requests').select('id,kind,status,review_note,created_at').eq('account_id',user.id).order('created_at',{ascending:false}).limit(50);if(result.error)throw result.error;list.replaceChildren();for(const row of result.data||[]){const article=document.createElement('article'),title=document.createElement('h4'),detail=document.createElement('p'),reference=document.createElement('code'),note=document.createElement('p');title.textContent=labels.kinds[row.kind];detail.textContent=labels.statuses[row.status];reference.textContent=row.id;note.textContent=row.review_note;article.append(title,detail,reference,note);if(['submitted','under_review'].includes(row.status)){const button=document.createElement('button');button.type='button';button.className='ui-button';button.textContent=labels.withdraw;button.onclick=()=>run(()=>client.rpc('studio_withdraw_account_change',{request:row.id}));article.append(button);}list.append(article);}if(!result.data?.length)list.textContent=labels.empty;form.hidden=false;status.textContent='';}catch{status.textContent=labels.unavailable;}}
 async function run(action){root.inert=true;try{if((await resolveUser(client))?.id!==user.id)throw Error();const result=await action();if(result.error)throw result.error;const kind=form.elements.kind.value;form.reset();form.elements.kind.value=kind;scope();await load();}catch{status.textContent=labels.error;}finally{root.inert=false;}}
 form.onsubmit=event=>{event.preventDefault();run(()=>client.rpc('studio_request_account_change',{request_kind:form.elements.kind.value,explanation:form.elements.reason.value.trim(),confirmed:form.elements.confirmed.checked}));};root.querySelector('[data-account-requests-refresh]').onclick=load;await load();
}
