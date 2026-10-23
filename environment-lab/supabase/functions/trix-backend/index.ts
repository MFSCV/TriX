// Generated runtime.mjs shares the tested Worker API and agent policy.
import {createBackendHandler,createRpcClient,processQueue} from './runtime.mjs';
const url=Deno.env.get('SUPABASE_URL');
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const rpc=createRpcClient(url,serviceKey);
Deno.serve(request=>createBackendHandler({url,serviceKey,rpc,processJob:()=>processQueue({rpc,env:{TRIX_SUPABASE_URL:url,TRIX_SUPABASE_BRIDGE_TOKEN:request.headers.get('Authorization').slice(7)}})})(request));
