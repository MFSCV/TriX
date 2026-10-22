import {envelope,importConfig,validate,buildConfig} from './model.mjs';
import {respond} from './agents.mjs';
export const TASK_KEY='trix.tasks.v1', MAX_TASKS=40;
const MAX_BYTES=3500000,clone=x=>structuredClone(x),now=()=>new Date().toISOString();
export const newId=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Array.from(globalThis.crypto?.getRandomValues?.(new Uint32Array(3))||[Math.random()*2**32,Math.random()*2**32,Math.random()*2**32],n=>(n>>>0).toString(16)).join('-');
const id=newId;
export const scenarioKey=s=>JSON.stringify(s);
export const emptyStore=()=>({schema:'trix.task-workspace/v1',version:0,selected:null,draft:'',tasks:[]});
export function readStore(storage){
 let store=emptyStore(),warnings=[];
 try{const raw=storage.getItem(TASK_KEY);if(raw){
  if(new TextEncoder().encode(raw).length>MAX_BYTES)throw Error('Task history exceeds its size limit.');
  const p=JSON.parse(raw),ids=new Set();
  if(p.schema!==store.schema||!Number.isInteger(p.version)||p.version<0||!Array.isArray(p.tasks)||p.tasks.length>MAX_TASKS||typeof p.draft!=='string'||p.draft.length>6000)throw Error('Invalid task history.');
  for(const t of p.tasks){
   if(!t||typeof t.id!=='string'||ids.has(t.id)||typeof t.title!=='string'||typeof t.goal!=='string'||!Number.isInteger(t.revision)||!Number.isFinite(Date.parse(t.created))||!Number.isFinite(Date.parse(t.updated))||!['CREATED','VALIDATED','RUNNING','RECONCILING','SUCCEEDED','FAILED','CANCELLED'].includes(t.lifecycle))throw Error('Invalid task identity or lifecycle.');
   if(!Array.isArray(t.messages)||t.messages.length>200||!t.messages.every(m=>typeof m.text==='string'&&['user','assistant'].includes(m.role)&&Number.isFinite(Date.parse(m.at)))||!Array.isArray(t.events)||t.events.length>300||!t.events.every(e=>typeof e.text==='string'&&Number.isFinite(Date.parse(e.at)))||!Array.isArray(t.artifacts)||t.artifacts.length>12||!t.artifacts.every(a=>typeof a.content==='string'&&typeof a.name==='string'&&typeof a.digest==='string'&&Number.isFinite(Date.parse(a.created))&&Number.isInteger(a.revision)&&['planning','cpu-result'].includes(a.kind))||!Array.isArray(t.context)||t.context.length>8||!t.context.every(c=>typeof c.name==='string'&&typeof c.content==='string')||!t.attempt||typeof t.attempt.state!=='string'||typeof t.attempt.knowledge!=='string')throw Error('Invalid task content.');
   importConfig(JSON.stringify(t.environment));if(t.proposal){if(typeof t.proposal.base!=='string')throw Error('Invalid proposal.');importConfig(JSON.stringify(envelope(t.proposal.scenario)));}ids.add(t.id);
  }
  if(p.selected!==null&&!ids.has(p.selected))p.selected=null;store=p;
 }}catch(e){warnings.push('Task history could not be restored. Original data is retained. '+e.message);}
 return {store,warnings};
}
export function writeStore(storage,value,expected){
 const raw=storage.getItem(TASK_KEY);let version=0;
 if(raw){if(readStore(storage).warnings.length)throw Error('Saved history needs recovery. Export the original before changing it.');version=JSON.parse(raw).version;}
 if(version!==expected)throw Error('Another tab changed task history. Refresh before continuing.');
 const next={...clone(value),version:version+1},text=JSON.stringify(next);
 if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Task storage is full. Export and remove older tasks.');
 storage.setItem(TASK_KEY,text);return next;
}
export function appendMessage(t,role,text){if(t.messages.length>=200)throw Error('Conversation limit reached. Export this task and start a follow-up.');t.messages.push({id:id(),role,text,at:now()});t.updated=now();return t;}
export function appendEvent(t,text,kind='local-tool'){if(t.events.length>=300)throw Error('Activity limit reached. Export this task and start a follow-up.');t.events.push({id:id(),sequence:t.events.length+1,at:now(),text,kind});t.updated=now();return t;}
export function createTask(goal,state){
 if(typeof goal!=='string'||!goal.trim()||goal.length>6000)throw Error('Describe an outcome using 1-6,000 characters.');
 const t={id:'task-'+id(),title:goal.trim().slice(0,72),goal:goal.trim(),created:now(),updated:now(),revision:1,environment:envelope(state),lifecycle:'CREATED',outcome:'Plan prepared',attempt:{state:'NOT_STARTED',knowledge:'CONFIRMED',at:now(),id:null},messages:[],events:[],artifacts:[],context:[],proposal:null,validation:null,delivery:'export-only',download:null,unread:false};
 appendMessage(t,'user',goal.trim());appendEvent(t,'Task created. Scope: local planning and export only.');return t;
}
export const suggestedGoals=Object.freeze([
 {icon:'layers',title:'Plan an offline workflow',description:'Independent Apple + NVIDIA stages',prompt:'Plan an offline Apple + NVIDIA workflow'},
 {icon:'check',title:'Check my environment',description:'Explain compatibility and next steps',prompt:'Validate my current environment'},
 {icon:'file',title:'Generate a configuration',description:'A reviewable technical artifact',prompt:'Generate a technical configuration'},
 {icon:'play',title:'Try the CPU reference',description:'Verify and run a bounded task graph',prompt:'Run the pure CPU example'}
]);
export function prepareReply(task,prompt,current){
 const t=clone(task),p=prompt.trim().toLowerCase();if(t.lifecycle==='RUNNING')throw Error('Finish or stop the CPU run before changing the task.');let result;
 if(p==='plan an offline apple + nvidia workflow'){result=respond('profile hybrid',current);result.scenario.offline=true;result.message='Prepared an offline Apple + NVIDIA proposal for independent stages. Applying it replaces the working environment. Their device memory stays separate.';}
 else if(['validate my current environment','validate environment'].includes(p))result=respond('validate',current);
 else if(['generate a technical configuration','generate configuration'].includes(p))result=respond('generate',current);
 else if(['run the pure cpu example','run cpu example'].includes(p))result={status:'reference',message:'Inspect the CPU reference plan, then choose Run on this CPU. It permits six pure operations and no external effects.'};
 else result=respond(prompt,current);
 if(result.status==='clarify')result.message='Your goal is recorded. Use the actions below to prepare an environment, validate compatibility, generate an artifact or run the pure CPU reference. General model reasoning is not connected.';
 if(result.status==='proposed')t.proposal={status:'proposed',scenario:result.scenario,base:scenarioKey(current),revision:t.revision+1};
 if(['validated','generated','blocked'].includes(result.status)){t.environment=envelope(current);t.validation=validate(current);t.proposal=null;t.revision++;t.lifecycle=t.validation.errors?'CREATED':'VALIDATED';t.outcome=t.validation.errors?'Needs attention':'Environment validated';}
 appendMessage(t,'assistant',result.message);appendEvent(t,result.status==='clarify'?'Goal recorded; no model interpretation or target change executed.':result.message,result.agent||'local-planner');return {task:t,result};
}
export function applyTaskProposal(task,current){
 if(!task.proposal)throw Error('No pending proposal.');if(task.proposal.base!==scenarioKey(current))throw Error('Working environment changed. Prepare a new proposal to preserve your edits.');
 const t=clone(task),scenario=importConfig(JSON.stringify(envelope(t.proposal.scenario)));t.environment=envelope(scenario);t.proposal=null;t.revision++;t.validation=validate(scenario);t.lifecycle=t.validation.errors?'CREATED':'VALIDATED';t.outcome='Environment proposal applied';appendMessage(t,'assistant','The reviewed proposal is now the working environment. Qualification conditions remain visible.');appendEvent(t,'Local proposal applied to revision '+t.revision+'. No target-project effect.');return {task:t,scenario};
}
export function scenarioDiff(before,after){const rows=[];function walk(a,b,path){if(JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[k],b[k],path?path+'.'+k:k);}else rows.push({path,before:a===undefined?'(absent)':JSON.stringify(a),after:b===undefined?'(absent)':JSON.stringify(b)});}walk(before,after,'');return rows;}
// Standards-based SHA-256 fallback for HTTP-only development previews. IDs are
// local record identities, never access credentials. Production uses WebCrypto.
export function sha256Text(text){
 const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 const input=new TextEncoder().encode(text),padded=new Uint8Array(Math.ceil((input.length+9)/64)*64),data=new DataView(padded.buffer),h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),w=new Uint32Array(64),r=(n,b)=>(n>>>b)|(n<<(32-b));
 padded.set(input);padded[input.length]=128;data.setUint32(padded.length-8,Math.floor(input.length*8/2**32));data.setUint32(padded.length-4,(input.length*8)>>>0);
 for(let offset=0;offset<padded.length;offset+=64){
  for(let i=0;i<16;i++)w[i]=data.getUint32(offset+i*4);
  for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(r(a,7)^r(a,18)^(a>>>3))+w[i-7]+(r(b,17)^r(b,19)^(b>>>10)))>>>0;}
  let [a,b,c,d,e,f,g,z]=h;
  for(let i=0;i<64;i++){const t1=(z+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[i]+w[i])>>>0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;z=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
  [a,b,c,d,e,f,g,z].forEach((n,i)=>h[i]=(h[i]+n)>>>0);
 }
 return Array.from(h,n=>n.toString(16).padStart(8,'0')).join('');
}
export async function digestText(text){if(!globalThis.crypto?.subtle)return sha256Text(text);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function createArtifact(task,current){
 const t=clone(task),config=buildConfig(current);if(t.artifacts.length>=12)throw Error('Artifact limit reached. Export this task and start a follow-up.');const content=JSON.stringify(config,null,2),digest=await digestText(content);
 const artifact={id:id(),name:'TriX_Environment_Configuration.json',kind:'planning',content,digest,created:now(),input:scenarioKey(current),revision:t.revision+1,ruleset:config.ruleset};t.artifacts.push(artifact);t.environment=envelope(current);t.validation=validate(current);t.revision++;t.lifecycle='VALIDATED';t.outcome='Planning artifact ready';t.unread=true;
 appendMessage(t,'assistant','The validated planning artifact is ready to inspect and export. Every qualification condition is retained. No target project has changed.');appendEvent(t,'Generated immutable planning artifact. SHA-256 '+digest.slice(0,16)+'…','configuration-writer');return {task:t,artifact};
}
export const safeTaskExport=t=>JSON.stringify({schema:'trix.task-export/v1',exported_at:now(),scope:'Browser-local history; not independent audit or a deployment bundle',task:t},null,2);
export function taskStatus(t){if(t.lifecycle==='RUNNING')return 'Running on this CPU';if(t.lifecycle==='RECONCILING')return 'Needs reconciliation';if(t.lifecycle==='CANCELLED')return 'Cancelled';if(t.lifecycle==='FAILED')return 'Reference run failed';if(t.lifecycle==='SUCCEEDED')return 'CPU result verified';return t.proposal?'Review proposal':t.outcome;}
