import {test} from 'node:test';
import assert from 'node:assert/strict';
import {concertValues} from '../app/concerts.js';
const base={title:'Piano night',starts_at:'2026-12-01T20:00',ends_at:'2026-12-01T22:00',timezone:'Europe/Berlin',venue:'Concert hall',city:'Berlin',country:'de',ticket_url:'https://tickets.example/event',ticket_price:'20',currency:'eur',announcement:'An acoustic evening.'};
test('concert times use the event zone and exclude client publication privileges',()=>{
 const value=concertValues(new Map(Object.entries({...base,status:'published',account_id:'other'})));
 assert.equal(value.starts_at,'2026-12-01T19:00:00.000Z');assert.equal(value.country,'DE');assert.equal(value.currency,'EUR');assert.equal(value.ticket_price,20);assert.equal(value.status,undefined);assert.equal(value.account_id,undefined);
});
test('concert validation rejects insecure ticket links, invalid dates and negative prices',()=>{
 for(const change of [{ticket_url:'javascript:alert(1)'},{ticket_url:'https://user:pass@tickets.example'},{ticket_price:'-1'},{ends_at:'2026-12-01T19:00'},{starts_at:'2026-03-29T02:30'},{timezone:'not/a-zone'}])assert.throws(()=>concertValues(new Map(Object.entries({...base,...change}))));
});
