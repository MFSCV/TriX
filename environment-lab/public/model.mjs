import * as base from './compatibility.mjs';
export const {architectures, operatingSystems, devices, backends, presetNames, sources, toYAML} = base;
export const REVISION = '0.2';
export const APP_VERSION = '0.2.0';
export const RULESET = '2026-10-22.2';
export const SCHEMA = 'trix.environment-planning/v2';
export const IMPLEMENTATION_SEQUENCE = Object.freeze(['E0: adopt contracts, profile matrix and decision records','E1: SDK, verifier, one CPU executor, durable state and refusal paths','E2: authorized distributed reference and client API','E3: third independent backend through the extension SDK','E4: source grammar and source-to-plan equivalence','E5: qualify additional platforms and optimizations']);
export const LIMITS = Object.freeze({name:120, groupName:120, text:200, groups:8, tasks:64, snapshots:4, fileBytes:500000});
const own = (object, key) => Object.hasOwn(object, key);
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && [Object.prototype,null].includes(Object.getPrototypeOf(x));
const has = (values, value) => values.includes(value);
const number = (v, min, max, integer=false) => Number.isFinite(v) && v>=min && v<=max && (!integer || Number.isInteger(v));
const groupExtra = g => ({physicalArch:g.arch, executionMode:'native', devicesPerNode:1, cpuSockets:1, numaNodes:1, cpuFeatures:'', pcieGeneration:'unknown', linkGbps:null, hostReserveGiB:0, deviceReserveGiB:0, hourlyCost:null, powerWatts:null, ...g});
export function node(overrides={}) { return groupExtra(base.node(overrides)); }
export function defaults() { return upgrade(base.defaults()); }
export function preset(key) { return upgrade(base.preset(key)); }
function upgrade(s) { return {...s, groups:s.groups.map(groupExtra), workflowEnabled:false, tasks:[], currency:'EUR', utilization:1, sizing:{enabled:false,parametersB:null,cacheGiB:0,overheadGiB:0,replicas:1}}; }
export function task(groupId, overrides={}) { return {id:'task-'+Math.random().toString(36).slice(2,10),name:'Workflow task',groupId,dependencies:[],operation:'tools',model:'',modelVersion:'',precision:'fp16',memory:1,inputType:'json',outputType:'json',...overrides}; }
const environmentFields = new Set(Object.keys(defaults()));
const groupFields = new Set(Object.keys(node()));
const taskFields = new Set(Object.keys(task('')));
const issuesForShape = s => {
  const issues=[];
  const add=(code,message)=>issues.push({level:'error',code,message,fix:'Correct the input using the published v2 schema.',ref:'SIF-004'});
  if(!plain(s)) { add('SCHEMA','Environment must be an object.'); return issues; }
  if(Object.keys(s).some(k=>!environmentFields.has(k)) || [...environmentFields].some(k=>!own(s,k))) add('SCHEMA_FIELDS','Missing or unknown environment fields.');
  if(typeof s.name!=='string'||!s.name.trim()||s.name.length>LIMITS.name) add('NAME','Environment name must contain 1–120 characters.');
  for(const k of ['offline','checkpoint','deterministic','workflowEnabled']) if(typeof s[k]!=='boolean') add('SCHEMA_BOOLEAN','Invalid boolean: '+k);
  for(const k of ['model','modelVersion']) if(typeof s[k]!=='string'||s[k].length>LIMITS.text) add('SCHEMA_TEXT','Invalid text: '+k);
  if(!Array.isArray(s.groups)||s.groups.length<1||s.groups.length>LIMITS.groups) add('GROUPS','Use between one and eight execution groups.');
  else for(const g of s.groups) {
    if(!plain(g)) {add('SCHEMA_GROUP','Execution group must be an object.');continue;}
    if(Object.keys(g).some(k=>!groupFields.has(k)) || [...groupFields].some(k=>!own(g,k))) add('SCHEMA_GROUP_FIELDS','Missing or unknown execution-group fields.');
    if(typeof g.id!=='string'||!/^group-[A-Za-z0-9_-]{1,100}$/.test(g.id)) add('SCHEMA_ID','Invalid execution-group identity.');
    if(typeof g.name!=='string'||!g.name.trim()||g.name.length>LIMITS.groupName) add('GROUP_NAME','Group name must contain 1–120 characters.');
    for(const [k,catalogue] of [['arch',architectures],['os',operatingSystems],['device',devices],['backend',backends]]) if(typeof g[k]!=='string'||!own(catalogue,g[k])) add('UNKNOWN_TARGET','Unknown target or backend.');
    for(const k of ['vendor','abi','osVersion','deviceModel','driver','backendVersion','cpuFeatures']) if(typeof g[k]!=='string'||g[k].length>LIMITS.text) add('SCHEMA_TEXT','Invalid group text: '+k);
    if(!has(['amd','intel','apple','qualcomm','arm','other'],g.vendor)||!own(architectures,g.physicalArch)||!has(['native','virtualized','emulated'],g.executionMode)||!has(['unknown','3','4','5','6'],g.pcieGeneration)) add('SCHEMA_ENUM','Unknown hardware profile field.');
    for(const k of ['devicesPerNode','cpuSockets','numaNodes']) if(!number(g[k],1,1024,true)) add('TOPOLOGY_VALUE',k+' must be an integer from 1 to 1024.');
    for(const k of ['hostReserveGiB','deviceReserveGiB']) if(!number(g[k],0,1048576)) add('RESERVE_VALUE','Memory reservations must be finite nonnegative quantities.');
    for(const k of ['hourlyCost','powerWatts','linkGbps']) if(g[k]!==null&&!number(g[k],0,10000000)) add('ESTIMATE_VALUE','Unknown estimates must be null; supplied estimates must be nonnegative.');
  }
  if(!has(['EUR','USD','GBP'],s.currency)||!number(s.utilization,0,1)) add('ESTIMATE_POLICY','Choose a currency and a utilization fraction from zero to one.');
  if(!plain(s.sizing)||Object.keys(s.sizing).sort().join()!==['enabled','parametersB','cacheGiB','overheadGiB','replicas'].sort().join()||typeof s.sizing.enabled!=='boolean'||(s.sizing.parametersB!==null&&!number(s.sizing.parametersB,0.000001,100000))||!number(s.sizing.cacheGiB,0,1048576)||!number(s.sizing.overheadGiB,0,1048576)||!number(s.sizing.replicas,1,1024,true)) add('SIZING_SCHEMA','Invalid sizing inputs.');
  if(!Array.isArray(s.tasks)||s.tasks.length>LIMITS.tasks) add('TASK_SCHEMA','At most 64 workflow tasks are allowed.');
  else for(const t of s.tasks) {
    if(!plain(t)) {add('TASK_SCHEMA','Task must be an object.');continue;}
    if(Object.keys(t).some(k=>!taskFields.has(k))||[...taskFields].some(k=>!own(t,k))) add('TASK_FIELDS','Missing or unknown task fields.');
    if(typeof t.id!=='string'||!/^task-[A-Za-z0-9_-]{1,100}$/.test(t.id)||typeof t.name!=='string'||!t.name.trim()||t.name.length>120||typeof t.groupId!=='string') add('TASK_ID','Invalid task identity, name or placement.');
    if(!Array.isArray(t.dependencies)||t.dependencies.length>64||t.dependencies.some(d=>typeof d!=='string')||new Set(t.dependencies).size!==t.dependencies.length) add('TASK_DEPENDENCIES','Dependencies must be a list of unique task identities.');
    if(!has(['inference','training','tools'],t.operation)||!has(['fp32','fp16','bf16','int8','int4'],t.precision)||!has(['json','tensor','text','artifact','number'],t.inputType)||!has(['json','tensor','text','artifact','number'],t.outputType)||!number(t.memory,0.000001,1048576)) add('TASK_VALUES','Invalid task operation, precision, memory or data contract.');
    for(const k of ['model','modelVersion']) if(typeof t[k]!=='string'||t[k].length>200) add('TASK_TEXT','Invalid task model identity.');
  }
  return issues;
};
function result(issues, s) { const errors=issues.filter(i=>i.level==='error').length,warnings=issues.filter(i=>i.level==='warning').length;return {issues,errors,warnings,status:errors?'blocked':warnings?'conditional':'coherent',total:s?.groups?.reduce?.((n,g)=>n+(Number(g?.count)||0),0)||0}; }
function extraGroup(g,s) {
  const issues=[];
  const add=(level,code,message,fix,ref='QUA-003')=>issues.push({level,code,message,fix,ref,group:g.id});
  if(g.os!=='browser'&&g.executionMode==='native'&&g.physicalArch!==g.arch) add('error','NATIVE_ISA','A native process must use the declared physical ISA.','Correct either ISA or declare emulated execution.','PLT-005');
  if(g.executionMode!=='native') add('warning','EXECUTION_MODE','Guest/emulated execution and accelerator access remain unqualified.','Record host, guest, process ISA, passthrough and feature-specific evidence.','PLT-005');
  if(g.hostReserveGiB>=g.ram||g.deviceReserveGiB>g.vram) add('error','MEMORY_RESERVATION','Memory reservations exceed the declared memory domain.','Reduce the reservation or correct the measured capacity.','LNG-012');
  if(g.devicesPerNode>1) add('warning','MULTI_DEVICE_TOPOLOGY','Device count does not establish joint execution or pooled memory.','Qualify per-device placement, PCIe paths and collectives.','ARQ-006');
  add('warning','VERSIONS_DECLARED','Version fields are declarations; no upstream version tuple or physical support has been verified.','Attach exact snapshot and operation-specific evidence. Nonempty fields do not qualify a target.');
  return issues;
}
function groupWorkload(g,s) {
  const host=g.ram-g.hostReserveGiB;
  const device=g.vram-g.deviceReserveGiB;
  return {...g,ram:host,vram:device};
}
export function assessGroup(g,s) {return [...base.assessGroup(groupWorkload(g,s),s),...extraGroup(g,s)];}
export function validate(s) {
  const shape=issuesForShape(s);
  if(shape.length) return result(shape,s);
  const global=s.workflowEnabled?{...s,operation:'tools'}:s;
  let issues=base.validate(global).issues.filter(i=>!s.workflowEnabled||i.code!=='MODEL_PIN');
  for(const g of s.groups) issues.push(...extraGroup(g,s));
  if(!s.workflowEnabled) for(const g of s.groups) {
    const available=g.device==='cpu'?g.ram-g.hostReserveGiB:Math.min(g.vram-g.deviceReserveGiB,g.device==='apple'?g.ram-g.hostReserveGiB:Infinity);
    if(!['remote','tpu','neuron'].includes(g.backend)&&s.operation!=='tools'&&s.memory>available&&!issues.some(i=>i.code==='MEMORY_CAPACITY'&&i.group===g.id)) issues.push({level:'error',code:'MEMORY_CAPACITY',message:'Required per-replica memory exceeds capacity after reservations.',fix:'Reduce demand, correct reservations or qualify explicit sharding.',ref:'LNG-012',group:g.id});
  }
  const add=(code,message,fix,taskId)=>issues.push({level:'error',code,message,fix,ref:'RUN-005',task:taskId});
  if(s.workflowEnabled) {
    if(!s.tasks.length) add('WORKFLOW_EMPTY','The workflow needs at least one task.','Add a task or disable task-specific planning.');
    if(s.mode!=='independent') add('WORKFLOW_MODE','Task-specific placement currently supports independent pipelines.','Use independent mode; joint model placement requires its own qualified contract.');
    const byId=new Map(s.tasks.map(t=>[t.id,t]));
    if(byId.size!==s.tasks.length) add('TASK_DUPLICATE','Task identities must be unique.','Assign unique task identities.');
    for(const t of s.tasks) {
      if(t.operation!=='tools'&&(!t.model||!t.modelVersion))issues.push({level:'warning',code:'MODEL_PIN',message:'Task model/artifact identity is not fully pinned.',fix:'Record the exact operation artifact and revision.',ref:'INT-006',task:t.id});
      const g=s.groups.find(g=>g.id===t.groupId);
      if(!g) add('TASK_PLACEMENT','Task refers to an absent execution group.','Choose an existing execution group.',t.id);
      else issues.push(...assessGroup(g,{...s,...t}).map(i=>({...i,task:t.id})));
      for(const d of t.dependencies) {
        if(!byId.has(d)) add('TASK_REFERENCE','Dependency refers to an absent task.','Correct the dependency identity.',t.id);
        else if(byId.get(d).outputType!==t.inputType) add('TASK_CONTRACT','Dependency output and task input contracts differ.','Add an explicit conversion stage or align the contracts.',t.id);
      }
    }
    const visited=new Set(),active=new Set();
    const visit=id=>{if(active.has(id))return true;if(visited.has(id))return false;active.add(id);for(const d of byId.get(id)?.dependencies||[])if(byId.has(d)&&visit(d))return true;active.delete(id);visited.add(id);return false;};
    if(s.tasks.some(t=>visit(t.id))) add('TASK_CYCLE','Workflow dependencies contain a cycle.','Remove cyclic dependencies before planning.');
  }
  return result(issues,s);
}
export function candidateAssessment(s,index,backend) {
  const candidate=structuredClone(s); candidate.groups[index].backend=backend;
  const group=candidate.groups[index];
  const selected=candidate.workflowEnabled?candidate.tasks.filter(t=>t.groupId===group.id):[];
  const localIssues=selected.length?selected.flatMap(t=>assessGroup(group,{...candidate,...t})):assessGroup(group,candidate.workflowEnabled?{...candidate,operation:'tools'}:candidate);
  return {local:result(localIssues,candidate),scenario:validate(candidate)};
}
export function sizingEstimate(s) {
  if(!s.sizing.enabled||s.sizing.parametersB===null)return {known:false,reason:'Supply a parameter count to estimate memory.'};
  const bytes={fp32:4,fp16:2,bf16:2,int8:1,int4:0.5}[s.precision];
  const weightsGiB=s.sizing.parametersB*1e9*bytes/(2**30);
  return {known:true,weightsGiB,perReplicaGiB:weightsGiB+s.sizing.cacheGiB+s.sizing.overheadGiB,totalReplicaGiB:(weightsGiB+s.sizing.cacheGiB+s.sizing.overheadGiB)*s.sizing.replicas,notice:'Analytical estimate, not a reservation. Quantization metadata, activations and caches must be included in the supplied overhead. Replicas do not pool memory.'};
}
export function costEstimate(s) {
 const costs=s.groups.every(g=>g.hourlyCost!==null),power=s.groups.every(g=>g.powerWatts!==null);
 return {currency:s.currency,hourly:costs?s.groups.reduce((a,g)=>a+g.hourlyCost*g.count,0):null,kwhPerDay:power?s.groups.reduce((a,g)=>a+g.powerWatts*g.count,0)*24*s.utilization/1000:null,utilization:s.utilization,basis:'User-declared whole-node hourly cost; energy assumes linear utilization and excludes unlisted network/cooling equipment. No market prices or performance measurements.'};
}
export function buildConfig(s) {
 const v=validate(s);if(v.errors)throw new Error('Configuration blocked: '+v.issues.filter(i=>i.level==='error').map(i=>i.code).join(', '));
 const c=base.buildConfig(s.workflowEnabled?{...s,operation:'tools'}:s);
 return {...c,schema:SCHEMA,ruleset:RULESET,application_version:APP_VERSION,implementation_sequence:[...IMPLEMENTATION_SEQUENCE],components:{...c.components,coordination_core:'Rust reference candidate; implementation language is not a conformance requirement'},deployment:{...c.deployment,groups:s.groups.map(g=>({...g,physical_architecture:g.physicalArch,process_architecture:g.arch,capability_status:'declared',version_status:'declared-unverified'}))},workflow:s.workflowEnabled?{tasks:structuredClone(s.tasks),status:'planning-only; no model adapter execution'}:null,estimates:{memory:sizingEstimate(s),cost:costEstimate(s)},validation:{status:v.status,blocking_errors:0,unresolved_gates:v.issues.map(i=>({code:i.code,group:i.group||null,task:i.task||null,requirement:i.ref,condition:i.message,action:i.fix}))},qualification_manifest:qualificationManifest(s),planning_input:structuredClone(s)};
}
export function qualificationManifest(s) {
 return {schema:'trix.qualification-checklist/v1',status:'not-run',profile_snapshot:structuredClone(s),reviewer:null,evidence:[],mandatory_checks:[{id:'Q-01',requirement:'QUA-003',check:'Measure exact physical/process hardware and software tuple',outcome:'not-run'},{id:'Q-02',requirement:'INT-006',check:'Verify operation/model/precision and numerical criteria',outcome:'not-run'},{id:'Q-03',requirement:'RUN-007',check:'Verify authority, resource admission and fencing',outcome:'not-run'},{id:'Q-04',requirement:'QUA-004',check:'Set and measure latency, throughput, memory, cost and recovery gates',outcome:'not-run'},{id:'Q-05',requirement:'QUA-017',check:'Exercise restart, cancellation, update and restore',outcome:'not-run'},{id:'Q-06',requirement:'QUA-012',check:'Independent review of evidence before qualification',outcome:'not-run'}],invalidation_triggers:['hardware','OS/ABI','driver/firmware','engine/dependency','model/precision','policy','topology'],notice:'A checklist or imported evidence is not a qualification verdict.'};
}
export function importConfig(text) {
 if(typeof text!=='string'||new TextEncoder().encode(text).length>LIMITS.fileBytes)throw new Error('File exceeds 500 KB.');
 const c=JSON.parse(text);
 if(!plain(c)||!plain(c.planning_input))throw new Error('Expected a TriX planning envelope.');
 if(!has([SCHEMA,'trix.environment-planning/v1'],c.schema))throw new Error('Unsupported planning schema revision.');
 if(own(c,'specification_revision')&&c.specification_revision!==REVISION)throw new Error('Unsupported TriX specification revision.');
 if(own(c,'ruleset')&&!has([RULESET,'2026-10-22.1'],c.ruleset))throw new Error('Unsupported rule-set revision.');
 let s=c.planning_input;
 if(c.schema==='trix.environment-planning/v1') {
   const keys=new Set(Object.keys(base.defaults()));const oldGroup=new Set(Object.keys(base.node()));
   if(Object.keys(s).some(k=>!keys.has(k))||!Array.isArray(s.groups)||s.groups.some(g=>!plain(g)||Object.keys(g).some(k=>!oldGroup.has(k))))throw new Error('Invalid legacy fields.');
   s=upgrade(s);
 }
 const shape=issuesForShape(s);if(shape.length)throw new Error(shape[0].message);
 const v=validate(s);
 if(v.issues.some(i=>has(['UNKNOWN_TARGET','ENUM','MEMORY_VALUE','NODE_COUNT','WORKLOAD_MEMORY','DUPLICATE_ID'],i.code)))throw new Error('Invalid planning values.');
 return structuredClone(s);
}
export function envelope(s) {return {schema:SCHEMA,specification_revision:REVISION,ruleset:RULESET,planning_input:structuredClone(s)};}
export function markdown(c) {
 return base.markdown(c)+`\n## Task-specific workflow\n\n${c.workflow?c.workflow.tasks.map(t=>`- ${t.id}: ${t.name}; group ${t.groupId}; dependencies ${t.dependencies.join(', ')||'none'}; ${t.inputType} → ${t.outputType}; ${t.operation}; ${t.memory} GiB.`).join('\n'):'Global workload mode.'}\n\n## Estimates\n\n${JSON.stringify(c.estimates,null,2)}\n\n## Qualification\n\nAll checklist outcomes remain not-run. Version strings and imported declarations are not verified evidence.\n`;
}
