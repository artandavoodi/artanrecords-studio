import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationLinks} from '../app/artist-navigation-values.js';
test('artist navigation accepts explicit safe links and excludes incomplete and unsafe addresses',()=>{
 assert.deepEqual(navigationLinks([{label:'Music',url:'#music'},{label:'',url:''}]),[{label:'Music',url:'#music'}]);
 for(const url of ['javascript:alert(1)','http://example.test','https://user:password@example.test',''])assert.throws(()=>navigationLinks([{label:'Test',url}]));
 assert.throws(()=>navigationLinks(Array.from({length:9},()=>({label:'Music',url:'#music'}))));
});
