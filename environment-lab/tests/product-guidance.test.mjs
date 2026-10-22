import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {localIntent} from '../public/local-intent.mjs';
import {PANEL_GUIDES,LEGACY_GUIDES,statusLabel} from '../public/product-info.mjs';
import {SURFACES} from '../public/specialists.mjs';
import {RELEASE} from '../public/release.mjs';
import {parseConversationStore} from '../public/conversation-store.mjs';
const requests=JSON.parse(await readFile(new URL('./fixtures/local-requests.json',import.meta.url)));
for(const c of requests)test('local request: '+c.prompt,()=>assert.equal(localIntent(c.prompt),c.intent));
test('every contextual surface and retained editor explains input, output and next step',()=>{
 for(const key of [...SURFACES,'about','scope','settings',...Object.values(LEGACY_GUIDES)]){const guide=PANEL_GUIDES[key];assert.ok(guide,key);for(const field of ['purpose','input','output','next'])assert.ok(guide[field].length>20,key+'.'+field);}
});
test('completion language distinguishes reply, artifact, execution and uncertainty',()=>{
 assert.equal(statusLabel('COMPLETE'),'Response ready');assert.equal(statusLabel('SUCCEEDED'),'CPU result verified');assert.equal(statusLabel('RECONCILING'),'External outcome uncertain');assert.notEqual(statusLabel('VALIDATED'),statusLabel('SUCCEEDED'));
});
test('product and package release versions agree while planning version stays separate',async()=>{
 const p=JSON.parse(await readFile(new URL('../package.json',import.meta.url)));assert.equal(p.version,RELEASE.version);assert.equal(RELEASE.planningVersion,'0.2.0');
});
test('damaged local messages cannot crash the transcript after restore',()=>{
 const t={id:'test',title:'A task',status:'COMPLETE',updated:new Date().toISOString(),messages:[{id:'m1',role:'user',text:'Hello'}],context:[],events:[],surfaces:[]},saved={version:1,tasks:[t]};
 assert.equal(parseConversationStore(JSON.stringify(saved)).tasks.length,1);t.messages.push(null);assert.throws(()=>parseConversationStore(JSON.stringify(saved)),/message/);t.messages.pop();t.surfaces.push({id:'x',type:'unregistered',reason:'Unknown'});assert.throws(()=>parseConversationStore(JSON.stringify(saved)),/contextual/);
});
test('local history quota is measured in encoded bytes',()=>assert.throws(()=>parseConversationStore('é'.repeat(1500001)),/3 MB/));
test('restored delegation, measurements and context cannot break evidence rendering',()=>{
 const t={id:'t',title:'Test',status:'COMPLETE',updated:new Date().toISOString(),messages:[],context:[],events:[],surfaces:[],delegations:[],measurements:[]};
 const parse=()=>parseConversationStore(JSON.stringify({version:1,tasks:[t]}));parse();t.delegations={};assert.throws(parse,/delegation/);t.delegations=[];t.measurements=[{operation:'cpu',duration_ms:-1,scope:'Test'}];assert.throws(parse,/measurement/);t.measurements=[];t.context=[{name:'a',content:'é'.repeat(50001)}];assert.throws(parse,/context/);t.context=[{name:'a',content:''},{name:'a',content:''}];assert.throws(parse,/context/);
});
