import {initializeTheme,bindTheme} from '../assets/js/core/theme.js';
import {bindNavigation} from '../assets/js/layers/site/navigation.js';
import {bindDocumentReaders} from '../assets/js/core/02-systems/document-reader.js';
import {bindStoreSearch} from '../assets/js/core/search.js';
import {openDialog} from '../assets/js/core/dialogs.js';
bindDocumentReaders();
initializeTheme();
try {
  const response=await fetch('/assets/data/site.json');
  if(!response.ok)throw Error('Brand configuration unavailable');
  const brand=await response.json();
  bindTheme(brand.labels);bindNavigation(brand.labels);
  document.documentElement.dataset.enhanced='true';
} catch(error){console.error(error);}
const searchOpen=document.querySelector('[data-docs-search-open]');
if(searchOpen){
  const dialog=document.getElementById('store-search-dialog');
  const response=await fetch('/search.json',{cache:'no-store'});
  if(response.ok){const data=await response.json();await bindStoreSearch({search:data.labels});}
  searchOpen.addEventListener('click',()=>{openDialog(dialog);dialog.dispatchEvent(new Event('store-search-open'));});
  dialog.querySelector('[data-search-close]').addEventListener('click',()=>dialog.close());
}
