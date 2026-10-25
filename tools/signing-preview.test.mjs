import test from 'node:test';
import assert from 'node:assert/strict';
import {signingPreviewRecord} from '../app/signing-preview.js';
const document={id:'preview',version:1,notice:'Not a contract',sections:[{id:'scope',title:'Scope',text:'Draft content'}]};
test('internal preview requires every initial and explicitly remains non-binding',async()=>{
 await assert.rejects(signingPreviewRecord(document,{name:'Test',scope:'T'}));
 await assert.rejects(signingPreviewRecord(document,{name:'Test',preview_only:true}));
 const record=await signingPreviewRecord(document,{name:'Test',scope:'T',preview_only:true});
 assert.equal(record.executedAgreement,false);assert.equal(record.kind,'non-binding-signing-preview');assert.equal(record.documentHash.length,64);
 const changed=await signingPreviewRecord({...document,version:2},{name:'Test',scope:'T',preview_only:true});assert.notEqual(record.documentHash,changed.documentHash);
});
