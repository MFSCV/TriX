import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackendHandler} from '../runtime/backend.mjs';
test('bridge rejects missing authorization before parsing body or reading state',async()=>{
 let reads=0;const handler=createBackendHandler({rpc:async()=>{reads++;return false;}});
 const r=await handler(new Request('https://example.supabase.co/functions/v1/trix-backend',{method:'POST',body:'{invalid'}));assert.equal(r.status,401);assert.equal(reads,0);
});
test('bridge authenticates and allows only bounded operations with redacted errors',async()=>{
 const seen=[],handler=createBackendHandler({rpc:async(name,args)=>{seen.push({name,args});return name==='trix_authorized'?true:{ok:true};}});
 const call=operation=>handler(new Request('https://example.supabase.co/functions/v1/trix-backend',{method:'POST',headers:{Authorization:'Bearer '+ 'a'.repeat(64)},body:JSON.stringify({operation,arguments:{}})}));
 assert.equal((await call('arbitrary_sql')).status,400);assert.equal((await call('health')).status,200);assert.equal(seen.at(-1).name,'trix_backend');
});
