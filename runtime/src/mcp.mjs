/** Modern MCP stdio subset. No implicit binding, apply, shell or account authority. */
import {parseStrictJson} from './model.mjs';
export const MCP_PROTOCOL_VERSION='2026-07-28';
const INFO={name:'trix',version:'0.2.0-alpha.1'},LIMIT=2097152;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),s={type:'string'},o={type:'object'};
const definitions=[
 ['trix_config_validate','Validate a scenario without effects.',{scenario:o},['scenario'],'configValidate',v=>v.scenario],
 ['trix_config_generate','Generate a planning configuration without project changes.',{scenario:o},['scenario'],'configGenerate',v=>v.scenario],
 ['trix_plan_create','Create a typed CPU plan for an already bound project.',{projectId:s,input:s,operation:{enum:['text.normalize','json.transform']},options:o,goal:s},['projectId','input'],'planCreate',v=>v],
 ['trix_plan_prompt','Propose a plan through the explicitly configured model.',{projectId:s,prompt:s,input:s},['projectId','prompt','input'],'planFromPrompt',v=>v],
 ['trix_task_submit','Durably submit controlled computation and staging; never applies.',{projectId:s,plan:o,idempotencyKey:s},['projectId','plan','idempotencyKey'],'taskSubmit',v=>({...v,apply:false})],
 ['trix_task_status','Observe a durable task.',{id:s},['id'],'taskGet',v=>v.id],
 ['trix_task_events','Read bounded events after a cursor.',{id:s,after:{type:'integer',minimum:0}},['id'],'taskEvents',v=>[v.id,{after:v.after??0}]],
 ['trix_task_cancel','Request cancellation; acknowledgement is not confirmed stop.',{id:s},['id'],'taskCancel',v=>v.id],
 ['trix_task_evidence','Read attributable task evidence.',{id:s},['id'],'evidenceGet',v=>v.id]
];
export const MCP_TOOLS=definitions.map(([name,description,properties,required])=>({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false}}));
const rpcError=(id,code,message,data)=>({jsonrpc:'2.0',id:id??null,error:{code,message,...(data?{data}:{})}});
const complete=(id,value)=>({jsonrpc:'2.0',id,result:{resultType:'complete',...value,_meta:{'io.modelcontextprotocol/serverInfo':INFO}}});
function validArgs(args,tool){if(!object(args))return false;const {properties,required}=tool.inputSchema;if(Object.keys(args).some(k=>!Object.hasOwn(properties,k))||required.some(k=>!Object.hasOwn(args,k)))return false;return Object.entries(args).every(([k,v])=>{const f=properties[k];if(f.enum)return f.enum.includes(v);if(f.type==='string')return typeof v==='string'&&v.length<=1048576;if(f.type==='object')return object(v);if(f.type==='integer')return Number.isSafeInteger(v)&&v>=f.minimum;return false;});}
export async function handleMcp(request,service){
 const idOk=typeof request?.id==='string'||Number.isSafeInteger(request?.id);
 if(!object(request)||request.jsonrpc!=='2.0'||typeof request.method!=='string'||('id'in request&&!idOk))return rpcError(null,-32600,'Invalid JSON-RPC request.');
 if(!('id'in request))return null;
 if(request.method==='initialize')return rpcError(request.id,-32601,'Modern MCP 2026-07-28 only. Use server/discover and per-request metadata.',{supported:[MCP_PROTOCOL_VERSION]});
 const p=request.params??{},m=p?._meta;
 if(!object(p)||!object(m)||typeof m['io.modelcontextprotocol/protocolVersion']!=='string'||!object(m['io.modelcontextprotocol/clientCapabilities']))return rpcError(request.id,-32602,'Required protocol metadata is missing.');
 const version=m['io.modelcontextprotocol/protocolVersion'];if(version!==MCP_PROTOCOL_VERSION)return rpcError(request.id,-32022,'Unsupported protocol version.',{supported:[MCP_PROTOCOL_VERSION],requested:version});
 if(request.method==='server/discover')return complete(request.id,{supportedVersions:[MCP_PROTOCOL_VERSION],capabilities:{tools:{}},instructions:'Controlled CPU planning/execution only. Projects must already be bound. No shell, skill installation, account connection or project apply tools.'});
 if(request.method==='ping')return complete(request.id,{});
 if(request.method==='tools/list')return complete(request.id,{tools:MCP_TOOLS});
 if(request.method!=='tools/call')return rpcError(request.id,-32601,'Method not found.');
 const i=definitions.findIndex(d=>d[0]===p.name);if(i<0)return rpcError(request.id,-32602,'Unknown TriX tool.');
 const args=p.arguments??{};if(!validArgs(args,MCP_TOOLS[i]))return rpcError(request.id,-32602,'Arguments do not match the bounded tool schema.');
 try{const d=definitions[i],v=d[5](args),result=await service[d[4]](...(d[4]==='taskEvents'?v:[v])),json=JSON.stringify(result??null);if(Buffer.byteLength(json)>LIMIT)throw Object.assign(new Error('Result exceeds transport output limit.'),{code:'OUTPUT_LIMIT'});return complete(request.id,{content:[{type:'text',text:json}],isError:false});}
 catch(e){return complete(request.id,{content:[{type:'text',text:JSON.stringify({code:e.code||'OPERATION_FAILED',message:e.message||'TriX operation failed.'})}],isError:true});}
}
export async function runJsonLines(handler,{input=process.stdin,output=process.stdout,onError=()=>{}}={}){
 let buffered=Buffer.alloc(0),pending=new Set(),writeChain=Promise.resolve(),outputFailed=false;const ids=new Set();
 const outputError=e=>{outputFailed=true;onError(e);};output.on('error',outputError);
 const send=message=>{if(message==null||output.destroyed||outputFailed)return Promise.resolve();const line=JSON.stringify(message)+'\n';writeChain=writeChain.then(()=>new Promise((resolve,reject)=>{if(output.destroyed||outputFailed){resolve();return;}output.write(line,e=>e?reject(e):resolve());})).catch(outputError);return writeChain;};
 const launch=line=>{let r;try{r=parseStrictJson(new TextDecoder('utf-8',{fatal:true}).decode(line),LIMIT);}catch{return send(rpcError(null,-32700,'Parse error.'));}const id=object(r)&&'id'in r?r.id:undefined;if(id!==undefined&&ids.has(id))return send(rpcError(id,-32600,'Request ID is already in flight.'));if(id!==undefined)ids.add(id);let job;job=Promise.resolve().then(()=>handler(r,send)).then(send).catch(()=>send(rpcError(id,-32603,'Internal protocol error.'))).finally(()=>{pending.delete(job);ids.delete(id);});pending.add(job);return job;};
 try{for await(const chunk of input){buffered=Buffer.concat([buffered,Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk)]);let at;while((at=buffered.indexOf(10))!==-1){const line=buffered.subarray(0,at);buffered=buffered.subarray(at+1);if(line.length>LIMIT){await send(rpcError(null,-32600,'Message exceeds size limit.'));continue;}if(line.toString('utf8').trim())launch(line);if(pending.size>=8)await Promise.race(pending);}if(buffered.length>LIMIT){await send(rpcError(null,-32600,'Message exceeds size limit.'));buffered=Buffer.alloc(0);break;}}if(buffered.length&&buffered.toString('utf8').trim())launch(buffered);await Promise.all(pending);await writeChain;}finally{output.off('error',outputError);}
}
export function runStdio(service,options){return runJsonLines(r=>handleMcp(r,service),options);}
