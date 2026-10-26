import test from 'node:test';
import assert from 'node:assert/strict';
import {colourAssignments,assignmentSelection,assignmentUnavailable} from '../app/graphics-values.js';
test('colour assignments preserve legacy defaults and reject duplicate targets',()=>{
 assert.equal(assignmentSelection(null,0),'icons');assert.equal(assignmentSelection(null,1),'header');
 assert.deepEqual(colourAssignments([{assignment:'ribbon'},{assignment:'icons'},{assignment:'fade'}]),{icons:1,header_fade:2,header_ribbon:0,logo:null});
 assert.throws(()=>colourAssignments([{assignment:'icons'},{assignment:'icons'}]));
 assert.throws(()=>colourAssignments([{assignment:'invalid'}]));
 assert.deepEqual(colourAssignments([]),{icons:null,header_fade:null,header_ribbon:null,logo:null});
 assert.equal(colourAssignments([{assignment:'logo'}]).logo,0);
 assert.equal(assignmentUnavailable([{assignment:'icons'},{assignment:''}],1,'icons'),true);
 assert.equal(assignmentUnavailable([{assignment:'header'},{assignment:''}],1,'fade'),true);
 assert.equal(assignmentUnavailable([{assignment:'icons'},{assignment:''}],0,'icons'),false);
 assert.throws(()=>colourAssignments(Array.from({length:6},()=>({assignment:''}))));
});
