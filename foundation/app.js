import {initializeTheme,bindTheme} from '../assets/js/core/theme.js';
import {bindNavigation} from '../assets/js/layers/site/navigation.js';
initializeTheme();
try {
  const response=await fetch('/assets/data/site.json');
  if(!response.ok)throw Error('Brand configuration unavailable');
  const brand=await response.json();
  bindTheme(brand.labels);bindNavigation(brand.labels);
  document.documentElement.dataset.enhanced='true';
} catch(error){console.error(error);}
const search=document.querySelector('[data-search]');
if(search) {
  const output=document.querySelector('[data-search-results]');
  const status=document.querySelector('[data-search-status]');
  try {
    const response=await fetch('/search.json');
    if(!response.ok)throw Error('Search unavailable');
    const index=await response.json();
    search.addEventListener('input',()=>{
      const query=search.value.trim().toLocaleLowerCase();
      output.replaceChildren();status.textContent='';
      if(!query)return;
      const matches=index.pages.filter(p=>`${p.title} ${p.description} ${p.text}`.toLocaleLowerCase().includes(query));
      status.textContent=matches.length?index.labels.results.replace('{count}',String(matches.length)):index.labels.empty;
      for(const page of matches){const a=document.createElement('a');a.href=page.path;a.textContent=page.title;output.append(a);}
    });
  } catch(error){search.disabled=true;console.error(error);}
}
