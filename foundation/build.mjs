import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {searchMarkup} from './search.mjs';
const root=process.cwd();
const read=p=>readFile(resolve(root,p),'utf8');
const config=JSON.parse(await read('content/site.json'));
const application=config.application?await import(resolve(root,config.application.renderer)):null;
const brand=JSON.parse(await read('assets/data/site.json'));
const iconRegistry=JSON.parse(await read('assets/data/icons.json'));
const manifest=JSON.parse(await read('foundation-manifest.json'));
const versionedAsset=path=>{
  const hash=manifest.files[path];
  if(!hash)throw Error('Unregistered shared brand asset: '+path);
  return path+'?v='+hash.slice(0,12);
};
for(const [path,hash] of Object.entries(manifest.files)) {
  const actual=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
  if(actual!==hash) throw new Error('Shared source drift: '+path);
}
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fill=(s,v)=>s.replace(/\{\{(\w+)\}\}/g,(_,k)=>{if(!(k in v))throw Error('Missing binding '+k);return v[k];});
const searchIcon=name=>{const item=iconRegistry.items.find(item=>item.id===name);if(!item)throw Error('Unregistered search icon');return `<img src="/${e(item.src)}" alt="" data-monochrome="true">`;};
const docsSearch=!application&&config.search;
const searchAction=docsSearch?`<button class="surface-search-toggle" type="button" data-docs-search-open aria-label="${e(config.search.label)}">${searchIcon('search')}</button>`:'';
const searchDialog=docsSearch?`<dialog id="store-search-dialog" aria-labelledby="docs-search-title"><button class="dialog-close global-close-button" type="button" data-search-close aria-label="Close search">${searchIcon('close')}</button>${searchMarkup({title:e(config.search.label),titleId:'docs-search-title',placeholder:e(config.search.placeholder),icon:searchIcon})}</dialog>`:'';
const write=async(p,s)=>{await mkdir(dirname(resolve(root,p)),{recursive:true});await writeFile(resolve(root,p),s);};
const shell=await read('foundation/shell.html');
const navTemplate=await read('assets/fragments/navigation/index.html');
const paths=new Set(config.pages.map(p=>p.path));
if(paths.size!==config.pages.length||!paths.has('/')) throw Error('Invalid route collection');
function link(item){
  if(!/^(https:\/\/|mailto:|\/(?!\/))/.test(item.url))throw Error('Invalid link protocol');
  if(item.url.startsWith('/')&&!paths.has(item.url.split('#')[0]))throw Error('Unknown local route '+item.url);
  return `<a href="${e(item.url)}">${e(item.label)}</a>`;
}
const navigation=application?.renderNavigation?application.renderNavigation({e,brand,versionedAsset}):fill(navTemplate,{...Object.fromEntries(Object.entries(brand.labels).map(([k,v])=>[k,e(v)])),name:e(brand.name),actionsClass:application?'platform-header-actions' :'surface-header-actions',wordmarkLight:e(versionedAsset(brand.logoAssets.wordmarkBlack)),wordmarkDark:e(versionedAsset(brand.logoAssets.wordmarkWhite)),accountAccess:'',homeLinks:application?.renderActions?application.renderActions({e}):searchAction,links:application?.renderMenu?application.renderMenu({e}):config.navigation.map(link).join('')});
const directory=config.pages.filter(p=>p.path!=='/');
const cards=directory.map(p=>`<article class="surface-card"><p class="eyebrow">${e(p.category)}</p><h2><a href="${e(p.path)}">${e(p.title)}</a></h2><p>${e(p.description)}</p>${p.status?`<p class="surface-status">${e(p.status)}</p>`:''}</article>`).join('');
for(const page of config.pages) {
  if(!/^\/(?:[a-z0-9-]+\/)*$/.test(page.path))throw Error('Unsafe route');
  const ids=new Set();
  for(const section of page.sections||[]) {
    if(!/^[a-z0-9-]+$/.test(section.id)||ids.has(section.id))throw Error('Invalid section ID');
    ids.add(section.id);
  }
  const sections=(page.sections||[]).map(s=>`<section id="${e(s.id)}" class="surface-section"><h2>${e(s.title)}</h2>${s.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}${s.links?`<div class="information-links">${s.links.map(link).join('')}</div>`:''}</section>`).join('');
  const search='';
  const header=`<header><p class="eyebrow">${e(config.name)}</p><h1>${e(page.title)}</h1><p class="reading">${e(page.description)}</p>${page.status?`<p class="surface-status">${e(page.status)}</p>`:''}</header>`;
  const sidebar=`<aside class="document-reader__sidebar"><details data-reader-disclosure><summary>${e(config.name)}</summary><nav aria-label="Documentation">${config.pages.map(item=>`<a href="${e(item.path)}"${item.path===page.path?' aria-current="page"':''}>${e(item.title)}</a>`).join('')}</nav></details></aside>`;
  const outline=`<aside class="document-reader__toc"><details data-reader-disclosure><summary>${e(config.contentsLabel)}</summary><nav aria-label="${e(config.contentsLabel)}">${(page.sections||[]).map(s=>`<a href="#${e(s.id)}">${e(s.title)}</a>`).join('')}</nav></details></aside>`;
  const content=application?await application.render(page,{config,brand,e,search}):`<section class="site-section surface"><div class="document-reader" data-document-reader>${sidebar}<article class="document-reader__article"><nav class="document-reader__breadcrumb" aria-label="Breadcrumb"><a href="/">${e(config.name)}</a><span>/</span><span>${e(page.title)}</span></nav>${header}${search}${page.path==='/'?`<div class="surface-grid">${cards}</div>`:''}${sections}${page.links?`<div class="information-links">${page.links.map(link).join('')}</div>`:''}</article>${outline}</div></section>`;
  const url=config.domain+page.path;
  const graph={'@context':'https://schema.org','@type':'WebPage',name:page.title,description:page.description,url,isPartOf:{'@type':'WebSite','@id':config.domain+'/#website',name:config.name,url:config.domain},publisher:{'@type':'Organization','@id':brand.domain+'/#label',name:brand.name,url:brand.domain},...(page.application?{mainEntity:page.application}:{})};
  const head=`<title>${e(page.title===config.name?config.name:page.title+" · "+config.name)}</title><meta name="description" content="${e(page.description)}"><meta name="robots" content="${(page.indexable??config.indexable)?'index,follow':'noindex,follow'}"><link rel="canonical" href="${e(url)}"><meta property="og:title" content="${e(page.title)}"><meta property="og:description" content="${e(page.description)}"><meta property="og:url" content="${e(url)}"><meta property="og:type" content="website"><script type="application/ld+json">${JSON.stringify(graph).replace(/</g,'\\u003c')}</script>`;
  const sharing=`<meta property="og:image" content="${e(config.domain+'/'+brand.shareImage.src)}"><meta property="og:image:alt" content="${e(brand.shareImage.alt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${e(config.domain+'/'+brand.shareImage.src)}">`;
  await write(page.path.slice(1)+'index.html',fill(shell,{head:head+sharing,applicationHead:application?.renderHead?await application.renderHead():'<script src="/assets/js/core/preference-config.js"></script><script src="/assets/js/core/startup.js"></script>',applicationDialogs:application?.renderDialogs?application.renderDialogs({e}):searchDialog,logo:e(versionedAsset(brand.logo)),navigation,content,footerMarkup:application?.renderFooter?application.renderFooter({e,config}):`<footer class="site-footer"><div class="information-links">${config.footer.map(link).join('')}</div><p>${e(config.copyright)}</p></footer>`,footer:config.footer.map(link).join(''),copyright:e(config.copyright)}));
}
await write('search.json',JSON.stringify({labels:config.search,pages:directory.map(p=>({title:p.title,path:p.path,description:p.description,text:(p.sections||[]).flatMap(s=>[s.title,...s.paragraphs]).join(' ')}))}));
if(docsSearch)await write('search-index.json',JSON.stringify(directory.map(page=>({title:page.title,path:page.path,text:page.description,keywords:(page.sections||[]).flatMap(section=>[section.title,...section.paragraphs]).join(' '),category:config.search.categories.find(category=>category.paths?.includes(page.path))?.id||'guidance'}))));
await write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${config.pages.filter(p=>p.indexable??config.indexable).map(p=>`<url><loc>${e(config.domain+p.path)}</loc></url>`).join('')}</urlset>`);
await write('robots.txt',`User-agent: *\nAllow: /\n${config.pages.some(p=>p.indexable??config.indexable)?'Sitemap: '+config.domain+'/sitemap.xml\n':''}`);
await write('CNAME',new URL(config.domain).hostname+'\n');
await write('.nojekyll','');
await access(resolve(root,'assets/'+brand.logo.replace(/^assets\//,'')));
console.log(`Built ${config.pages.length} ${config.name} pages; shared checksums verified.`);
