// Experimental pure CPU reference subset. It accepts data, never host code.
export const REFERENCE_SCHEMA='trix.reference-plan/v0.1';
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const type=v=>typeof v==='number'&&Number.isFinite(v)?'number':typeof v==='string'?'text':Array.isArray(v)&&v.length<=1024&&v.every(n=>typeof n==='number'&&Number.isFinite(n))?'numbers':null;
export const operations=Object.freeze({
 'number.constant':{args:{value:'number'},output:'number',run:a=>a.value},
 'number.add':{args:{left:'number',right:'number'},output:'number',run:a=>a.left+a.right},
 'number.multiply':{args:{left:'number',right:'number'},output:'number',run:a=>a.left*a.right},
 'numbers.sum':{args:{values:'numbers'},output:'number',run:a=>a.values.reduce((a,b)=>a+b,0)},
 'text.constant':{args:{value:'text'},output:'text',run:a=>a.value},
 'text.uppercase':{args:{value:'text'},output:'text',run:a=>a.value.toUpperCase()}
});
export function examplePlan(){return {schema:REFERENCE_SCHEMA,name:'Pure CPU dependency example',effects:[],tasks:[{id:'task-base',operation:'number.constant',args:{value:6}},{id:'task-scaled',operation:'number.multiply',args:{left:{ref:'task-base'},right:7}},{id:'task-result',operation:'number.add',args:{left:{ref:'task-scaled'},right:8}}],outputs:['task-result']};}
export function verifyPlan(plan){
 const issues=[],order=[];const add=(code,message,node=null)=>issues.push({code,message,node,phase:'verification'});
 const exact=(obj,keys)=>plain(obj)&&Object.keys(obj).sort().join()===keys.sort().join();
 if(!exact(plan,['schema','name','effects','tasks','outputs'])) return {valid:false,issues:[{code:'PLAN_FIELDS',message:'Expected only schema, name, effects, tasks and outputs.',phase:'verification'}],order};
 if(plan.schema!==REFERENCE_SCHEMA)add('PLAN_REVISION','Unsupported reference-plan schema.');
 if(typeof plan.name!=='string'||!plan.name.trim()||plan.name.length>120)add('PLAN_NAME','Name must contain 1–120 characters.');
 if(!Array.isArray(plan.effects)||plan.effects.length)add('EFFECT_DENIED','This pure reference profile allows no effects.');
 if(!Array.isArray(plan.tasks)||plan.tasks.length<1||plan.tasks.length>64) {add('PLAN_SIZE','Use between one and 64 tasks.');return {valid:false,issues,order};}
 const byId=new Map();
 for(const t of plan.tasks){
  if(!exact(t,['id','operation','args'])||typeof t.id!=='string'||!/^task-[A-Za-z0-9_-]{1,100}$/.test(t.id)||!plain(t.args)){add('TASK_SHAPE','Invalid reference task.');continue;}
  if(byId.has(t.id))add('TASK_DUPLICATE','Duplicate task identity.',t.id);
  byId.set(t.id,t);
  if(!Object.hasOwn(operations,t.operation)){add('OPERATION_UNKNOWN','Unregistered operation; no plugin loading is permitted.',t.id);continue;}
  const contract=operations[t.operation];
  if(Object.keys(t.args).sort().join()!==Object.keys(contract.args).sort().join())add('ARGUMENT_FIELDS','Arguments do not match the operation contract.',t.id);
  for(const [key,v] of Object.entries(t.args)){
   if(plain(v)) {if(!exact(v,['ref'])||typeof v.ref!=='string')add('REFERENCE_SHAPE','Reference must contain exactly one string ref.',t.id);}
   else if(type(v)!==contract.args[key]||(typeof v==='string'&&v.length>10000))add('ARGUMENT_TYPE','Argument '+key+' has the wrong type or exceeds its size limit.',t.id);
  }
 }
 for(const t of byId.values())if(Object.hasOwn(operations,t.operation))for(const [key,v] of Object.entries(t.args))if(plain(v)&&typeof v.ref==='string'){
  const parent=byId.get(v.ref);
  if(!parent)add('REFERENCE_MISSING','Reference points to an absent task.',t.id);
  else if(Object.hasOwn(operations,parent.operation)&&operations[parent.operation].output!==operations[t.operation].args[key])add('REFERENCE_TYPE','Reference type does not match the receiving argument.',t.id);
 }
 const done=new Set(),active=new Set();
 const visit=id=>{if(active.has(id)){add('PLAN_CYCLE','Cyclic dependency.',id);return;}if(done.has(id))return;active.add(id);for(const v of Object.values(byId.get(id)?.args||{}))if(plain(v)&&byId.has(v.ref))visit(v.ref);active.delete(id);done.add(id);order.push(id);};
 for(const id of byId.keys())visit(id);
 if(!Array.isArray(plan.outputs)||plan.outputs.length<1||plan.outputs.length>64||new Set(plan.outputs).size!==plan.outputs.length||plan.outputs.some(id=>typeof id!=='string'||!byId.has(id)))add('OUTPUT_REFERENCE','Outputs must identify existing unique tasks.');
 return {valid:issues.length===0,issues,order};
}
export function parsePlan(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>100000)throw new Error('Reference plan exceeds 100 KB.');return JSON.parse(text);}
export function executePlan(plan,{signal}={}){
 const verified=verifyPlan(plan);if(!verified.valid)return {status:'REJECTED',profile:'pure-cpu-reference',issues:verified.issues,trace:[],outputs:null};
 const values=new Map(),trace=[],byId=new Map(plan.tasks.map(t=>[t.id,t]));
 for(const id of verified.order){
  if(signal?.aborted)return {status:'CANCELLED',profile:'pure-cpu-reference',issues:[],trace,outputs:null};
  const t=byId.get(id),args=Object.fromEntries(Object.entries(t.args).map(([k,v])=>[k,plain(v)?values.get(v.ref):v]));
  const value=operations[t.operation].run(args);
  if(type(value)!==operations[t.operation].output)return {status:'FAILED',profile:'pure-cpu-reference',issues:[{code:'NUMERIC_RANGE',message:'Non-finite result is outside this reference profile.',node:id,phase:'execution'}],trace,outputs:null};
  values.set(id,value);trace.push({task:id,operation:t.operation,status:'SUCCEEDED',output_type:type(value)});
 }
 return {status:'SUCCEEDED',profile:'pure-cpu-reference',issues:[],trace,outputs:Object.fromEntries(plan.outputs.map(id=>[id,values.get(id)])),notice:'Executed pure operations on the current CPU. This is an experimental reference subset, not full TriX language or accelerator qualification.'};
}
export function implementationManifest(environment){return {schema:'trix.implementation-binding/v0.1',environment_schema:environment.schema,ruleset:environment.ruleset,phase:'E1',status:'proposed',roles:environment.roles,groups:environment.deployment.groups.map(g=>({id:g.id,process_architecture:g.arch,physical_architecture:g.physicalArch,backend:g.backend,status:'unqualified'})),workflow:environment.workflow,contract:'Bind only independently verified operations after current authority and resource admission. The environment envelope is not an executable plan.',reference_subset:{schema:REFERENCE_SCHEMA,operations:Object.keys(operations),effects:[],binding:'current browser CPU or opt-in Node CLI; independent of model-backend groups'}};}

export class ReferencePlanBuilder {
 #name; #tasks=[];
 constructor(name){this.#name=name;}
 add(id,operation,args){
  const candidate={schema:REFERENCE_SCHEMA,name:this.#name,effects:[],tasks:[...structuredClone(this.#tasks),{id,operation,args:structuredClone(args)}],outputs:[id]};
  const check=verifyPlan(candidate);if(!check.valid)throw new Error(check.issues.map(i=>i.code+': '+i.message).join('; '));
  this.#tasks=candidate.tasks;return {ref:id};
 }
 build(outputs){
  const plan={schema:REFERENCE_SCHEMA,name:this.#name,effects:[],tasks:structuredClone(this.#tasks),outputs:[...outputs]};
  const check=verifyPlan(plan);if(!check.valid)throw new Error(check.issues.map(i=>i.code+': '+i.message).join('; '));return plan;
 }
}
