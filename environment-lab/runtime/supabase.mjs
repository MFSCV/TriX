import {boundedText} from './mcp.mjs';
export function supabaseConfigured(env){
 const url=env.TRIX_SUPABASE_URL,token=env.TRIX_SUPABASE_BRIDGE_TOKEN;if(!url&&!token)return false;
 if(typeof url!=='string'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||typeof token!=='string'||!token)throw Object.assign(Error('Invalid Supabase backend configuration.'),{status:503});return true;
}
export async function backendCall(env,operation,args={},fetcher=fetch){
 if(!supabaseConfigured(env))throw Object.assign(Error('Supabase backend is not configured.'),{status:503});
 const response=await fetcher(env.TRIX_SUPABASE_URL+'/functions/v1/trix-backend',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.TRIX_SUPABASE_BRIDGE_TOKEN},body:JSON.stringify({operation,arguments:args}),signal:AbortSignal.timeout(70000)});
 if(!response.ok)throw Object.assign(Error(response.status===409?'Task changed in another request. Refresh before continuing.':'Supabase backend request could not be completed.'),{status:response.status===409?409:503});
 return JSON.parse(await boundedText(response,1500000));
}
export class SupabaseStore{
 constructor(env,owner,fetcher=fetch){if(typeof owner!=='string'||!owner||owner.length>256)throw Error('Invalid storage owner.');this.env=env;this.owner=owner;this.fetcher=fetcher;this.prefix='conversations/'+encodeURIComponent(owner)+'/';this.writeInterval=0;}
 id(key){if(!key.startsWith(this.prefix)||!/^[-a-f0-9]{36}$/.test(key.slice(this.prefix.length)))throw Error('Storage key is outside its owner scope.');return key.slice(this.prefix.length);}
 call(operation,args){return backendCall(this.env,operation,{...args,owner:this.owner,...(operation==='run_put'&&this.env.TRIX_QUEUE_JOB?{job_id:this.env.TRIX_QUEUE_JOB,job_claim:this.env.TRIX_QUEUE_CLAIM}:{})},this.fetcher);}
 async get(key){const data=await this.call('run_get',{id:this.id(key)});return data.record?{etag:String(data.record.etag),json:async()=>({...structuredClone(data.record.document),backgroundQueue:data.record.queue||null})}:null;}
 async put(key,text,options={}){const id=this.id(key),condition=options.onlyIf;if(!condition||(!condition.etagMatches&&condition.etagDoesNotMatch!=='*'))throw Error('Conditional writes are required.');const document=JSON.parse(text);delete document.backgroundQueue;if(document.id!==id)throw Error('Task identity does not match storage key.');const data=await this.call('run_put',{id,document,expected:condition.etagMatches??null});if(data.fenced)throw Object.assign(Error('Queue step ownership expired. Refresh before continuing.'),{status:409});return data.conflict?null:{etag:String(data.etag)};}
 async list({prefix,limit=40}){if(prefix!==this.prefix)throw Error('Storage list is outside its owner scope.');const data=await this.call('run_list',{limit:Math.min(limit,40)});return {objects:data.objects.map(o=>({key:this.prefix+o.id})),truncated:data.truncated};}
}
