import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
const config=JSON.parse(await readFile('content/site.json','utf8'));
const paths=config.pages.map(p=>p.path.slice(1)+'index.html').concat(['search.json','sitemap.xml','robots.txt','CNAME']);
const before=await Promise.all(paths.map(p=>readFile(p,'utf8')));
execFileSync(process.execPath,['foundation/build.mjs'],{stdio:'inherit'});
for(let i=0;i<paths.length;i++)if(before[i]!==await readFile(paths[i],'utf8'))throw Error('Stale generated output: '+paths[i]);
for(const path of config.pages){const html=await readFile(path.path.slice(1)+'index.html','utf8');if((html.match(/<h1>/g)||[]).length!==1||html.includes('{{'))throw Error('Invalid document');}
console.log('PASS: deterministic output, shared checksums and document structure.');
