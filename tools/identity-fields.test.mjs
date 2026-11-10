import {test} from 'node:test';
import assert from 'node:assert/strict';
import {countries,normalizedPhone} from '../app/shared/identity-fields.js';

test('country controls share a complete unique region registry with flags',()=>{
 assert.equal(new Set(countries.map(country=>country.code)).size,countries.length);
 assert.ok(countries.length>=249);
 assert.ok(countries.every(country=>/^[A-Z]{2}$/.test(country.code)&&country.name&&country.flag));
 for(const code of ['HR','US','GB','IR','AQ'])assert.ok(countries.some(country=>country.code===code));
});
test('optional phone numbers normalize without claiming verification',()=>{
 assert.equal(normalizedPhone('','HR'),'');
 assert.equal(normalizedPhone('+1 (202) 555-0123','US'),'+12025550123');
 assert.throws(()=>normalizedPhone('123','HR'));
});
