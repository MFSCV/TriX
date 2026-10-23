import {boundedText} from './mcp.mjs';
const backendResponse=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createRpcClient(url,serviceKey,fetcher=fetch){return async(name,args)=>{
 const r=await fetcher(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Database operation failed.');return JSON.parse(await boundedText(r,1500000));
};}
export function createBackendHandler({rpc,url,serviceKey,fetcher=fetch,processJob}){return async request=>{
 try{
  if(request.method!=='POST')return backendResponse({error:'Method not allowed.'},405);
  const token=request.headers.get('Authorization')?.match(/^Bearer ([a-zA-Z0-9_-]{32,256})$/)?.[1];
  if(!token||!await rpc('trix_authorized',{token}))return backendResponse({error:'Unauthorized.'},401);
  const body=JSON.parse(await boundedText(request,1500000));
  if(!body||typeof body!=='object'||!body.arguments||Array.isArray(body.arguments))return backendResponse({error:'Invalid request.'},400);
  const {operation,arguments:args}=body;
  if(operation==='process'&&processJob)return backendResponse(await processJob());
  if(operation==='file_put'||operation==='file_read'){
   if(!['context-files','artifacts','audit-reports'].includes(args.bucket)||!/^[-a-f0-9]{36}$/.test(args.id||''))return backendResponse({error:'Invalid file scope.'},400);
   const owned=await rpc('trix_backend',{operation:'run_get',arguments:{owner:args.owner,id:args.id}});if(!owned.record)return backendResponse({error:'Run not found.'},404);
   let meta;
   if(operation==='file_put'){
    if(typeof args.content!=='string'||new TextEncoder().encode(args.content).length>1200000||typeof args.name!=='string'||args.name.length>120)return backendResponse({error:'Invalid file.'},400);
    const bytes=new TextEncoder().encode(args.content),sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join(''),path=args.id+'/'+sha256;
    const headers={apikey:serviceKey,Authorization:'Bearer '+serviceKey};
    const upload=await fetcher(url+'/storage/v1/object/'+args.bucket+'/'+path,{method:'POST',headers:{...headers,'Content-Type':'text/plain','x-upsert':'false'},body:bytes,signal:AbortSignal.timeout(15000)});
    if(!upload.ok&&upload.status!==409&&upload.status!==400)throw Error('File upload failed.');
    // Verify stored bytes even after an immutable-object collision; never accept an arbitrary 400.
    const verify=await fetcher(url+'/storage/v1/object/authenticated/'+args.bucket+'/'+path,{headers,signal:AbortSignal.timeout(15000)});if(!verify.ok)throw Error('File readback failed.');
    const stored=await boundedText(verify,1200000),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stored))),x=>x.toString(16).padStart(2,'0')).join('');if(digest!==sha256)throw Error('File verification failed.');
    meta={...args,path,sha256,bytes:bytes.length};delete meta.content;
    await rpc('trix_backend',{operation:'file_receipt',arguments:meta});return backendResponse({file:meta});
   }
   if(!/^[a-f0-9]{64}$/.test(args.sha256||''))return backendResponse({error:'Invalid file digest.'},400);
   const found=await rpc('trix_backend',{operation:'file_get',arguments:args});if(!found.file)return backendResponse({error:'File not found.'},404);meta=found.file;
   const stored=await fetcher(url+'/storage/v1/object/authenticated/'+meta.bucket+'/'+meta.path,{headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey},signal:AbortSignal.timeout(15000)});if(!stored.ok)throw Error('File read failed.');
   return backendResponse({file:meta,content:await boundedText(stored,1200000)});
  }
  if(!['health','run_get','run_put','run_list','queue_enqueue','queue_status'].includes(operation))return backendResponse({error:'Unsupported operation.'},400);
  return backendResponse(await rpc(operation.startsWith('queue_')?'trix_queue':'trix_backend',{operation:operation.replace(/^queue_/,''),arguments:args}));
 }catch{return backendResponse({error:'Backend operation could not be completed.'},503);}
};}
