import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const config=JSON.parse(await readFile('content/account.json','utf8'));
execFileSync(process.execPath,['tools/sync-platform.mjs'],{stdio:'inherit'});
const existing=JSON.parse(await readFile('app/icon-manifest.json','utf8').catch(()=>'{"files":{}}'));
const primitives=['buttons.css','password-field.css','close-button.css','close-button.js','search.js','dialogs.js','store-surfaces.css'];
if(process.argv.includes('--sync-design')){
  const source='../artan-store',revision=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),files={};
  await mkdir('app/shared',{recursive:true});
  for(const name of primitives){
    let bytes;
    if(name==='store-surfaces.css'){
      const css=execFileSync('git',['-C',source,'show',`${revision}:web/store.css`],{encoding:'utf8'});
      const ranges=[['dialog { inline-size:','#account-close,'],['#account-close,','.store-account-control,'],['.store-search {','#account-management'],['#store-search-dialog {','.store-search .care-topics']];
      bytes=Buffer.from(ranges.map(([start,end])=>{const from=css.indexOf(start),to=css.indexOf(end,from);if(from<0||to<0)throw Error('Store presentation boundary changed: '+start);return css.slice(from,to);}).join('\n'));
    }else bytes=execFileSync('git',['-C',source,'show',`${revision}:web/${['search.js','dialogs.js'].includes(name)?'':'shared/'}${name}`]);
    await writeFile(`app/shared/${name}`,bytes);files[name]=createHash('sha256').update(bytes).digest('hex');
  }
  await writeFile('app/design-manifest.json',JSON.stringify({source:'artandavoodi/artan-store',revision,files},null,2)+'\n');
}
const design=JSON.parse(await readFile('app/design-manifest.json','utf8'));
for(const name of primitives)if(createHash('sha256').update(await readFile(`app/shared/${name}`)).digest('hex')!==design.files[name])throw Error('Shared control drift: '+name);
const site=JSON.parse(await readFile('content/site.json','utf8'));
const brand=JSON.parse(await readFile('assets/data/site.json','utf8'));
await writeFile('manifest.webmanifest',JSON.stringify({name:site.name,short_name:'Studio',id:'/',start_url:'/',scope:'/',display:'standalone',lang:'en',categories:['music','business'],icons:[{src:'/'+brand.logo,sizes:'any',type:'image/svg+xml',purpose:'any'}]})+'\n');
await writeFile('search-index.json',JSON.stringify(site.pages.filter(page=>page.path!=='/search/').map(page=>({title:page.title,path:page.path,text:page.description,keywords:page.sections.flatMap(section=>[section.title,...section.paragraphs]).join(' '),category:['/privacy/','/terms/'].includes(page.path)?'legal':['/account/','/profile/','/settings/'].includes(page.path)?'account':'workspace'})))+'\n');
// A standalone checkout builds from the pinned distribution; only explicit sync reads the owner.
if(process.argv.includes('--sync-icons')){
  const source='../control-center',revision=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  await mkdir('app/icons',{recursive:true});const files={},available={};
  for(const [name,path] of Object.entries({placeholder:config.placeholderIcon,...config.icons})){
    const bytes=execFileSync('git',['-C',source,'show',`${revision}:registry/icons/source/${path}`]);
    await writeFile(`app/icons/${name}.svg`,bytes);files[name]=createHash('sha256').update(bytes).digest('hex');
    available[name]=!bytes.toString().includes('data-artwork-status="pending"')&&/<(?:path|circle|rect|line|polygon|polyline|ellipse|use|image|text)\b/.test(bytes.toString());
  }
  await writeFile('app/icon-manifest.json',JSON.stringify({source:'artandavoodi/control-center',revision,files,available},null,2)+'\n');
}else {
  if(Object.keys(existing.files).length!==Object.keys(config.icons).length+1)throw Error('Synchronize the registered Studio icons before building.');
  for(const [name,hash] of Object.entries(existing.files))if(createHash('sha256').update(await readFile(`app/icons/${name}.svg`)).digest('hex')!==hash)throw Error('Registered icon drift: '+name);
}
await build({entryPoints:['app/main.js'],bundle:true,format:'esm',platform:'browser',target:['safari16','chrome110'],outfile:'app/dist/studio.js',minify:true});
await build({entryPoints:['app/appearance-startup.js'],bundle:true,format:'iife',platform:'browser',target:['safari16','chrome110'],outfile:'app/dist/appearance.js',minify:true});
await build({entryPoints:['app/studio.css'],bundle:true,target:['safari16','chrome110'],outfile:'app/dist/studio.css',minify:true,external:['/registry/*','/assets/*','/app/*']});
