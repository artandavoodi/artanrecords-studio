import site from '../content/site.json';

export function bindSearch(){
  const input=document.querySelector('[data-studio-search]');
  if(!input)return;
  const clear=document.querySelector('[data-studio-search-clear]'),status=document.querySelector('[data-studio-search-status]'),output=document.querySelector('[data-studio-search-results]');
  const filters=[...document.querySelectorAll('[data-search-category]')];
  const normalize=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
  const category=page=>['/privacy/','/terms/'].includes(page.path)?'Legal':['/account/','/profile/','/settings/'].includes(page.path)?'Account':'Workspace';
  let selected='All';
  const render=()=>{
    const terms=normalize(input.value.trim()).split(/\s+/).filter(Boolean);clear.hidden=!terms.length;output.replaceChildren();
    if(!terms.length){status.textContent='Search by topic or question.';return;}
    const matches=site.pages.filter(page=>page.path!=='/search/').map(page=>{
      const title=normalize(page.title),text=normalize([page.title,page.description,...page.sections.flatMap(section=>[section.title,...section.paragraphs])].join(' '));
      return {page,score:terms.every(term=>text.includes(term))?terms.reduce((score,term)=>score+(title.includes(term)?3:1),0):0};
    }).filter(({page,score})=>score&&(selected==='All'||category(page)===selected)).sort((a,b)=>b.score-a.score);
    status.textContent=matches.length?`${matches.length} ${matches.length===1?'result':'results'}`:'No matches. Try another topic.';
    for(const {page}of matches){const article=document.createElement('article'),heading=document.createElement('h2'),link=document.createElement('a'),description=document.createElement('p');link.href=page.path;link.textContent=page.title;heading.append(link);description.textContent=page.description;article.append(heading,description);output.append(article);}
  };
  input.form.addEventListener('submit',event=>event.preventDefault());input.addEventListener('input',render);
  clear.addEventListener('click',()=>{input.value='';render();input.focus();});
  filters.forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.searchCategory;filters.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();}));
  input.focus();
}
