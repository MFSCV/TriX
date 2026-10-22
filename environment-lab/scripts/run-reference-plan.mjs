#!/usr/bin/env node
import {readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parsePlan,executePlan,verifyPlan} from '../public/reference-plan.mjs';
export async function runFile(input,{statePath=null}={}){
 const text=await readFile(input,'utf8'),plan=parsePlan(text),verification=verifyPlan(plan);
 if(!verification.valid)return {status:'REJECTED',issues:verification.issues};
 const digest=createHash('sha256').update(JSON.stringify(plan)).digest('hex');
 if(!statePath)return {...executePlan(plan),plan_sha256:digest};
 if(resolve(input)===resolve(statePath))throw new Error('State output must not replace the input plan.');
 const lockPath=statePath+'.lock';let lock;
 try {lock=await open(lockPath,'wx',0o600);}catch(e){if(e.code==='EEXIST')throw new Error('State is locked. Reconcile the previous process before removing a stale lock.');throw e;}
 const temp=statePath+'.'+process.pid+'.tmp';
 try{
  let previous;
  try{previous=JSON.parse(await readFile(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(previous){if(previous.plan_sha256!==digest)throw new Error('State belongs to a different plan.');if(previous.status==='SUCCEEDED'){const checked=executePlan(plan);if(previous.schema!=='trix.reference-cpu-state/v0.1'||checked.status!=='SUCCEEDED'||JSON.stringify(previous.outputs)!==JSON.stringify(checked.outputs)||JSON.stringify(previous.trace)!==JSON.stringify(checked.trace))throw new Error('Saved pure result failed deterministic revalidation.');return {...previous,reused_completed_pure_result:true};}}
  const save=async record=>{await writeFile(temp,JSON.stringify(record,null,2),{mode:0o600});await rename(temp,statePath);};
  await save({schema:'trix.reference-cpu-state/v0.1',plan_sha256:digest,status:'RUNNING',notice:'Experimental pure-plan checkpoint; no distributed or power-loss durability claim.'});
  const result={schema:'trix.reference-cpu-state/v0.1',...executePlan(plan),plan_sha256:digest};await save(result);return result;
 }finally{await lock.close();await unlink(lockPath);await unlink(temp).catch(()=>{});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);if(!args[0]||args.length!==1&&!(args.length===3&&args[1]==='--state')){console.error('Usage: node scripts/run-reference-plan.mjs PLAN.json [--state STATE.json]');process.exitCode=2;}
 else try{const result=await runFile(args[0],{statePath:args[2]||null});console.log(JSON.stringify(result,null,2));if(result.status!=='SUCCEEDED')process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}
}
