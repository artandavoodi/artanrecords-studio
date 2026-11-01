import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {percentageBasisPoints,percentageLabel,shareDates} from '../app/share-values.js';
import {sharesMarkup} from '../app/shares-render.mjs';
import {domainsMarkup} from '../app/domains-render.mjs';
test('share percentages use exact basis points and never silently round',()=>{
 for(const [input,expected]of [['0',0],['0.01',1],['12.34',1234],['99.99',9999],['100.00',10000]])assert.equal(percentageBasisPoints(input),expected);
 for(const input of ['','-1','100.01','1e2','1,25','1.234','Infinity','NaN','0x10'])assert.throws(()=>percentageBasisPoints(input));
 for(const [bps,label]of [[0,'0%'],[1,'0.01%'],[1200,'12%'],[10000,'100%']])assert.equal(percentageLabel(bps),label);
});
test('effective dates reject rollover and inverted periods',()=>{
 assert.deepEqual(shareDates('2028-02-29',''),{effective_start:'2028-02-29',effective_end:null});
 for(const dates of [['2026-02-29',''],['2026-11-01','2026-10-31'],['not-a-date','']])assert.throws(()=>shareDates(...dates));
});
test('Shares and Domains keep commercial actions and website/store controls separate',()=>{
 const e=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),icon=name=>`<i data-icon="${name}"></i>`;
 const shares=sharesMarkup(e,icon),domains=domainsMarkup(e,icon);
 assert.match(shares,/data-share-contribution/);assert.match(shares,/data-share-proposal/);assert.match(shares,/data-share-invitations/);assert.match(shares,/No paid Studio plan/);
 assert.doesNotMatch(shares,/Activate share|Withdraw|Send payment/);
 assert.match(domains,/data-domain-form="profile"/);assert.match(domains,/data-domain-form="store"/);assert.doesNotMatch(domains,/data-commerce-prepare/);
});
test('every configured Shares concept and role uses a registered pending or supplied icon',async()=>{
 const config=JSON.parse(await readFile(new URL('../content/revenue-shares.json',import.meta.url))),account=JSON.parse(await readFile(new URL('../content/account.json',import.meta.url)));
 for(const item of [...config.tabs,...config.scopes,...config.responses])assert.ok(account.icons[item.icon],item.icon);
 for(const status of Object.keys(config.statuses))assert.ok(account.icons['shares-status-'+status],status);
});
