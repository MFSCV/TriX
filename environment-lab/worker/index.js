import {supabaseConfigured,SupabaseStore,backendCall} from '../runtime/supabase.mjs';
import {RELEASE} from '../public/release.mjs';
import {serverConfig,LIMITS} from '../runtime/policy.mjs';
import {SPECIALISTS} from '../public/specialists.mjs';
import {runtimeTask,runtimeId,runtimeNow,event,executeRuntimeStep,contextIndex} from '../runtime/orchestrator.mjs';
import {checkedEnvironment} from '../runtime/local-tools.mjs';
const jsonResponse=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
export function validContext(notes){return Array.isArray(notes)&&notes.length<=8&&notes.every(c=>c&&typeof c.name==='string'&&c.name.length>0&&c.name.length<=120&&typeof c.content==='string'&&new TextEncoder().encode(c.content).length<=100000)&&new Set(notes.map(c=>c.name)).size===notes.length;}
const publicTask=t=>({id:t.id,title:t.title,created:t.created,updated:t.updated,version:t.version,status:t.status,messages:t.messages,events:t.events,surfaces:t.surfaces,delegations:t.delegations,effects:t.effects,receipts:t.receipts,revision:t.revision,iteration:t.iteration,steps:t.steps,tokens:t.tokens,grant:t.grant,locked:!!t.lock,context:t.context,background:t.background===true,diagnostic:t.diagnostic||null,backgroundQueue:t.backgroundQueue||null});
async function readRecord(bucket,key){const obj=await bucket.get(key);return obj?{task:await obj.json(),etag:obj.etag}:null;}
async function persistRecord(bucket,key,task,etag){
 // R2 permits one write per second to a key. Pace checkpoints, including stop/CAS.
 const pause=etag?Math.max(0,(bucket.writeInterval??1100)-(Date.now()-Date.parse(task.updated))):0;if(pause)await new Promise(resolve=>setTimeout(resolve,pause));
 task.updated=runtimeNow();task.version++;const text=JSON.stringify(task);if(new TextEncoder().encode(text).length>1200000)throw Error('Task storage limit reached.');
 const result=await bucket.put(key,text,{onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});if(!result)throw Object.assign(Error('Task changed in another request. Refresh before continuing.'),{status:409});return result.etag;
}
async function syncPrivateFiles(env,owner,id,files){
 for(const file of files){try{await backendCall(env,'file_put',{owner,id,bucket:file.bucket,name:file.name,content:file.content});}catch{return 'The checkpoint is saved, but a private file copy could not be confirmed. Its text remains in the task evidence.';}}
}
export async function apiHandler(request,env){
 const path=new URL(request.url).pathname;
 if(request.method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)return jsonResponse({error:'Same-origin request required.'},403);
 const servers=serverConfig(env);
 const hasSupabase=supabaseConfigured(env);
 if(path==='/api/status'&&request.method==='GET'){
  const backend=hasSupabase?await backendCall(env,'health'):null;
  return jsonResponse({version:RELEASE.version,channel:RELEASE.channel,modelVerification:'not-established-by-configuration',model:!!(env.OPENAI_API_KEY&&env.TRIX_MODEL),modelName:env.TRIX_MODEL||null,persistence:hasSupabase||!!env.BUCKET,persistenceProvider:hasSupabase?'supabase':env.BUCKET?'r2':'browser',background:backend?.scheduler===true,backgroundModel:backend?.modelReady===true,specialists:SPECIALISTS,limits:LIMITS,servers:servers.map(s=>({id:s.id,name:s.name||s.id,host:new URL(s.url).host,tools:s.tools.map(t=>({name:t.name,purpose:t.purpose,roles:t.roles,fixedArguments:t.fixedArguments||{}}))}))});
 }
 const user=request.headers.get('oai-authenticated-user-id');if(!user)return jsonResponse({error:'Sign in with ChatGPT to access saved conversations.'},401);
 if(!hasSupabase&&!env.BUCKET)return jsonResponse({error:'Persistent task storage is unavailable.'},503);
 const prefix='conversations/'+encodeURIComponent(user)+'/';
 const primary=hasSupabase?new SupabaseStore(env,user):env.BUCKET;
 if(path==='/api/tasks'&&request.method==='GET'){
  const objects=await primary.list({prefix,limit:40}),legacy=hasSupabase&&env.BUCKET?await env.BUCKET.list({prefix,limit:40}):{objects:[],truncated:false};const records=await Promise.all([...objects.objects.map(o=>readRecord(primary,o.key)),...legacy.objects.filter(o=>!objects.objects.some(n=>n.key===o.key)).map(o=>readRecord(env.BUCKET,o.key))]);return jsonResponse({tasks:records.filter(Boolean).map(r=>publicTask(r.task)).sort((a,b)=>b.updated.localeCompare(a.updated)),truncated:objects.truncated||legacy.truncated});
 }
 if(request.method==='POST'){
  if(Number(request.headers.get('content-length')||0)>1000000)return jsonResponse({error:'Request is too large.'},413);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>1000000)return jsonResponse({error:'Request is too large.'},413);let body;try{body=JSON.parse(raw);}catch{return jsonResponse({error:'Invalid JSON.'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body))return jsonResponse({error:'Request body must be a JSON object.'},400);
  if(path==='/api/tasks'||path==='/api/diagnostics/cpu'){
   const diagnostic=path==='/api/diagnostics/cpu';if(diagnostic&&!hasSupabase)return jsonResponse({error:'The background diagnostic requires Supabase.'},409);if(diagnostic)body={...body,goal:'Verify background CPU processing',context:[],servers:[],actions:false};
   if(typeof body.goal!=='string'||!body.goal.trim()||body.goal.length>6000)return jsonResponse({error:'Describe an outcome using 1–6,000 characters.'},400);
   if(!validContext(body.context))return jsonResponse({error:'Attach up to eight uniquely named text files, each at most 100 KB.'},400);
   if(!Array.isArray(body.servers)||body.servers.some(id=>!servers.some(s=>s.id===id)))return jsonResponse({error:'Invalid task server selection.'},400);
   const count=await primary.list({prefix,limit:40});if(count.objects.length>=40)return jsonResponse({error:'Conversation limit reached. Continue an existing task or export it before starting a follow-up.'},409);
   const task=runtimeTask(body.goal.trim(),{servers:[...new Set(body.servers)],actions:body.actions===true},body.context);if(body.environment){try{task.environment=checkedEnvironment(body.environment);}catch(e){return jsonResponse({error:'Invalid environment: '+e.message},400);}}event(task,'created','Task scope established.');if(diagnostic){task.diagnostic='cpu';task.background=true;}else if(!env.OPENAI_API_KEY||!env.TRIX_MODEL){task.status='SETUP_REQUIRED';event(task,'blocked','A model connection is required to interpret and delegate this goal.');}
   await persistRecord(primary,prefix+task.id,task);let warning=hasSupabase?await syncPrivateFiles(env,user,task.id,task.context.map(c=>({...c,bucket:'context-files'}))):null;
   if(diagnostic)await backendCall(env,'queue_enqueue',{owner:user,id:task.id,kind:'cpu'});return jsonResponse({task:publicTask(task),...(warning?{warning}:{})},201);
  }
  const match=path.match(/^\/api\/tasks\/([a-f0-9-]{36})\/(step|message|stop|resume|background)$/);if(!match)return jsonResponse({error:'Not found.'},404);
  const key=prefix+match[1],action=match[2];let bucket=primary,record=await readRecord(primary,key);if(!record&&hasSupabase&&env.BUCKET){bucket=env.BUCKET;record=await readRecord(bucket,key);}if(!record)return jsonResponse({error:'Task not found.'},404);
  const task=record.task;let etag=record.etag;
  if(action==='stop'){task.stopRequested=true;if(!task.lock)task.status=task.effects.some(e=>e.state==='UNKNOWN')?'RECONCILING':'STOPPED';event(task,'stop','Stop requested. An already dispatched effect may still complete.');await persistRecord(bucket,key,task,etag);return jsonResponse({task:publicTask(task)});}
  if(task.diagnostic&&['message','resume','background'].includes(action))return jsonResponse({error:'Start a new background diagnostic instead of continuing this infrastructure check.'},409);
  if(action==='background'){
   if(!(bucket instanceof SupabaseStore))return jsonResponse({error:'Legacy R2 tasks cannot run in background. Start a new Supabase task.'},409);
   const health=await backendCall(env,'health');if(body.enabled===true&&!health.modelReady)return jsonResponse({error:'The background model connection is required. The CPU infrastructure diagnostic is available separately.'},409);
   task.background=body.enabled===true;await persistRecord(bucket,key,task,etag);if(task.background&&task.status==='RUNNING')await backendCall(env,'queue_enqueue',{owner:user,id:task.id,kind:'runtime'});return jsonResponse({task:publicTask(task)});
  }
  if(action==='step'&&env.TRIX_QUEUE_JOB&&!task.background&&!task.diagnostic)return jsonResponse({task:publicTask(task),skipped:true});
  if(task.lock){
   if(Date.now()<task.lock.until)return jsonResponse({task:publicTask(task),busy:true});
   task.lock=null;task.status=task.effects.some(e=>e.state==='UNKNOWN')?'RECONCILING':'PAUSED';event(task,'recovery','The previous step did not return. Review evidence before resuming.');await persistRecord(bucket,key,task,etag);return jsonResponse({task:publicTask(task)});
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
  if(action!=='step'){await persistRecord(bucket,key,task,etag);const warning=bucket instanceof SupabaseStore&&action==='message'?await syncPrivateFiles(env,user,task.id,(body.context||[]).map(c=>({...c,bucket:'context-files'}))):null;if(task.background&&bucket instanceof SupabaseStore)await backendCall(env,'queue_enqueue',{owner:user,id:task.id,kind:task.diagnostic==='cpu'?'cpu':'runtime'});return jsonResponse({task:publicTask(task),...(warning?{warning}:{})});}
  const previousSurfaces=task.surfaces.length;
  const token=runtimeId();task.lock={token,until:Date.now()+100000};etag=await persistRecord(bucket,key,task,etag);
  async function checkpoint(updated){
   const latest=await readRecord(bucket,key);if(latest.task.lock?.token!==token)throw Error('Step ownership changed.');
   updated.background=latest.task.background===true;
   if(env.TRIX_QUEUE_JOB&&!updated.background&&!updated.diagnostic)throw Error('Background processing was disabled before external dispatch.');
   if(latest.task.stopRequested){updated.stopRequested=true;throw Error('Task stopped before external dispatch.');}
   etag=await persistRecord(bucket,key,updated,latest.etag);
  }
  try{await executeRuntimeStep(task,{...env,checkpoint},servers);}catch(e){task.status=task.effects.some(e=>e.state==='UNKNOWN')?'RECONCILING':'PAUSED';event(task,'error',e.message);}
  // A concurrent stop is preserved while the completed receipt is retained.
  for(let attempt=0;attempt<3;attempt++){
   const latest=await readRecord(bucket,key);if(latest.task.lock?.token!==token)throw Error('Step ownership changed.');task.stopRequested ||= latest.task.stopRequested;task.background=latest.task.background===true;
   if(task.stopRequested)task.status=task.effects.some(e=>e.state==='UNKNOWN')?'RECONCILING':'STOPPED';task.lock=null;
   try{await persistRecord(bucket,key,task,latest.etag);const warning=bucket instanceof SupabaseStore&&!task.diagnostic?await syncPrivateFiles(env,user,task.id,task.surfaces.slice(previousSurfaces).filter(s=>typeof s.content==='string').map(s=>({name:s.name||'TriX_Artifact.txt',content:s.content,bucket:'artifacts'}))):null;return jsonResponse({task:publicTask(task),...(warning?{warning}:{})});}catch(e){if(e.status!==409||attempt===2)throw e;}
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
