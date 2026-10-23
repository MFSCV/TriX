// Explicit live test. Configuration arrives on hidden stdin, never command arguments.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {backendCall,SupabaseStore} from '../runtime/supabase.mjs';
import {runtimeTask} from '../runtime/orchestrator.mjs';
if(process.stdin.isTTY)process.stdin.setRawMode(true);console.log('Ready for hidden Supabase test configuration.');
const config=await new Promise(resolve=>{let input='';process.stdin.on('data',chunk=>{input+=chunk;if(input.includes('\n')){process.stdin.pause();resolve(JSON.parse(input.slice(0,input.indexOf('\n'))));}});});
const env=config.env,measurements=[],checks=[];
async function check(name,fn){const start=performance.now();await fn();checks.push({name,status:'passed'});measurements.push({name,duration_ms:Number((performance.now()-start).toFixed(3))});}
const owner='verification-a-'+crypto.randomUUID(),other='verification-b-'+crypto.randomUUID(),store=new SupabaseStore(env,owner),otherStore=new SupabaseStore(env,other),task=runtimeTask('Supabase infrastructure acceptance: synthetic record',{servers:[],actions:false}),key=store.prefix+task.id;
await check('authenticated backend health',async()=>assert.equal((await backendCall(env,'health')).ok,true));
await check('conditional run create and durable read',async()=>{assert.ok(await store.put(key,JSON.stringify(task),{onlyIf:{etagDoesNotMatch:'*'}}));assert.equal((await (await store.get(key)).json()).id,task.id);});
await check('cross-owner read and overwrite denied',async()=>{assert.equal(await otherStore.get(otherStore.prefix+task.id),null);assert.equal(await otherStore.put(otherStore.prefix+task.id,JSON.stringify(task),{onlyIf:{etagDoesNotMatch:'*'}}),null);});
await check('concurrent CAS has one winner',async()=>{const r=await store.get(key),results=await Promise.all([store.put(key,JSON.stringify({...task,title:'first'}),{onlyIf:{etagMatches:r.etag}}),store.put(key,JSON.stringify({...task,title:'second'}),{onlyIf:{etagMatches:r.etag}})]);assert.equal(results.filter(Boolean).length,1);});
let file;
await check('private immutable UTF-8 storage roundtrip',async()=>{const content='TriX synthetic acceptance ✓\nResult 50';file=(await backendCall(env,'file_put',{owner,id:task.id,bucket:'artifacts',name:'acceptance.txt',content})).file;const r=await backendCall(env,'file_read',{owner,id:task.id,bucket:'artifacts',sha256:file.sha256});assert.equal(r.content,content);assert.equal(r.file.sha256,file.sha256);const again=await backendCall(env,'file_put',{owner,id:task.id,bucket:'artifacts',name:'acceptance.txt',content});assert.equal(again.file.path,file.path);});
await check('cross-owner file access denied',async()=>{await assert.rejects(()=>backendCall(env,'file_read',{owner:other,id:task.id,bucket:'artifacts',sha256:file.sha256}));});
await check('bridge rejects missing and invalid token',async()=>{for(const token of ['', 'x'.repeat(64)]){const r=await fetch(env.TRIX_SUPABASE_URL+'/functions/v1/trix-backend',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({operation:'health',arguments:{}})});assert.equal(r.status,401);}});
const result={schema:'trix.supabase-acceptance/v1',created_at:new Date().toISOString(),scope:'Real hosted Edge bridge, Postgres CAS and private Storage; synthetic identities and records. No model or target deployment acceptance.',checks,measurements};
await writeFile(new URL('../reports/supabase-v0.6.0.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
