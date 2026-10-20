/* Owner-run review export only. It never writes a public catalogue or deploys. */
import {readFile,writeFile} from 'node:fs/promises';
import {catalogueSelection,releaseSelection,artistMetadata,releaseMetadata} from '../app/metadata-values.js';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Provide a private review record and a new output filename.');
const schema=JSON.parse(await readFile(new URL('../content/metadata.json',import.meta.url),'utf8'));
const record=JSON.parse(await readFile(input,'utf8'));
if(record.approval?.status!=='approved'||!record.approval.reference||!record.approval.reviewedBy)throw Error('A documented owner review is required.');
const metadata=artistMetadata(record.metadata||{},schema);
const result={schemaVersion:1,artist:catalogueSelection(record.profile||{},metadata,schema),releases:(record.releases||[]).map(release=>releaseSelection(releaseMetadata(release,schema),schema))};
await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('Wrote selected catalogue fields for owner review; nothing was published.');
