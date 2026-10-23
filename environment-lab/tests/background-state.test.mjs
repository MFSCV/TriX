import test from 'node:test';
import assert from 'node:assert/strict';
import {backgroundState} from '../public/background-state.mjs';
test('an exhausted delivery renders a failure and stops polling even when its runtime checkpoint remains RUNNING',()=>{
 const state=backgroundState({status:'RUNNING',background:true,backgroundQueue:{status:'FAILED',attempts:5}});
 assert.equal(state.failed,true);assert.equal(state.pending,false);assert.equal(state.label,'Background delivery failed');assert.match(state.message,/operator review/i);
});
test('artifact retry exhaustion remains visible after a successful CPU result',()=>{
 const state=backgroundState({status:'SUCCEEDED',background:true,backgroundQueue:{status:'FAILED',attempts:5}});assert.equal(state.failed,true);assert.equal(state.pending,false);
});
test('completed runtime output keeps polling while its artifact delivery is still queued',()=>{
 const state=backgroundState({status:'SUCCEEDED',background:true,backgroundQueue:{status:'QUEUED',attempts:2}});assert.equal(state.pending,true);assert.equal(state.failed,false);
});
