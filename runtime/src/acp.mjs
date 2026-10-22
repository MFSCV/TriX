/** Experimental ACP v1 planning-only bridge for existing local project bindings. */
import {randomUUID} from 'node:crypto';
import {isAbsolute,resolve} from 'node:path';
import {runJsonLines} from './mcp.mjs';
const contexts=new WeakMap(),object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const err=(id,code,message,data)=>({jsonrpc:'2.0',id:id??null,error:{code,message,...(data?{data}:{})}}),result=(id,value)=>({jsonrpc:'2.0',id,result:value});
export function createAcpContext(){return {initialized:false,sessions:new Map()};}
function forService(s){if(!contexts.has(s))contexts.set(s,createAcpContext());return contexts.get(s);}
export async function handleAcp(r,service,c=forService(service),emit=async()=>{}){
 const hasId=object(r)&&'id'in r;
 if(!object(r)||r.jsonrpc!=='2.0'||typeof r.method!=='string'||(hasId&&!(typeof r.id==='string'||Number.isSafeInteger(r.id))))return err(null,-32600,'Invalid JSON-RPC request.');
 const p=r.params??{};if(!object(p))return hasId?err(r.id,-32602,'Params must be an object.'):null;
 if(r.method==='session/cancel'){if(hasId)return err(r.id,-32600,'Cancellation is a notification without ID.');const s=c.sessions.get(p.sessionId);s?.controller?.abort();if(s)s.cancelled=true;return null;}
 if(!hasId)return null;
 if(r.method==='initialize'){if(!Number.isSafeInteger(p.protocolVersion))return err(r.id,-32602,'protocolVersion must be an integer.');c.initialized=p.protocolVersion===1;return result(r.id,{protocolVersion:1,agentCapabilities:{loadSession:false,promptCapabilities:{image:false,audio:false,embeddedContext:false},mcpCapabilities:{http:false,sse:false}},agentInfo:{name:'trix',title:'TriX bounded planning bridge',version:'0.2.0-alpha.1'},authMethods:[],_meta:{'io.trix/profile':'experimental-planning-only','io.trix/limitations':'Already-bound roots only; no terminal, file access, external MCP server launch, session reload or automatic apply.'}});}
 if(!c.initialized)return err(r.id,-32000,'Initialize mutually supported ACP v1 first.');
 if(r.method==='authenticate')return err(r.id,-32602,'No authentication methods are advertised by this local bridge.');
 if(r.method==='session/new'){
  if(typeof p.cwd!=='string'||!isAbsolute(p.cwd)||(p.mcpServers!==undefined&&(!Array.isArray(p.mcpServers)||p.mcpServers.length))||(p.additionalDirectories!==undefined&&(!Array.isArray(p.additionalDirectories)||p.additionalDirectories.length)))return err(r.id,-32602,'Use one already-bound absolute cwd and no new MCP servers/directories.');
  if(c.sessions.size>=64)return err(r.id,-32602,'Session limit reached.');
  try{const list=await service.projectList(),projects=Array.isArray(list)?list:list?.projects??[],project=projects.find(v=>typeof v.root==='string'&&resolve(v.root)===resolve(p.cwd));if(!project)return err(r.id,-32602,'cwd is not an authorized project binding.');const id=project.id??project.project_id;if(p._meta?.['io.trix/projectId']&&p._meta['io.trix/projectId']!==id)return err(r.id,-32602,'Project identity does not match cwd.');const sessionId='trix-acp-'+randomUUID();c.sessions.set(sessionId,{projectId:id,cwd:resolve(p.cwd),lastPlan:null,controller:null,cancelled:false});return result(r.id,{sessionId});}catch(e){return err(r.id,-32603,e.message||'Project lookup failed.');}
 }
 if(r.method!=='session/prompt')return err(r.id,-32601,'Unsupported method for the experimental planning-only ACP profile.');
 const s=c.sessions.get(p.sessionId);if(!s)return err(r.id,-32602,'Unknown local session. Reload is not supported.');if(s.controller)return err(r.id,-32602,'A prompt is already active in this session.');
 if(!Array.isArray(p.prompt)||!p.prompt.length||p.prompt.length>32||p.prompt.some(v=>!object(v)||v.type!=='text'||typeof v.text!=='string'))return err(r.id,-32602,'Only bounded text prompt blocks are supported.');
 const prompt=p.prompt.map(v=>v.text).join('\n'),input=p._meta?.['io.trix/input']??'';
 if(!prompt.trim()||Buffer.byteLength(prompt)>16384||typeof input!=='string'||Buffer.byteLength(input)>65536)return err(r.id,-32602,'ACP prompt/input limits are 16 KiB/64 KiB.');
 const controller=new AbortController();s.controller=controller;s.cancelled=false;
 try{const plan=await service.planFromPrompt({projectId:s.projectId,prompt,input,signal:controller.signal});if(controller.signal.aborted)return result(r.id,{stopReason:'cancelled'});s.lastPlan=plan;await emit({jsonrpc:'2.0',method:'session/update',params:{sessionId:p.sessionId,update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:JSON.stringify({status:'planned',plan,applied:false,message:'Typed plan created. No task executed or project files changed. Use the authorized TriX task workflow to execute/apply.'})}}}});return result(r.id,{stopReason:'end_turn'});}catch(e){if(controller.signal.aborted||e.code==='CANCELLED')return result(r.id,{stopReason:'cancelled'});return err(r.id,-32603,e.message||'Planning failed.',{code:e.code||'PLANNING_FAILED'});}finally{s.controller=null;}
}
export function runAcp(service,options){const c=createAcpContext();return runJsonLines((r,emit)=>handleAcp(r,service,c,emit),options);}
