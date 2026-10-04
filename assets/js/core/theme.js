/* Same two-state behavior; storage belongs to this domain. */
const key='artanrecords-theme';
function apply(value){document.documentElement.dataset.theme=value;document.documentElement.dataset.themeEffective=value;}
export function initializeTheme(){let value='light';try{if(localStorage.getItem(key)==='dark')value='dark';}catch{}apply(value);}
export function bindTheme(labels){
  const button=document.querySelector('[data-theme-toggle]');button.hidden=false;
  function render(){const dark=document.documentElement.dataset.theme==='dark';button.setAttribute('aria-label',dark?labels.light:labels.dark);button.setAttribute('aria-pressed',String(dark));}
  button.addEventListener('click',()=>{const value=document.documentElement.dataset.theme==='dark'?'light':'dark';apply(value);try{localStorage.setItem(key,value);}catch{}render();});render();
}
