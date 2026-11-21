import labels from '../content/workspace-access.json';
export async function admitWorkspace(client){
 let allowed=false,unavailable=false;
 try{const result=await client.rpc('studio_workspace_access');if(result.error||typeof result.data!=='boolean')throw Error();allowed=result.data;}
 catch{unavailable=true;}
 if(allowed)return true;
 const main=document.querySelector('main'),title=document.createElement('h1'),notice=document.createElement('p'),home=document.createElement('a'),section=document.createElement('section');
 title.textContent=unavailable?labels.unavailableTitle:labels.title;
 notice.textContent=unavailable?labels.unavailableNotice:labels.notice;
 home.textContent=labels.home;home.href=labels.homeUrl;home.className='ui-button';section.className='site-section';section.append(title,notice);
 try{const identity=await client.auth.getUser();if(identity.data?.user){const name=document.createElement('p'),reference=document.createElement('p'),switchAccount=document.createElement('button');name.textContent=labels.identity+': '+identity.data.user.email;reference.textContent=labels.reference+': '+identity.data.user.id;reference.dataset.workspaceAccount='';switchAccount.type='button';switchAccount.className='ui-button studio-signout';const icon=document.createElement('span');icon.className='studio-icon studio-signout-icon';icon.setAttribute('aria-hidden','true');switchAccount.append(icon,document.createTextNode(labels.switchAccount));switchAccount.onclick=async()=>{switchAccount.disabled=true;const result=await client.auth.signOut({scope:'local'}).catch(()=>({error:true}));if(result.error){notice.textContent=labels.switchError;switchAccount.disabled=false;}else location.replace('/account/?mode=login');};section.append(name,reference,switchAccount);}}catch{}
 section.append(home);main.replaceChildren(section);main.hidden=false;
 document.querySelectorAll('[data-studio-search-open],[data-studio-notifications],[data-menu-toggle]').forEach(node=>node.hidden=true);
 window.NeuroartanPageLoading?.finish();
 return false;
}
