import {backendCall} from './supabase.mjs';
import {apiHandler} from '../worker/index.js';
export async function processDelivery(job,env,step=apiHandler){
 if(job.kind!=='cpu'&&(!env.OPENAI_API_KEY||!env.TRIX_MODEL))return {status:'BLOCKED',reason:'Background model connection is required.'};
 const origin='https://trix-internal.invalid';
 const r=await step(new Request(origin+'/api/tasks/'+job.run_id+'/step',{method:'POST',headers:{origin,'Content-Type':'application/json','oai-authenticated-user-id':job.owner},body:'{}'}),env);
 if(!r.ok)throw Error('Stored runtime step could not complete.');const result=await r.json();
 return {status:result.skipped||job.kind!=='cpu'&&!result.task.background?'REVOKED':result.busy?'RETRY':result.task.status,output:result.task.surfaces?.findLast(s=>s.type==='reference'&&s.result)?.result||null};
}
export async function processQueue({rpc,env}){
 const claimed=await rpc('trix_queue',{operation:'claim',arguments:{}});if(!claimed.job)return {processed:false};const job=claimed.job;
 try{
  const config=await rpc('trix_runtime_config',{}),runtimeEnv={...env,...config,TRIX_QUEUE_JOB:job.id,TRIX_QUEUE_CLAIM:job.claim};
  const result=await processDelivery(job,runtimeEnv);
  if(result.output)await backendCall(env,'file_put',{owner:job.owner,id:job.run_id,bucket:'artifacts',name:'TriX_CPU_Result.json',content:JSON.stringify(result.output,null,2)});
  const finished=await rpc('trix_queue',{operation:'finish',arguments:{id:job.id,claim:job.claim,result}});
  return {processed:true,accepted:finished.accepted,status:result.status};
 }catch{
  const finished=await rpc('trix_queue',{operation:'finish',arguments:{id:job.id,claim:job.claim,result:{status:'RETRY',reason:'The processor could not confirm the runtime step.'}}});
  return {processed:true,accepted:finished.accepted,status:'RETRY'};
 }
}
