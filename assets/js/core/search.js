const normalize=value=>String(value).normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function searchStore(index,query,{category='all',limit=20}={}){
  const phrase=normalize(query),terms=[...new Set(phrase.split(/\s+/).filter(Boolean))].slice(0,12);if(!terms.length)return [];
  return index.map(item=>{
    const title=normalize(item.title),titleWords=title.split(' '),keywords=normalize(item.keywords||'').split(' '),words=normalize(`${item.title} ${item.text} ${item.keywords||''}`).split(' ');
    if(category!=='all'&&item.category!==category||!terms.every(term=>words.some(word=>word.startsWith(term))))return {item,score:0};
    const score=(title===phrase?100:title.startsWith(phrase)?60:title.includes(phrase)?40:0)+terms.reduce((sum,term)=>sum+(titleWords.includes(term)?12:titleWords.some(word=>word.startsWith(term))?8:keywords.some(word=>word.startsWith(term))?4:1),0);
    return {item,score};
  }).filter(result=>result.score>0).sort((a,b)=>b.score-a.score||(a.item.category==='products'?-1:0)-(b.item.category==='products'?-1:0)||a.item.title.localeCompare(b.item.title)||a.item.path.localeCompare(b.item.path)).slice(0,limit).map(result=>result.item);
}
export async function bindStoreSearch(config){
  let indexPromise;
  const getIndex=()=>indexPromise||=fetch('/search-index.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error();return response.json();}).catch(error=>{indexPromise=null;throw error;});
  for(const root of document.querySelectorAll('[data-store-search]')){
  const form=root.querySelector('form');
    const input=form.querySelector('input'),status=root.querySelector('[role="status"]'),results=root.querySelector('[data-search-results]');let index=[],ready=false,category='all',visible=config.search.pageSize,loading=false;
  const filters=root.querySelector('[data-search-filters]'),more=root.querySelector('[data-search-more]'),buttons=new Map();
  for(const item of config.search.categories){const button=document.createElement('button');button.type='button';button.textContent=item.label;button.onclick=()=>{category=item.id;visible=config.search.pageSize;render();};filters.append(button);buttons.set(item.id,button);}
  more.textContent=config.search.moreLabel;more.onclick=()=>{visible+=config.search.pageSize;render();};
  const clear=form.querySelector('[data-search-clear]');clear.onclick=()=>{input.value='';category='all';visible=config.search.pageSize;render();input.focus();};
  const render=()=>{
    clear.hidden=!input.value;
    results.replaceChildren();more.hidden=true;filters.hidden=!input.value.trim();if(!ready)return;
    if(!input.value.trim()){status.textContent=config.search.prompt||'Search by title, artist, format or question.';return;}
    const all=searchStore(index,input.value,{limit:Infinity}),matches=category==='all'?all:all.filter(item=>item.category===category);
    for(const item of config.search.categories){const count=item.id==='all'?all.length:all.filter(result=>result.category===item.id).length;const button=buttons.get(item.id);button.textContent=`${item.label} (${count})`;button.setAttribute('aria-pressed',String(item.id===category));}
    status.textContent=matches.length?`${matches.length} ${matches.length===1?'result':'results'}${matches.length>visible?`, showing ${visible}`:''}`:all.length?'No results in this category. Choose All to see other matches.':config.search.empty||'No matches. Try a title, format or help topic.';
    more.hidden=matches.length<=visible;
    for(const item of matches.slice(0,visible)){
      if(!item.path.startsWith('/')||item.path.startsWith('//'))continue;
      const link=document.createElement('a'),title=document.createElement('h2'),description=document.createElement('p'),type=document.createElement('span');link.href=item.path;title.textContent=item.title;description.textContent=item.text.slice(0,180);type.className='search-result-type';type.textContent=config.search.categories.find(category=>category.id===item.category)?.label||'';link.append(type,title,description);results.append(link);
    }
  };
  const load=async()=>{if(loading)return;loading=true;status.textContent='Loading search...';try{index=await getIndex();ready=true;render();}catch{status.textContent='Search could not be loaded. Please try again or use the links below.';}finally{loading=false;}};
  form.onsubmit=event=>{event.preventDefault();ready?render():load();};input.addEventListener('input',()=>{visible=config.search.pageSize;ready?render():load();});
  const dialog=root.closest('dialog');
  if(dialog)dialog.addEventListener('store-search-open',()=>{input.focus({preventScroll:true});load();});
  else{input.focus({preventScroll:true});load();}
  }
}
