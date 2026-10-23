import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {SupabaseStore,backendCall} from '../runtime/supabase.mjs';
import {apiHandler} from '../worker/index.js';
import {runtimeTask} from '../runtime/orchestrator.mjs';
if(process.stdin.isTTY)process.stdin.setRawMode(true);console.log('Ready for hidden Supabase queue test configuration.');
const {env}=await new Promise(resolve=>{let input='';process.stdin.on('data',chunk=>{input+=chunk;if(input.includes('\n')){process.stdin.pause();resolve(JSON.parse(input.slice(0,input.indexOf('\n'))));}});});
const owner='queue-verification-'+crypto.randomUUID(),store=new SupabaseStore(env,owner),checks=[],measurements=[];
async function check(name,fn){const start=performance.now();await fn();checks.push({name,status:'passed'});measurements.push({name,duration_ms:Number((performance.now()-start).toFixed(3))});console.log('Passed: '+name);}
const request=(path,body)=>new Request('https://trix.test'+path,{method:'POST',headers:{origin:'https://trix.test','Content-Type':'application/json','oai-authenticated-user-id':owner},body:JSON.stringify(body)});
const health=await backendCall(env,'health');assert.equal(health.scheduler,true);assert.equal(health.modelReady,false);
let diagnostic;
await check('authenticated Worker creates a queued CPU diagnostic without model credentials',async()=>{const r=await apiHandler(request('/api/diagnostics/cpu',{}),env);assert.equal(r.status,201);diagnostic=(await r.json()).task;assert.equal(diagnostic.background,true);});
await check('Cron executes CPU output 50 without a browser or manual dispatcher call',async()=>{
 for(let i=0;i<65;i++){const t=await (await store.get(store.prefix+diagnostic.id)).json();if(t.status==='SUCCEEDED'&&t.backgroundQueue?.status==='DONE'){assert.equal(t.surfaces.at(-1).result.outputs['task-result'],50);assert.equal(t.steps,1);diagnostic=t;return;}if(['PAUSED','FAILED','STOPPED'].includes(t.status))throw Error('Unexpected diagnostic status: '+t.status);await new Promise(r=>setTimeout(r,2000));}throw Error('Scheduled diagnostic did not finish within acceptance window.');
});
await check('duplicate enqueue cannot re-execute a completed diagnostic',async()=>{const before=await store.get(store.prefix+diagnostic.id),r=await backendCall(env,'queue_enqueue',{owner,id:diagnostic.id,kind:'cpu'});assert.equal(r.deduplicated,true);const after=await store.get(store.prefix+diagnostic.id);assert.equal(before.etag,after.etag);assert.equal((await after.json()).steps,1);assert.equal((await after.json()).backgroundQueue.status,'DONE');});
await check('background AI cannot be enabled without the processor model connection',async()=>{const ordinary=runtimeTask('Verify background model setup gate',{servers:[],actions:false});await store.put(store.prefix+ordinary.id,JSON.stringify(ordinary),{onlyIf:{etagDoesNotMatch:'*'}});const r=await apiHandler(request('/api/tasks/'+ordinary.id+'/background',{enabled:true}),env);assert.equal(r.status,409);assert.match((await r.json()).error,/background model connection is required/i);assert.equal((await (await store.get(store.prefix+ordinary.id)).json()).background,false);});
const stopped=runtimeTask('Stop before dispatch',{servers:[],actions:false});stopped.diagnostic='cpu';stopped.background=true;
const expired=runtimeTask('Expired step lease recovery',{servers:[],actions:false});expired.diagnostic='cpu';expired.background=true;expired.lock={token:crypto.randomUUID(),until:Date.now()-1000};
const unknown=runtimeTask('Unknown external effect recovery',{servers:[],actions:false});unknown.diagnostic='cpu';unknown.background=true;unknown.lock={token:crypto.randomUUID(),until:Date.now()-1000};unknown.effects=[{id:crypto.randomUUID(),state:'UNKNOWN',purpose:'implement'}];
for(const t of [stopped,expired,unknown]){await store.put(store.prefix+t.id,JSON.stringify(t),{onlyIf:{etagDoesNotMatch:'*'}});await backendCall(env,'queue_enqueue',{owner,id:t.id,kind:'cpu'});}
await apiHandler(request('/api/tasks/'+stopped.id+'/stop',{}),env);
await check('stop survives delivery; expired leases pause; unknown effects require reconciliation',async()=>{
 // Invoke the already authenticated dispatcher for recovery tests; only the first diagnostic proves Cron.
 for(let i=0;i<3;i++)await backendCall(env,'process');
 const tasks=await Promise.all([stopped,expired,unknown].map(async t=>(await (await store.get(store.prefix+t.id)).json())));
 assert.deepEqual(tasks.map(t=>t.status),['STOPPED','PAUSED','RECONCILING']);assert.ok(tasks.every(t=>t.surfaces.length===0));assert.equal(tasks[2].effects[0].state,'UNKNOWN');
});
const report={schema:'trix.queue-acceptance/v1',created_at:new Date().toISOString(),scope:'Real hosted Cron → pg_net → authenticated Edge consumer → Postgres runtime CAS. Synthetic CPU graph, no model, browser or external implementation. Recovery tests additionally invoke the authenticated dispatcher.',checks,measurements,scheduledDetection_ms:measurements.find(m=>m.name.startsWith('Cron executes')).duration_ms,output:50,modelReady:health.modelReady};
await writeFile(new URL('../reports/queue-v0.6.0.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
