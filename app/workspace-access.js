import labels from '../content/workspace-access.json';
export async function admitWorkspace(client){
 let allowed=false,unavailable=false;
 try{const result=await client.rpc('studio_workspace_access');if(result.error||typeof result.data!=='boolean')throw Error();allowed=result.data;}
 catch{unavailable=true;}
 if(allowed)return true;
 const main=document.querySelector('main'),title=document.createElement('h1'),notice=document.createElement('p'),home=document.createElement('a'),section=document.createElement('section');
 title.textContent=unavailable?labels.unavailableTitle:labels.title;
 notice.textContent=unavailable?labels.unavailableNotice:labels.notice;
 home.textContent=labels.home;home.href=labels.homeUrl;home.className='ui-button';section.className='site-section';section.append(title,notice,home);main.replaceChildren(section);main.hidden=false;
 document.querySelectorAll('[data-studio-search-open],[data-studio-notifications],[data-menu-toggle]').forEach(node=>node.hidden=true);
 window.NeuroartanPageLoading?.finish();
 return false;
}
