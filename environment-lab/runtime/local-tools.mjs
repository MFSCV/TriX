import * as environmentDomain from '../public/model.mjs';
import * as cpuDomain from '../public/reference-plan.mjs';
export function checkedEnvironment(value){return environmentDomain.envelope(environmentDomain.importConfig(JSON.stringify(value)));}
export async function runLocalTool(task,name){
 if(name==='reference.run'){
  const result=cpuDomain.executePlan(cpuDomain.examplePlan()),content=JSON.stringify(result,null,2),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)))].map(n=>n.toString(16).padStart(2,'0')).join('');
  task.surfaces.push({id:crypto.randomUUID(),type:'reference',reason:'Pure CPU execution on the server. No external target changed.',execution:'server-cpu',result,content,digest,name:'TriX_CPU_Result.json'});return result;
 }
 if(!task.environment)throw Error('No environment snapshot was attached to this task.');
 const state=environmentDomain.importConfig(JSON.stringify(task.environment));
 if(name==='environment.validate')return environmentDomain.validate(state);
 if(name==='environment.generate'){
  const content=JSON.stringify(environmentDomain.buildConfig(state),null,2),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content)))].map(n=>n.toString(16).padStart(2,'0')).join('');
  task.surfaces.push({id:crypto.randomUUID(),type:'configuration',reason:'Validated planning artifact from this task’s captured environment.',content,digest,name:'TriX_Environment_Configuration.json'});return {artifact:'TriX_Environment_Configuration.json',digest,scope:'Planning export only. No external implementation.'};
 }
 throw Error('Unknown built-in tool.');
}
