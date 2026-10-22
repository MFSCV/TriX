/** Explicit configured modern HTTP MCP, separate credentials and no automatic retries. */
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns/promises';
import {isIP} from 'node:net';
import {randomUUID} from 'node:crypto';
import {StringDecoder} from 'node:string_decoder';
import {parseStrictJson} from './model.mjs';
import {MCP_PROTOCOL_VERSION} from './mcp.mjs';
const LIMIT=262144,object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function fail(code,message){throw Object.assign(new Error(message),{code});}
function addressAllowed(a,allow){
 const n=a.toLowerCase();
 if(isIP(a)===4){const [x,y,z]=a.split('.').map(Number);if(x===0||(x===169&&y===254)||x>=224)return false;const restricted=x===10||x===127||(x===100&&y>=64&&y<=127)||(x===172&&y>=16&&y<=31)||(x===192&&(y===168||(y===0&&(z===0||z===2))))||(x===198&&(y===18||y===19||(y===51&&z===100)))||(x===203&&y===0&&z===113);return allow||!restricted;}
 if(isIP(a)!==6||n.startsWith('::ffff:')||n==='::'||/^fe[89ab]/.test(n)||n.startsWith('ff'))return false;
 return allow||!(n==='::1'||n.startsWith('fc')||n.startsWith('fd')||n.startsWith('2001:db8:'));
}
function jsonValue(v,d=0){
 if(d>24)fail('INVALID_ARGUMENT','MCP argument nesting limit exceeded.');
 if(v===null||typeof v==='boolean'||typeof v==='string')return;
 if(typeof v==='number'){if(!Number.isFinite(v))fail('INVALID_ARGUMENT','MCP numbers must be finite.');return;}
 if(Array.isArray(v)){if(v.length>1024)fail('INVALID_ARGUMENT','MCP array limit exceeded.');v.forEach(x=>jsonValue(x,d+1));return;}
 if(!object(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('INVALID_ARGUMENT','MCP arguments must be JSON values.');
 const fields=Object.getOwnPropertyDescriptors(v);if(Object.keys(fields).length>256)fail('INVALID_ARGUMENT','MCP field limit exceeded.');for(const f of Object.values(fields)){if(!('value'in f))fail('INVALID_ARGUMENT','MCP argument accessors prohibited.');jsonValue(f.value,d+1);}
}
function parameterHeaders(schema,args){
 const headers={},names=new Set();let visited=0;
 const walk=(n,p,reachable,d)=>{
  if(d>24||++visited>2048)fail('PROTOCOL_INVALID','Remote schema exceeds inspection limits.');
  if(Array.isArray(n)){n.forEach(x=>walk(x,p,false,d+1));return;}if(!object(n))return;
  if('x-mcp-header'in n){const name=n['x-mcp-header'];if(!reachable||!p.length||'$ref'in n||typeof name!=='string'||!/^[!#$%&'*+.^_`|~A-Za-z0-9-]+$/.test(name)||!['integer','string','boolean'].includes(n.type)||names.has(name.toLowerCase()))fail('PROTOCOL_INVALID','Invalid or unreachable parameter-header annotation.');names.add(name.toLowerCase());let v=args;for(const k of p){if(!object(v)||!Object.hasOwn(v,k)){v=undefined;break;}v=v[k];}if(v!==undefined&&v!==null){if((n.type==='integer'&&!Number.isSafeInteger(v))||(n.type==='string'&&typeof v!=='string')||(n.type==='boolean'&&typeof v!=='boolean'))fail('INVALID_ARGUMENT','Invalid header-bound primitive.');const s=String(v),safe=/^[\x20-\x7e]*$/.test(s)&&s===s.trim()&&!(s.startsWith('=?base64?')&&s.endsWith('?='));headers['mcp-param-'+name]=safe?s:'=?base64?'+Buffer.from(s,'utf8').toString('base64')+'?=';}}
  for(const [k,v]of Object.entries(n)){if(k==='properties'&&reachable&&object(v)){for(const [field,child]of Object.entries(v))walk(child,[...p,field],true,d+1);}else if(k!=='x-mcp-header')walk(v,p,false,d+1);}
 };walk(schema,[],true,0);if(Buffer.byteLength(JSON.stringify(headers))>8192)fail('INVALID_ARGUMENT','Parameter headers exceed 8 KiB.');return headers;
}
export function createMcpConnection(config={}){
 if(!object(config)||Object.keys(config).some(k=>!['url','allowedTools','token','allowPrivate','protocolVersion','assertAuthorized'].includes(k)))fail('INVALID_ARGUMENT','Unsupported connection configuration.');
 const {url,allowedTools,token,allowPrivate=false,protocolVersion=MCP_PROTOCOL_VERSION,assertAuthorized}=config;
 if(assertAuthorized!==undefined&&typeof assertAuthorized!=='function')fail('INVALID_ARGUMENT','Authorization recheck requires an application-owned callback.');
 if(protocolVersion!==MCP_PROTOCOL_VERSION)fail('PROTOCOL_UNSUPPORTED','Only modern MCP 2026-07-28 is implemented.');
 if(typeof allowPrivate!=='boolean'||!Array.isArray(allowedTools)||allowedTools.length>64||allowedTools.some(n=>typeof n!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/.test(n))||new Set(allowedTools).size!==allowedTools.length)fail('INVALID_ARGUMENT','Declare unique bounded tool names and private-address policy.');
 if(token!==undefined&&(typeof token!=='string'||!token||token.length>8192||/[\r\n]/.test(token)))fail('INVALID_ARGUMENT','Invalid bounded secret token.');
 let u;try{u=new URL(url);}catch{fail('INVALID_ARGUMENT','MCP URL must be absolute.');}
 const host=u.hostname.replace(/^\[|\]$/g,''),loop=['localhost','127.0.0.1','::1'].includes(host);
 if(u.username||u.password||u.search||u.hash||!['http:','https:'].includes(u.protocol))fail('PERMISSION_DENIED','MCP URL scheme or embedded credentials are prohibited.');
 if(u.protocol==='http:'&&!(allowPrivate&&loop))fail('PERMISSION_DENIED','HTTPS required except explicitly approved loopback HTTP.');
 if(isIP(host)&&!addressAllowed(host,allowPrivate))fail('PERMISSION_DENIED','MCP address violates destination policy.');
 const allowed=new Set(allowedTools);
 async function invoke(method,parameters,extraHeaders={}){
  await assertAuthorized?.();let addresses,timer;
  try{addresses=isIP(host)?[{address:host,family:isIP(host)}]:await Promise.race([dns.lookup(host,{all:true,verbatim:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('DNS deadline')),5000);})]);}catch{fail('CONNECTION_UNAVAILABLE','Configured MCP destination cannot be resolved.');}finally{clearTimeout(timer);}
  if(!addresses.length||addresses.some(a=>!addressAllowed(a.address,allowPrivate)))fail('PERMISSION_DENIED','MCP DNS resolution violates destination policy.');
  const pinned=addresses[0];await assertAuthorized?.();const id=randomUUID();
  const body=JSON.stringify({jsonrpc:'2.0',id,method,params:{...parameters,_meta:{'io.modelcontextprotocol/protocolVersion':protocolVersion,'io.modelcontextprotocol/clientInfo':{name:'trix',version:'0.2.0-alpha.1'},'io.modelcontextprotocol/clientCapabilities':{}}}});
  if(Buffer.byteLength(body)>65536)fail('INVALID_ARGUMENT','MCP request exceeds 64 KiB.');
  return new Promise((resolve,reject)=>{
   const rejectCode=(code,message)=>reject(Object.assign(new Error(message),{code}));
   // Native HTTP never follows redirects. DNS is validated and pinned per request.
   const transport=u.protocol==='https:'?https:http;
   const req=transport.request(u,{method:'POST',agent:false,lookup:(_h,options,callback)=>{if(typeof options==='function')callback=options;if(options?.all)callback(null,[pinned]);else callback(null,pinned.address,pinned.family);},headers:{'content-type':'application/json',accept:'application/json, text/event-stream','mcp-protocol-version':protocolVersion,'mcp-method':method,...(parameters.name?{'mcp-name':parameters.name}:{}),...extraHeaders,'content-length':Buffer.byteLength(body),...(token?{authorization:'Bearer '+token}:{})}},response=>{
    if(response.statusCode<200||response.statusCode>=300){response.resume();rejectCode('CONNECTION_UNAVAILABLE',`Configured MCP endpoint returned HTTP ${response.statusCode}; redirects are not followed.`);return;}
    const type=(response.headers['content-type']??'').toLowerCase(),sse=type.startsWith('text/event-stream');
    if(!sse&&!type.startsWith('application/json')){response.resume();rejectCode('PROTOCOL_UNSUPPORTED','Expected JSON or request-scoped SSE.');return;}
    if(response.headers['mcp-protocol-version']&&response.headers['mcp-protocol-version']!==protocolVersion){response.resume();rejectCode('PROTOCOL_UNSUPPORTED','Response protocol header does not match.');return;}
    let size=0,buffer='',finished=false;const chunks=[],decoder=new StringDecoder('utf8');
    const accept=m=>{if(!object(m)||m.jsonrpc!=='2.0')fail('PROTOCOL_INVALID','Invalid MCP response.');if(sse&&!('id'in m)&&typeof m.method==='string')return;if(m.id!==id||(('error'in m)===('result'in m)))fail('PROTOCOL_INVALID','MCP response identity/envelope mismatch.');if(m.error)fail('CONNECTION_REJECTED','Configured MCP server rejected the request.');if(!object(m.result)||m.result.resultType!=='complete')fail('PROTOCOL_UNSUPPORTED','Only complete MCP results are implemented.');finished=true;resolve(m.result);if(sse)response.destroy();};
    response.on('data',chunk=>{size+=chunk.length;if(size>LIMIT){response.destroy();rejectCode('OUTPUT_LIMIT','MCP response exceeds 256 KiB.');return;}if(!sse){chunks.push(chunk);return;}try{buffer+=decoder.write(chunk);let boundary;while((boundary=buffer.search(/\r?\n\r?\n/))!==-1&&!finished){const separator=buffer.slice(boundary).match(/^\r?\n\r?\n/)[0],event=buffer.slice(0,boundary);buffer=buffer.slice(boundary+separator.length);const data=event.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).replace(/^ /,'')).join('\n');if(data)accept(parseStrictJson(data,LIMIT));}}catch(e){response.destroy();rejectCode(e.code||'PROTOCOL_INVALID',e.code?e.message:'Invalid MCP SSE message.');}});
    response.on('error',()=>{if(!finished)rejectCode('CONNECTION_UNAVAILABLE','MCP response was interrupted.');});
    response.on('end',()=>{if(finished)return;try{if(sse)fail('PROTOCOL_INVALID','SSE ended without final response.');accept(parseStrictJson(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)),LIMIT));}catch(e){rejectCode(e.code||'PROTOCOL_INVALID',e.code?e.message:'Invalid MCP JSON.');}});
   });
   const deadline=setTimeout(()=>{req.destroy();rejectCode('CONNECTION_TIMEOUT','Configured MCP request exceeded 10 seconds.');},10000);req.on('close',()=>clearTimeout(deadline));req.on('error',()=>rejectCode('CONNECTION_UNAVAILABLE','Configured MCP endpoint is unavailable.'));req.end(body);
  });
 }
 return {
  describe(){return {kind:'mcp-http',origin:u.origin,path:u.pathname,protocol_version:protocolVersion,allowed_tools:[...allowed].sort(),private_addresses_allowed:allowPrivate,response_profile:'json-or-bounded-sse-complete',custom_parameter_headers:'bounded-static-properties',credentials:token?'configured':'none'};},
  async discover(){const r=await invoke('server/discover',{});if(!Array.isArray(r.supportedVersions)||!r.supportedVersions.includes(protocolVersion))fail('PROTOCOL_UNSUPPORTED','Server does not advertise the pinned version.');return r;},
  async callTool(name,args={}){
   if(!allowed.has(name))fail('PERMISSION_DENIED','Tool is outside the explicit allowlist.');if(!object(args))fail('INVALID_ARGUMENT','Tool arguments must be an object.');jsonValue(args);
   let cursor,definition;
   for(let page=0;page<8;page++){const r=await invoke('tools/list',cursor?{cursor}:{});if(!Array.isArray(r.tools)||r.tools.length>256)fail('PROTOCOL_INVALID','Invalid or oversized tool catalogue.');const matches=r.tools.filter(t=>object(t)&&t.name===name);if(matches.length>1)fail('PROTOCOL_INVALID','Duplicate remote tool names.');if(matches.length){definition=matches[0];break;}if(r.nextCursor===undefined)break;if(typeof r.nextCursor!=='string'||r.nextCursor.length>4096||r.nextCursor===cursor)fail('PROTOCOL_INVALID','Invalid remote cursor.');cursor=r.nextCursor;}
   if(!definition||!object(definition.inputSchema))fail('CAPABILITY_UNAVAILABLE','Allowlisted tool has no usable declaration.');
   const r=await invoke('tools/call',{name,arguments:args},parameterHeaders(definition.inputSchema,args));if(r.isError===true)fail('TOOL_FAILED','Remote tool returned an error; effects require reconciliation.');return r;
  }
 };
}
