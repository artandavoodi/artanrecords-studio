import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {normalizeAccountUsernameInput,validateAccountUsernamePolicy} from '../app/neuroartan/assets/js/layers/website/system/account/username/account-username-policy.js';
import {catalogueSelection} from '../app/metadata-values.js';
const policy=JSON.parse(await readFile(new URL('../app/neuroartan/assets/data/account/username/username-policy.json',import.meta.url),'utf8'));
const registry=JSON.parse(await readFile(new URL('../app/neuroartan/assets/data/account/username/reserved-usernames.json',import.meta.url),'utf8'));
test('artist handles use the pinned Neuroartan policy and reserved prefixes',async()=>{assert.equal(normalizeAccountUsernameInput(' Example Music '),'example.music');assert.equal((await validateAccountUsernamePolicy('google.artist',{policy,registry})).ok,false);assert.equal((await validateAccountUsernamePolicy('testmusician95',{policy,registry})).ok,true);assert.equal((await validateAccountUsernamePolicy('ab',{policy,registry})).ok,false);});
test('portrait permission notes cannot enter a public export',async()=>{const schema=JSON.parse(await readFile(new URL('../content/metadata.json',import.meta.url),'utf8'));assert.deepEqual(catalogueSelection({}, {portrait_permission:'Private notes',visibility:{portrait_permission:'public'}},schema),{});});
