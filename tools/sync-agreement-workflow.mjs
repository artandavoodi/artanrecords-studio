import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),manifestPath='app/agreement-workflow-manifest.json';
const sources={
 'app/shared/signature-library.js':'assets/js/layers/control-center/operations/shared/signature-library.js',
 'assets/brand/email-wordmark.png':'assets/brand/email-wordmark.png',
 'app/shared/agreement-rehearsal.js':'assets/js/layers/control-center/operations/shared/agreement-rehearsal.js',
 'app/shared/agreement-pdf.js':'assets/js/layers/control-center/operations/shared/agreement-pdf.js',
 'app/shared/agreement-pdf-view.js':'assets/js/layers/control-center/operations/shared/agreement-pdf-view.js',
 'app/shared/agreement-signature.js':'assets/js/layers/control-center/operations/shared/agreement-signature.js',
 'app/shared/agreement-guide.js':'assets/js/layers/control-center/operations/shared/agreement-guide.js',
 'app/shared/NotoSans-Regular.ttf':'assets/js/layers/control-center/operations/shared/NotoSans-Regular.ttf',
 'app/shared/NotoSans-LICENSE.txt':'assets/js/layers/control-center/operations/shared/NotoSans-LICENSE.txt',
 'app/shared/agreement-rehearsal.css':'assets/css/layers/control-center/shared/agreement-rehearsal.css',
 'content/agreement-rehearsal.json':'assets/data/control-center/agreement-rehearsal.json'
};
if(process.argv.includes('--sync')){
 const source='../control-center',revision=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),files={};await mkdir('app/shared',{recursive:true});
 for(const [target,file] of Object.entries(sources)){const bytes=execFileSync('git',['-C',source,'show',revision+':'+file]);if(hash(bytes)!==hash(await readFile(source+'/'+file)))throw Error('Commit the agreement owner before synchronization');await writeFile(target,bytes);files[target]=hash(bytes);}
 await writeFile(manifestPath,JSON.stringify({source:'artandavoodi/control-center',revision,files},null,2)+'\n');
}
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
for(const target of Object.keys(sources))if(hash(await readFile(target))!==manifest.files[target])throw Error('Shared agreement workflow drift: '+target);
