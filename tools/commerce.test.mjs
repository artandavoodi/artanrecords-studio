import test from 'node:test';
import assert from 'node:assert/strict';
import {contract,creatorPath,creatorShopRoute,domainHostname,draftPrice,draftValues,ownDraft} from '../app/commerce-model.js';
test('creator shop routes stay under approved root usernames and reject institutional collisions',()=>{
 assert.equal(creatorPath('artandavoodi',contract,['releases']),'/artandavoodi/shop/');
 assert.throws(()=>creatorPath('shop',contract));assert.throws(()=>creatorPath('releases',contract,['releases']));
 assert.equal(creatorShopRoute('/shop/artandavoodi/',contract),null);
 assert.equal(creatorShopRoute('/artandavoodi/shop/print/',contract).slug,'print');
});
test('domain requests normalize hostnames without claiming verification or accepting URL injection',()=>{
 assert.equal(domainHostname('WWW.Creator.com'),'www.creator.com');assert.equal(domainHostname('bücher.de'),'xn--bcher-kva.de');
 for(const value of ['https://artist.com','artist.com/path','artist.com:443','user@artist.com','*.artist.com','127.0.0.1','localhost','artist.local','studio.artanrecords.com','a.neuroartan.com'])assert.throws(()=>domainHostname(value),value);
});
test('draft pricing is integer-safe and does not infer commissions or recording shares',()=>{
 assert.deepEqual(draftPrice('19.99','EUR'),{price_minor:1999,currency:'EUR'});assert.deepEqual(draftPrice('',''),{price_minor:null,currency:null});
 for(const price of ['-1','1e5','1.001','999999999999999999'])assert.throws(()=>draftPrice(price,'EUR'));
 assert.equal(contract.finance.commission,null);assert.equal(contract.finance.recordingSharesApplyToCommerce,false);assert.ok(Object.values(contract.activation).every(value=>value===false));
});
test('simple products need no variants and edits preserve existing variant and media contracts',()=>{
 const form=new FormData();for(const [key,value]of Object.entries({title:'A score',slug:'a-score',kind:'digital',price:'2.50',currency:'EUR'}))form.set(key,value);
 const simple=draftValues(form,'product');assert.deepEqual(simple.details.variants,[]);assert.equal(simple.details.shipping.required,false);
 const edited=draftValues(form,'product',{schemaVersion:1,variants:[{sku:'score-a'}],media:[{url:'https://images.artist.com/first.png'},{url:'https://images.artist.com/second.png'}],inventory:{policy:'track'}});
 assert.deepEqual(edited.details.variants,[{sku:'score-a'}]);assert.equal(edited.details.inventory.policy,'track');assert.equal(edited.details.media[0].url,'https://images.artist.com/second.png');
 assert.throws(()=>draftValues(form,'product',{schemaVersion:2}));
});
test('creator and storefront ownership come from the verified loaded store, never form fields',()=>{
 const values=ownDraft({title:'A product',creator_id:'forged',store_id:'foreign',account_id:'other',status:'active',id:'forged'},{id:'store-a',creator_id:'creator-a'});
 assert.deepEqual(values,{title:'A product',creator_id:'creator-a',store_id:'store-a'});assert.throws(()=>ownDraft({},null));
});
