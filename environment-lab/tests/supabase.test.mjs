import test from 'node:test';
import assert from 'node:assert/strict';
import {supabaseConfigured,SupabaseStore,backendCall} from '../runtime/supabase.mjs';
const env={TRIX_SUPABASE_URL:'https://example.supabase.co',TRIX_SUPABASE_BRIDGE_TOKEN:'test-server-token'};
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',prefix='conversations/owner%2Fa/';
test('Supabase configuration fails closed when partial or not a project HTTPS URL',()=>{
 assert.equal(supabaseConfigured({}),false);assert.equal(supabaseConfigured(env),true);
 for(const e of [{TRIX_SUPABASE_URL:env.TRIX_SUPABASE_URL},{...env,TRIX_SUPABASE_URL:'http://localhost'},{...env,TRIX_SUPABASE_URL:env.TRIX_SUPABASE_URL+'?x=y'}])assert.throws(()=>supabaseConfigured(e),/configuration/i);
});
test('Supabase adapter binds every key and list to its trusted owner',async()=>{
 const calls=[],store=new SupabaseStore(env,'owner/a',async(url,options)=>{calls.push(JSON.parse(options.body));return Response.json({record:{document:{id},etag:'7'},objects:[],truncated:false});});
 const r=await store.get(prefix+id);assert.equal((await r.json()).id,id);assert.equal(r.etag,'7');
 assert.equal(calls[0].arguments.owner,'owner/a');assert.equal(calls[0].arguments.id,id);
 await assert.rejects(()=>store.get('conversations/other/'+id),/owner/i);await assert.rejects(()=>store.list({prefix:'conversations/other/',limit:40}),/owner/i);
});
test('Supabase CAS collision returns no write and backend failures never echo provider secrets',async()=>{
 const store=new SupabaseStore(env,'owner/a',async()=>Response.json({conflict:true}));
 assert.equal(await store.put(prefix+id,JSON.stringify({id}),{onlyIf:{etagMatches:'7'}}),null);
 await assert.rejects(()=>backendCall(env,'run_get',{},async()=>new Response('SUPER_SECRET_PROVIDER_ERROR',{status:500})),e=>!e.message.includes('SUPER_SECRET')&&e.status===503);
});
test('Supabase requests use a server token only in the bridge Authorization header',async()=>{
 let captured;await backendCall(env,'health',{},async(url,options)=>{captured={url,...options};return Response.json({ok:true});});
 assert.equal(captured.headers.Authorization,'Bearer test-server-token');assert.ok(!captured.url.includes('test-server-token'));assert.ok(!captured.body.includes('test-server-token'));
});
test('queue workers carry a fencing token on checkpoint writes and stale claims fail closed',async()=>{
 let sent;const store=new SupabaseStore({...env,TRIX_QUEUE_JOB:'job-id',TRIX_QUEUE_CLAIM:'claim-id'},'owner/a',async(url,options)=>{sent=JSON.parse(options.body);return Response.json({fenced:true});});
 await assert.rejects(()=>store.put(prefix+id,JSON.stringify({id}),{onlyIf:{etagMatches:'7'}}),e=>e.status===409);
 assert.equal(sent.arguments.job_id,'job-id');assert.equal(sent.arguments.job_claim,'claim-id');
});
test('queue delivery metadata is visible on reads and never written back into a checkpoint',async()=>{
 let write;const store=new SupabaseStore(env,'owner/a',async(url,options)=>{const body=JSON.parse(options.body);if(body.operation==='run_get')return Response.json({record:{document:{id},etag:'7',queue:{status:'FAILED',attempts:5}}});write=body.arguments.document;return Response.json({etag:'8'});});
 const record=await store.get(prefix+id),task=await record.json();assert.equal(task.backgroundQueue.status,'FAILED');await store.put(prefix+id,JSON.stringify(task),{onlyIf:{etagMatches:record.etag}});assert.equal('backgroundQueue' in write,false);
});
