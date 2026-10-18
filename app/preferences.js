export function bindPreferences(){
  const key='artanrecords-studio-preferences',themeKey='artanrecords-studio-theme';let choice=null;
  try{const saved=JSON.parse(localStorage.getItem(key));if(['allow','skip'].includes(saved?.choice)&&Number.isFinite(saved.expires)&&saved.expires>Date.now())choice=saved.choice;if(choice==='allow'&&localStorage.getItem(themeKey)==='dark'){document.documentElement.dataset.theme='dark';document.documentElement.dataset.themeEffective='dark';}}catch{}
  window.ArtanRecordsPreferences={saveTheme(value){if(choice==='allow')try{localStorage.setItem(themeKey,value);}catch{}}};
  const dialog=document.createElement('dialog');dialog.className='privacy-preferences';dialog.setAttribute('aria-labelledby','studio-preferences-title');
  const symbol=document.createElement('span');symbol.className='privacy-preferences__symbol';symbol.setAttribute('aria-hidden','true');const img=document.createElement('img');img.src='/app/icons/cookies.svg';img.alt='';symbol.append(img);
  const title=document.createElement('h2');title.id='studio-preferences-title';title.textContent='Cookies & preferences';title.tabIndex=-1;title.autofocus=true;
  const description=document.createElement('p');description.textContent='Essential storage supports sign-in. Allow remembers your appearance in this browser; Skip leaves optional preference storage off.';
  const actions=document.createElement('div');actions.className='privacy-preferences__actions';
  const save=value=>{choice=value;try{localStorage.setItem(key,JSON.stringify({choice,expires:Date.now()+180*86400000}));if(choice==='allow')localStorage.setItem(themeKey,document.documentElement.dataset.themeEffective);else localStorage.removeItem(themeKey);}catch{}};
  for(const [value,label,icon]of[['allow','Allow','check'],['skip','Skip','close']]){const button=document.createElement('button');button.type='button';button.className='privacy-preferences__action';const image=document.createElement('img');image.src='/app/icons/'+icon+'.svg';image.alt='';button.append(image,document.createTextNode(label));button.addEventListener('click',()=>{save(value);dialog.close();});actions.append(button);}
  const notice=document.createElement('a');notice.href='/privacy/';notice.textContent='Privacy notice';notice.addEventListener('click',()=>dialog.close());dialog.append(symbol,title,description,actions,notice);dialog.addEventListener('cancel',()=>save('skip'));document.body.append(dialog);
  const settings=document.createElement('button');settings.type='button';settings.textContent='Cookies & preferences';settings.addEventListener('click',()=>dialog.showModal());document.querySelector('.site-footer .information-links')?.append(settings);
  if(choice===null&&!['/privacy/','/terms/'].includes(location.pathname))dialog.showModal();
}
