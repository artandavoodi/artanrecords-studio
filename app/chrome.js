import {openDialog} from './shared/dialogs.js';
import './shared/close-button.js';

export function bindChrome(){
  const account=document.getElementById('account-dialog'),search=document.getElementById('store-search-dialog');
  const menu=document.querySelector('[data-menu-toggle]'),searchClose=search.querySelector('[data-search-close]');
  let arrival,user=null;
  const closeArtwork=searchClose.querySelector('img');
  const openAccount=(force=false)=>{if(user&&!force){location.assign('/profile/');return;}if(search.open)search.close();if(document.documentElement.hasAttribute('data-menu-open'))menu.click();openDialog(account);};
  document.querySelectorAll('[data-studio-account-open]').forEach(button=>button.addEventListener('click',()=>openAccount()));
  account.querySelector('#account-close').addEventListener('click',()=>account.close());
  const openSearch=opener=>{
    if(account.open)account.close();
    if(document.documentElement.hasAttribute('data-menu-open'))menu.click();
    const destination=menu.getBoundingClientRect(),bounds=opener.getBoundingClientRect(),origin=bounds.width?bounds:destination;
    const animate=!matchMedia('(prefers-reduced-motion: reduce)').matches;
    closeArtwork.hidden=animate;
    if(animate)search.dataset.searchPhase='chrome';
    document.documentElement.setAttribute('data-search-open','');
    openDialog(search);search.querySelector('input').focus({preventScroll:true});search.dispatchEvent(new Event('store-search-open'));
    const size=searchClose.getBoundingClientRect();
    searchClose.style.setProperty('--search-close-top',`${destination.top+(destination.height-size.height)/2}px`);
    searchClose.style.setProperty('--search-close-end',`${innerWidth-destination.right+(destination.width-size.width)/2}px`);
    if(animate){
      const icon=document.createElement('img');icon.src='/app/icons/search.svg';icon.alt='';icon.className='search-arrival-icon';searchClose.append(icon);searchClose.classList.add('is-arriving');
      const target=searchClose.getBoundingClientRect(),style=getComputedStyle(searchClose),value=style.transitionDuration.split(',')[0],duration=parseFloat(value)*(value.trim().endsWith('ms')?1:1000);
      const animation=searchClose.animate([{transform:`translate(${origin.left+origin.width/2-target.left-target.width/2}px,${origin.top+origin.height/2-target.top-target.height/2}px)`},{transform:'translate(0,0)'}],{duration,delay:duration,easing:style.getPropertyValue('--global-close-button-ease').trim()||'ease',fill:'backwards'});
      arrival=animation;animation.finished.then(()=>{if(arrival===animation){icon.remove();closeArtwork.hidden=false;searchClose.classList.remove('is-arriving');delete search.dataset.searchPhase;}}).catch(()=>icon.remove());
    }
  };
  document.querySelectorAll('[data-studio-search-open]').forEach(button=>button.addEventListener('click',()=>openSearch(button)));
  searchClose.addEventListener('click',()=>search.close());
  search.addEventListener('close',()=>{arrival?.cancel();arrival=null;closeArtwork.hidden=false;searchClose.querySelector('.search-arrival-icon')?.remove();searchClose.classList.remove('is-arriving');delete search.dataset.searchPhase;document.documentElement.removeAttribute('data-search-open');});
  if(location.pathname==='/search/')openSearch(document.querySelector('[data-studio-search-open]'));
  return {openAccount,account,setUser(value){user=value;document.querySelector('.studio-header-control[data-studio-account-open]')?.setAttribute('aria-label',user?'Manage your account':'Open account');}};
}
