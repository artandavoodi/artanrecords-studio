import config from '../content/account.json';
import {readChoice,restoreAppearance,applyAppearance,saveAppearance} from './appearance.js';
export function bindPreferences(){
  const {choiceKey:key,themeKey,validDays}=config.preferences;let choice=null;
  try{choice=readChoice(localStorage,config.preferences);applyAppearance(restoreAppearance(localStorage,config.preferences));}catch{}
  window.ArtanRecordsPreferences={saveTheme(value){saveAppearance(localStorage,config.preferences,value);}};
  const dialog=document.createElement('dialog');dialog.className='privacy-preferences';dialog.setAttribute('aria-labelledby','studio-preferences-title');
  const symbol=document.createElement('span');symbol.className='privacy-preferences__symbol';symbol.setAttribute('aria-hidden','true');const img=document.createElement('img');img.src='/app/icons/cookies.svg';img.alt='';symbol.append(img);
  const title=document.createElement('h2');title.id='studio-preferences-title';title.textContent='Cookies & preferences';title.tabIndex=-1;title.autofocus=true;
  const description=document.createElement('p');description.textContent='Essential storage supports sign-in. Allow remembers your appearance in this browser; Skip leaves optional preference storage off.';
  const actions=document.createElement('div');actions.className='privacy-preferences__actions';
  const save=value=>{choice=value;try{localStorage.setItem(key,JSON.stringify({choice,expires:Date.now()+validDays*86400000}));if(choice==='allow')saveAppearance(localStorage,config.preferences,document.documentElement.dataset.themeEffective);else localStorage.removeItem(themeKey);}catch{}};
  for(const [value,label,icon]of[['allow','Allow','check'],['skip','Skip','close']]){const button=document.createElement('button');button.type='button';button.className='privacy-preferences__action';const image=document.createElement('img');image.src='/app/icons/'+icon+'.svg';image.alt='';button.append(image,document.createTextNode(label));button.addEventListener('click',()=>{save(value);dialog.close();});actions.append(button);}
  const notice=document.createElement('a');notice.href='/privacy/';notice.textContent='Privacy notice';notice.addEventListener('click',()=>dialog.close());dialog.append(symbol,title,description,actions,notice);dialog.addEventListener('cancel',()=>save('skip'));document.body.append(dialog);
  const settings=document.createElement('button');settings.type='button';settings.textContent='Cookies & preferences';settings.addEventListener('click',()=>dialog.showModal());document.querySelector('.site-footer .information-links')?.append(settings);
  if(choice===null&&!['/privacy/','/terms/'].includes(location.pathname))dialog.showModal();
}
