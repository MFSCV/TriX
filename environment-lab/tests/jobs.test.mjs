import test from 'node:test';
import assert from 'node:assert/strict';
import {processDelivery} from '../runtime/jobs.mjs';
import {runtimeTask} from '../runtime/orchestrator.mjs';
import {apiHandler} from '../worker/index.js';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('queue CPU diagnostic produces the real reference output and does not invoke a model',async()=>{
 const task=runtimeTask('diagnostic',{servers:[],actions:false});task.id=id;task.diagnostic='cpu';let text=JSON.stringify(task),etag='1';
 const bucket={writeInterval:0,async get(){return {etag,json:async()=>JSON.parse(text)};},async put(k,v,{onlyIf}){if(onlyIf.etagMatches!==etag)return null;text=v;etag=String(Number(etag)+1);return {etag};}};
 const result=await processDelivery({id,kind:'cpu',owner:'test-owner',run_id:id,claim:'claim'}, {BUCKET:bucket});
 assert.equal(result.output.outputs['task-result'],50);assert.equal(result.output.status,'SUCCEEDED');assert.equal(JSON.parse(text).status,'SUCCEEDED');
});
test('orchestrator delivery checks model setup before advancing a runtime step',async()=>{
 let steps=0;const result=await processDelivery({kind:'runtime',run_id:id,owner:'owner'}, {},async()=>{steps++;});
 assert.equal(result.status,'BLOCKED');assert.equal(steps,0);
});
test('partial Supabase config never falls back to R2',async()=>{
 await assert.rejects(()=>apiHandler(new Request('https://trix.test/api/tasks',{headers:{'oai-authenticated-user-id':'owner'}}),{TRIX_SUPABASE_URL:'https://example.supabase.co',BUCKET:{list(){throw Error('Unsafe fallback');}}}),/configuration/);
});
test('Supabase background settings are explicit and server task details retain the setting',async()=>{
 const task=runtimeTask('test',{servers:[],actions:false});assert.equal(task.background,false);
});
test('legacy R2 tasks remain readable and stop in R2 when Supabase is primary',async t=>{
 const saved=runtimeTask('legacy',{servers:[],actions:false});let stored=JSON.stringify(saved),writes=0;
 const env={TRIX_SUPABASE_URL:'https://example.supabase.co',TRIX_SUPABASE_BRIDGE_TOKEN:'bridge-token',BUCKET:{writeInterval:0,async get(){return {etag:'old',json:async()=>JSON.parse(stored)};},async put(k,text){writes++;stored=text;return {etag:'next'};},async list(){return {objects:[{key:'conversations/owner/'+saved.id}],truncated:false};}}};
 t.mock.method(globalThis,'fetch',async(url,options)=>{const {operation}=JSON.parse(options.body);assert.notEqual(operation,'run_put');return Response.json(operation==='run_list'?{objects:[],truncated:false}:{record:null});});
 const listed=await (await apiHandler(new Request('https://trix.test/api/tasks',{headers:{'oai-authenticated-user-id':'owner'}}),env)).json();assert.equal(listed.tasks[0].id,saved.id);
 const stopped=await apiHandler(new Request('https://trix.test/api/tasks/'+saved.id+'/stop',{method:'POST',headers:{origin:'https://trix.test','oai-authenticated-user-id':'owner'},body:'{}'}),env);assert.equal(stopped.status,200);assert.equal(writes,1);assert.equal(JSON.parse(stored).status,'STOPPED');
});
test('background can be enabled during an owned foreground step without replacing its lease',async t=>{
 const saved=runtimeTask('continue active work',{servers:[],actions:false});saved.lock={token:'foreground-owner',until:Date.now()+60000};let document=structuredClone(saved),queued=0;
 t.mock.method(globalThis,'fetch',async(url,options)=>{const body=JSON.parse(options.body);if(body.operation==='health')return Response.json({modelReady:true});if(body.operation==='run_get')return Response.json({record:{document,etag:'1'}});if(body.operation==='run_put'){document=body.arguments.document;return Response.json({etag:'2'});}if(body.operation==='queue_enqueue'){queued++;return Response.json({status:'QUEUED'});}throw Error('Unexpected operation');});
 const env={TRIX_SUPABASE_URL:'https://example.supabase.co',TRIX_SUPABASE_BRIDGE_TOKEN:'bridge-token'};
 const r=await apiHandler(new Request('https://trix.test/api/tasks/'+saved.id+'/background',{method:'POST',headers:{origin:'https://trix.test','oai-authenticated-user-id':'owner'},body:'{"enabled":true}'}),env),data=await r.json();
 assert.equal(data.task.background,true);assert.equal(document.lock.token,'foreground-owner');assert.equal(queued,1);
});
function checkpointBucket(task,toggle){let document=structuredClone(task),etag=1,reads=0;return {writeInterval:0,async get(){reads++;if(reads===2&&toggle!==undefined){document.background=toggle;etag++;}return {etag:String(etag),json:async()=>structuredClone(document)};},async put(k,text,{onlyIf}){if(onlyIf.etagMatches!==String(etag))return null;document=JSON.parse(text);etag++;return {etag:String(etag)};},snapshot:()=>document};}
const readTask=background=>{const task=runtimeTask('Read scoped documentation',{servers:['fixture'],actions:false});task.background=background;task.frames[0].role='integrations';task.frames[0].pending=[{type:'function_call',name:'mcp',call_id:'fixture-call',arguments:JSON.stringify({server:'fixture',tool:'read',arguments_json:'{}'})}];return task;};
const readEnv={TRIX_MCP_SERVERS:JSON.stringify([{id:'fixture',url:'https://mcp.example.org/mcp',tools:[{name:'read',purpose:'read',roles:['integrations']}]}])};
test('revoked background delivery executes no pending tool before acquiring its task lease',async t=>{
 const task=readTask(false),bucket=checkpointBucket(task);let requests=0;t.mock.method(globalThis,'fetch',async()=>{requests++;throw Error('No dispatch expected');});
 const result=await processDelivery({kind:'runtime',run_id:task.id,owner:'owner'},{...readEnv,BUCKET:bucket,OPENAI_API_KEY:'fixture',TRIX_MODEL:'fixture',TRIX_QUEUE_JOB:'job'});
 assert.equal(requests,0);assert.equal(bucket.snapshot().steps,0);assert.equal(result.status,'REVOKED');
});
for(const [before,after] of [[true,false],[false,true]])test(`foreground checkpoint preserves concurrent background toggle ${before} to ${after}`,async t=>{
 const task=readTask(before),bucket=checkpointBucket(task,after);t.mock.method(globalThis,'fetch',async()=>{throw Error('Simulated provider interruption after the checkpoint');});
 await apiHandler(new Request('https://trix.test/api/tasks/'+task.id+'/step',{method:'POST',headers:{origin:'https://trix.test','oai-authenticated-user-id':'owner'},body:'{}'}),{...readEnv,BUCKET:bucket});
 assert.equal(bucket.snapshot().background,after);assert.equal(bucket.snapshot().effects[0].state,'UNKNOWN');
});
test('queue opt-out after claiming prevents external dispatch at the checkpoint',async t=>{
 const task=readTask(true),bucket=checkpointBucket(task,false);let requests=0;t.mock.method(globalThis,'fetch',async()=>{requests++;throw Error('No external dispatch expected');});
 const result=await processDelivery({kind:'runtime',run_id:task.id,owner:'owner'},{...readEnv,BUCKET:bucket,OPENAI_API_KEY:'fixture',TRIX_MODEL:'fixture',TRIX_QUEUE_JOB:'job'});
 assert.equal(requests,0);assert.equal(bucket.snapshot().background,false);assert.equal(bucket.snapshot().effects[0].state,'NOT_DISPATCHED');assert.equal(result.status,'REVOKED');
});
