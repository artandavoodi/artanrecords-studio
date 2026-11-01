// Shared consent interaction; each surface supplies its copy, artwork and storage owner.
export function mountPrivacyPreferences({data,icon,state,noticeUrl,opener,legal=false,existing}){
 const dialog=existing||document.createElement('dialog');
 if(!existing){
  dialog.id='preferences-dialog';dialog.className='privacy-preferences';dialog.setAttribute('aria-labelledby','preferences-title');
  const symbol=document.createElement('span');symbol.className='privacy-preferences__symbol';symbol.setAttribute('aria-hidden','true');symbol.append(icon('cookies'));
  const title=document.createElement('h2');title.id='preferences-title';title.tabIndex=-1;title.autofocus=true;title.textContent=data.title;
  const description=document.createElement('p');description.textContent=data.description;
  const actions=document.createElement('form');actions.method='dialog';actions.className='privacy-preferences__actions';
  for(const choice of ['allow','skip']){const button=document.createElement('button');button.type='submit';button.value=choice;button.className='privacy-preferences__action';button.dataset.preferenceChoice=choice;button.append(icon(choice==='allow'?'check':'close'),document.createTextNode(data[choice]));actions.append(button);}
  const notice=document.createElement('a');notice.href=noticeUrl;notice.textContent=data.notice;
  dialog.append(symbol,title,description,actions,notice);document.body.append(dialog);
 }
 dialog.dataset.preferencesPanel='';
 const open=()=>{if(!dialog.open)dialog.showModal();};
 dialog.querySelector('form').addEventListener('submit',event=>{event.preventDefault();state.choose(event.submitter?.value==='allow'?'allow':'skip');dialog.close();});
 // Dismissal is not consent: an unanswered prompt returns on the next visit.
 dialog.addEventListener('cancel',event=>event.preventDefault());
 dialog.addEventListener('close',()=>document.dispatchEvent(new Event('cookie-consent:closed')));
 opener?.addEventListener('click',open);
 if(state.choice()===null&&!legal)open();
 return {open,dialog};
}
