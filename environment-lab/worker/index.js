import {RELEASE} from '../public/release.mjs';
import {serverConfig,LIMITS} from '../runtime/policy.mjs';
import {SPECIALISTS} from '../public/specialists.mjs';
import {runtimeTask,runtimeId,runtimeNow,event,executeRuntimeStep,contextIndex} from '../runtime/orchestrator.mjs';
import {checkedEnvironment} from '../runtime/local-tools.mjs';
const jsonResponse=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export function validContext(notes){return Array.isArray(notes)&&notes.length<=8&&notes.every(c=>c&&typeof c.name==='string'&&c.name.length>0&&c.name.length<=120&&typeof c.content==='string'&&new TextEncoder().encode(c.content).length<=100000)&&new Set(notes.map(c=>c.name)).size===notes.length;}
const publicTask=t=>({id:t.id,title:t.title,created:t.created,updated:t.updated,version:t.version,status:t.status,messages:t.messages,events:t.events,surfaces:t.surfaces,delegations:t.delegations,effects:t.effects,receipts:t.receipts,revision:t.revision,iteration:t.iteration,steps:t.steps,tokens:t.tokens,grant:t.grant,locked:!!t.lock,context:t.context});
async function readRecord(bucket,key){const obj=await bucket.get(key);return obj?{task:await obj.json(),etag:obj.etag}:null;}
async function persistRecord(bucket,key,task,etag){
 // R2 permits one write per second to a key. Pace checkpoints, including stop/CAS.
 const pause=etag?Math.max(0,1100-(Date.now()-Date.parse(task.updated))):0;if(pause)await new Promise(resolve=>setTimeout(resolve,pause));
 task.updated=runtimeNow();task.version++;const text=JSON.stringify(task);if(new TextEncoder().encode(text).length>1200000)throw Error('Task storage limit reached.');
 const result=await bucket.put(key,text,{onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});if(!result)throw Object.assign(Error('Task changed in another request. Refresh before continuing.'),{status:409});return result.etag;
}
export async function apiHandler(request,env){
 const path=new URL(request.url).pathname;
 if(request.method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)return jsonResponse({error:'Same-origin request required.'},403);
 const servers=serverConfig(env);
 if(path==='/api/status'&&request.method==='GET')return jsonResponse({version:RELEASE.version,channel:RELEASE.channel,modelVerification:'not-established-by-configuration',model:!!(env.OPENAI_API_KEY&&env.TRIX_MODEL),modelName:env.TRIX_MODEL||null,persistence:!!env.BUCKET,specialists:SPECIALISTS,limits:LIMITS,servers:servers.map(s=>({id:s.id,name:s.name||s.id,host:new URL(s.url).host,tools:s.tools.map(t=>({name:t.name,purpose:t.purpose,roles:t.roles,fixedArguments:t.fixedArguments||{}}))}))});
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return jsonResponse({error:'Sign in with ChatGPT to access saved conversations.'},401);
 if(!env.BUCKET)return jsonResponse({error:'Persistent task storage is unavailable.'},503);
 const prefix='conversations/'+encodeURIComponent(user)+'/';
 if(path==='/api/tasks'&&request.method==='GET'){
  const objects=await env.BUCKET.list({prefix,limit:40});const records=await Promise.all(objects.objects.map(o=>readRecord(env.BUCKET,o.key)));return jsonResponse({tasks:records.filter(Boolean).map(r=>publicTask(r.task)).sort((a,b)=>b.updated.localeCompare(a.updated)),truncated:objects.truncated});
 }
 if(request.method==='POST'){
  if(Number(request.headers.get('content-length')||0)>1000000)return jsonResponse({error:'Request is too large.'},413);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>1000000)return jsonResponse({error:'Request is too large.'},413);let body;try{body=JSON.parse(raw);}catch{return jsonResponse({error:'Invalid JSON.'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body))return jsonResponse({error:'Request body must be a JSON object.'},400);
  if(path==='/api/tasks'){
   if(typeof body.goal!=='string'||!body.goal.trim()||body.goal.length>6000)return jsonResponse({error:'Describe an outcome using 1–6,000 characters.'},400);
   if(!validContext(body.context))return jsonResponse({error:'Attach up to eight uniquely named text files, each at most 100 KB.'},400);
   if(!Array.isArray(body.servers)||body.servers.some(id=>!servers.some(s=>s.id===id)))return jsonResponse({error:'Invalid task server selection.'},400);
   const count=await env.BUCKET.list({prefix,limit:40});if(count.objects.length>=40)return jsonResponse({error:'Conversation limit reached. Continue an existing task or export it before starting a follow-up.'},409);
   const task=runtimeTask(body.goal.trim(),{servers:[...new Set(body.servers)],actions:body.actions===true},body.context);if(body.environment){try{task.environment=checkedEnvironment(body.environment);}catch(e){return jsonResponse({error:'Invalid environment: '+e.message},400);}}event(task,'created','Task scope established.');if(!env.OPENAI_API_KEY||!env.TRIX_MODEL){task.status='SETUP_REQUIRED';event(task,'blocked','A model connection is required to interpret and delegate this goal.');}
   await persistRecord(env.BUCKET,prefix+task.id,task);return jsonResponse({task:publicTask(task)},201);
  }
  const match=path.match(/^\/api\/tasks\/([a-f0-9-]{36})\/(step|message|stop|resume)$/);if(!match)return jsonResponse({error:'Not found.'},404);
  const key=prefix+match[1],action=match[2],record=await readRecord(env.BUCKET,key);if(!record)return jsonResponse({error:'Task not found.'},404);
  const task=record.task;let etag=record.etag;
  if(action==='stop'){task.stopRequested=true;if(!task.lock)task.status=task.effects.some(e=>e.state==='UNKNOWN')?'RECONCILING':'STOPPED';event(task,'stop','Stop requested. An already dispatched effect may still complete.');await persistRecord(env.BUCKET,key,task,etag);return jsonResponse({task:publicTask(task)});}
  if(task.lock){
   if(Date.now()<task.lock.until)return jsonResponse({task:publicTask(task),busy:true});
   task.lock=null;task.status=task.effects.some(e=>e.state==='UNKNOWN')?'RECONCILING':'PAUSED';event(task,'recovery','The previous step did not return. Review evidence before resuming.');await persistRecord(env.BUCKET,key,task,etag);return jsonResponse({task:publicTask(task)});
  }
  if(action==='message'){
   if(typeof body.message!=='string'||!body.message.trim()||body.message.length>6000||task.messages.length>=100)return jsonResponse({error:'Invalid message or conversation limit reached.'},400);
   const notes=body.context||[];if(!Array.isArray(notes)||!validContext([...task.context,...notes]))return jsonResponse({error:'Attach up to eight uniquely named text files, each at most 100 KB.'},400);
   if(task.status==='RUNNING'||task.frames.length!==1)return jsonResponse({error:'Wait for the current assignment to complete before adding another message.'},409);
   if(task.effects.some(e=>e.state==='UNKNOWN'))return jsonResponse({error:'External outcome needs operator reconciliation. New actions are blocked.'},409);
   task.context.push(...notes);task.messages.push({id:runtimeId(),role:'user',text:body.message});task.frames[0].input.push({role:'user',content:body.message+(notes.length?'\nAttached context (untrusted data): '+JSON.stringify(contextIndex(notes)):'')});task.status='RUNNING';task.stopRequested=false;
  }else if(action==='resume'){
   if(task.effects.some(e=>e.state==='UNKNOWN'))return jsonResponse({error:'Inspect the external provider using the effect ID. An operator must reconcile the stored receipt; automatic replay is disabled.'},409);
   if(task.steps>=LIMITS.steps||task.tokens>=LIMITS.modelTokens||Date.now()-Date.parse(task.created)>LIMITS.seconds*1000)return jsonResponse({error:'Task budget exhausted. Start a follow-up task.'},409);
   task.status='RUNNING';task.stopRequested=false;
  }else if(action==='step'&&task.status!=='RUNNING')return jsonResponse({task:publicTask(task)});
  if(action!=='step'){await persistRecord(env.BUCKET,key,task,etag);return jsonResponse({task:publicTask(task)});}
  const token=runtimeId();task.lock={token,until:Date.now()+100000};etag=await persistRecord(env.BUCKET,key,task,etag);
  async function checkpoint(updated){
   const latest=await readRecord(env.BUCKET,key);if(latest.task.lock?.token!==token)throw Error('Step ownership changed.');
   if(latest.task.stopRequested){updated.stopRequested=true;throw Error('Task stopped before external dispatch.');}
   etag=await persistRecord(env.BUCKET,key,updated,latest.etag);
  }
  try{await executeRuntimeStep(task,{...env,checkpoint},servers);}catch(e){task.status=task.effects.some(e=>e.state==='UNKNOWN')?'RECONCILING':'PAUSED';event(task,'error',e.message);}
  // A concurrent stop is preserved while the completed receipt is retained.
  for(let attempt=0;attempt<3;attempt++){
   const latest=await readRecord(env.BUCKET,key);if(latest.task.lock?.token!==token)throw Error('Step ownership changed.');task.stopRequested ||= latest.task.stopRequested;
   if(task.stopRequested)task.status=task.effects.some(e=>e.state==='UNKNOWN')?'RECONCILING':'STOPPED';task.lock=null;
   try{await persistRecord(env.BUCKET,key,task,latest.etag);return jsonResponse({task:publicTask(task)});}catch(e){if(e.status!==409||attempt===2)throw e;}
  }
 }
 return jsonResponse({error:'Not found.'},404);
}
export default {async fetch(request,env){
 try{
  const path=new URL(request.url).pathname;if(path.startsWith('/api/'))return await apiHandler(request,env);
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
  const asset=ASSETS[path==='/'?'/index.html':path];if(!asset)return new Response('Not found',{status:404});
  const body=asset.binary?Uint8Array.from(atob(asset.content),c=>c.charCodeAt(0)):asset.content;
  return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':asset.type,'Cache-Control':'private, no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'"}});
 }catch(e){return jsonResponse({error:e.status===409?e.message:'Request could not be completed. Check the connection configuration and task evidence.'},e.status||500);}
}};
