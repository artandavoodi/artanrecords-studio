import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const config=JSON.parse(await readFile('content/account.json','utf8'));
const existing=JSON.parse(await readFile('app/icon-manifest.json','utf8').catch(()=>'{"files":{}}'));
const primitives=['buttons.css','password-field.css'];
if(process.argv.includes('--sync-design')){
  const source='../artan-store',revision=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),files={};
  await mkdir('app/shared',{recursive:true});
  for(const name of primitives){const bytes=execFileSync('git',['-C',source,'show',`${revision}:web/shared/${name}`]);await writeFile(`app/shared/${name}`,bytes);files[name]=createHash('sha256').update(bytes).digest('hex');}
  await writeFile('app/design-manifest.json',JSON.stringify({source:'artandavoodi/artan-store',revision,files},null,2)+'\n');
}
const design=JSON.parse(await readFile('app/design-manifest.json','utf8'));
for(const name of primitives)if(createHash('sha256').update(await readFile(`app/shared/${name}`)).digest('hex')!==design.files[name])throw Error('Shared control drift: '+name);
// A standalone checkout builds from the pinned distribution; only explicit sync reads the owner.
if(process.argv.includes('--sync-icons')){
  const source='../control-center',revision=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  await mkdir('app/icons',{recursive:true});const files={};
  for(const [name,path] of Object.entries(config.icons)){
    const bytes=execFileSync('git',['-C',source,'show',`${revision}:registry/icons/source/${path}`]);
    await writeFile(`app/icons/${name}.svg`,bytes);files[name]=createHash('sha256').update(bytes).digest('hex');
  }
  await writeFile('app/icon-manifest.json',JSON.stringify({source:'artandavoodi/control-center',revision,files},null,2)+'\n');
}else {
  if(Object.keys(existing.files).length!==Object.keys(config.icons).length)throw Error('Synchronize the registered Studio icons before building.');
  for(const [name,hash] of Object.entries(existing.files))if(createHash('sha256').update(await readFile(`app/icons/${name}.svg`)).digest('hex')!==hash)throw Error('Registered icon drift: '+name);
}
await build({entryPoints:['app/main.js'],bundle:true,format:'esm',platform:'browser',target:['safari16','chrome110'],outfile:'app/dist/studio.js',minify:true});
