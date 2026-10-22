import {SPECIALISTS,SURFACES} from '../public/specialists.mjs';
export const LIMITS={steps:64,delegations:12,iterations:3,modelTokens:24000,seconds:900};
export const roleById=id=>SPECIALISTS.find(r=>r.id===id);
export function serverConfig(env){
 const list=JSON.parse(env.TRIX_MCP_SERVERS||'[]');
 if(!Array.isArray(list)||list.length>12)throw Error('Invalid MCP server configuration.');
 const ids=new Set();
 return list.map(s=>{
  if(!s||!/^[a-z][a-z0-9-]{0,40}$/.test(s.id)||ids.has(s.id))throw Error('Invalid MCP server identity.');ids.add(s.id);
  const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search||/^(localhost|.*\.localhost|.*\.local|[\d.]+|\[.*\])$/i.test(u.hostname))throw Error('MCP requires a configured public HTTPS hostname.');
  if(!Array.isArray(s.tools)||s.tools.length>30)throw Error('Invalid tool grants.');
  return {...s,tools:s.tools.map(t=>{
   if(!t.name||!['read','implement','test','audit','deploy','verify'].includes(t.purpose)||!Array.isArray(t.roles)||t.roles.some(x=>!roleById(x)))throw Error('Invalid tool policy.');
   if(t.purpose!=='read'&&(!t.fixedArguments||!Object.keys(t.fixedArguments).length))throw Error('External actions require fixed target arguments.');
   if(['test','audit','deploy','verify'].includes(t.purpose)&&typeof t.revisionArgument!=='string')throw Error('Verification and release tools require a revision argument binding.');
   return t;
  })};
 });
}
export function authorize(task,role,server,tool,args){
 const agent=roleById(role);if(!agent||!agent.purposes.includes(tool.purpose)||!tool.roles.includes(role))throw Error('Tool is outside this specialist’s scope.');
 if(!task.grant.servers.includes(server.id))throw Error('Server is outside this task’s grant.');
 if(tool.purpose!=='read'&&!task.grant.actions)throw Error('External actions are not authorized for this task.');
 for(const [key,value] of Object.entries(tool.fixedArguments||{}))if(JSON.stringify(args[key])!==JSON.stringify(value))throw Error('Tool target differs from its operator binding.');
 if(['test','audit','deploy','verify'].includes(tool.purpose)&&(!task.revision||args[tool.revisionArgument]!==task.revision))throw Error('Tool arguments must target the current implementation revision.');
 if(task.effects.some(e=>e.state==='UNKNOWN'))throw Error('Reconcile the uncertain external effect before continuing.');
 if(tool.purpose==='deploy'&&(!task.receipts.test||!task.receipts.audit||task.receipts.test.revision!==task.revision||task.receipts.audit.revision!==task.revision))throw Error('Deployment needs successful test and audit receipts for the current revision.');
 if(tool.purpose==='implement'&&task.iteration>=LIMITS.iterations)throw Error('Improvement iteration limit reached.');
 return true;
}
export function validateSurface(value){if(!SURFACES.includes(value))throw Error('Unknown contextual surface.');return value;}
export function acceptReceipt(task,purpose,result,effectId){
 const r=result?.structuredContent;
 if(['test','audit','verify'].includes(purpose)){delete task.receipts[purpose];if(purpose==='test')delete task.receipts.audit;}
 if(!r||r.status!=='success'||typeof r.revision!=='string'||!r.revision||typeof r.receiptId!=='string'||!r.receiptId)return false;
 if(purpose==='read'&&!task.revision)task.revision=r.revision;
 if(purpose==='implement'){task.iteration++;task.revision=r.revision;task.receipts={};}
 if(['test','audit','verify','deploy'].includes(purpose)&&r.revision!==task.revision)return false;
 if(['test','audit','verify'].includes(purpose)&&r.verdict!=='passed')return false;
 if(['test','audit','verify','deploy'].includes(purpose))task.receipts[purpose]={...r,effectId};
 return true;
}
