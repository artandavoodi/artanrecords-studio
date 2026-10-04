import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
const root=process.cwd();
const read=p=>readFile(resolve(root,p),'utf8');
const config=JSON.parse(await read('content/site.json'));
const brand=JSON.parse(await read('assets/data/site.json'));
const manifest=JSON.parse(await read('foundation-manifest.json'));
for(const [path,hash] of Object.entries(manifest.files)) {
  const actual=createHash('sha256').update(await readFile(resolve(root,path))).digest('hex');
  if(actual!==hash) throw new Error('Shared source drift: '+path);
}
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fill=(s,v)=>s.replace(/\{\{(\w+)\}\}/g,(_,k)=>{if(!(k in v))throw Error('Missing binding '+k);return v[k];});
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
const navigation=fill(navTemplate,{...Object.fromEntries(Object.entries(brand.labels).map(([k,v])=>[k,e(v)])),links:config.navigation.map(link).join('')});
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
  const search=page.path==='/'&&config.search?`<div class="surface-search"><label for="guide-search">${e(config.search.label)}</label><input class="control" id="guide-search" type="search" autocomplete="off" data-search><p data-search-status role="status" aria-live="polite"></p><div data-search-results></div></div>`:'';
  const content=`<section class="site-section surface"><header><a href="${e(brand.domain)}"><img class="label-wordmark" src="/${e(brand.logoAssets.wordmark)}" alt="${e(brand.name)}"></a><p class="eyebrow">${e(config.name)}</p><h1>${e(page.title)}</h1><p class="reading">${e(page.description)}</p>${page.status?`<p class="surface-status">${e(page.status)}</p>`:''}</header>${search}${page.path==='/'?`<div class="surface-grid">${cards}</div>`:`<nav class="information-links" aria-label="${e(config.contentsLabel)}">${(page.sections||[]).map(s=>`<a href="#${e(s.id)}">${e(s.title)}</a>`).join('')}</nav>`}${sections}${page.links?`<div class="information-links">${page.links.map(link).join('')}</div>`:''}</section>`;
  const url=config.domain+page.path;
  const graph={'@context':'https://schema.org','@type':'WebPage',name:page.title,description:page.description,url,isPartOf:{'@type':'WebSite',name:config.name,url:config.domain},publisher:{'@type':'Organization',name:brand.name,url:brand.domain}};
  const head=`<title>${e(page.title)} · ${e(config.name)}</title><meta name="description" content="${e(page.description)}"><meta name="robots" content="${config.indexable?'index,follow':'noindex,follow'}"><link rel="canonical" href="${e(url)}"><meta property="og:title" content="${e(page.title)}"><meta property="og:description" content="${e(page.description)}"><meta property="og:url" content="${e(url)}"><meta property="og:type" content="website"><script type="application/ld+json">${JSON.stringify(graph).replace(/</g,'\\u003c')}</script>`;
  await write(page.path.slice(1)+'index.html',fill(shell,{head,logo:e(brand.logo),navigation,content,footer:config.footer.map(link).join(''),copyright:e(config.copyright)}));
}
await write('search.json',JSON.stringify({labels:config.search,pages:directory.map(p=>({title:p.title,path:p.path,description:p.description,text:(p.sections||[]).flatMap(s=>[s.title,...s.paragraphs]).join(' ')}))}));
await write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${config.indexable?config.pages.map(p=>`<url><loc>${e(config.domain+p.path)}</loc></url>`).join(''):''}</urlset>`);
await write('robots.txt',`User-agent: *\nAllow: /\n${config.indexable?'Sitemap: '+config.domain+'/sitemap.xml\n':''}`);
await write('CNAME',new URL(config.domain).hostname+'\n');
await write('.nojekyll','');
await access(resolve(root,'assets/'+brand.logo.replace(/^assets\//,'')));
console.log(`Built ${config.pages.length} ${config.name} pages; shared checksums verified.`);
