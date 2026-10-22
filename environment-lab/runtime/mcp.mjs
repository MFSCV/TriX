import {RELEASE} from '../public/release.mjs';
const MCP_VERSION='2025-11-25';
export async function boundedText(response,max=262144){
 if(!response.body)return '';const reader=response.body.getReader(),decoder=new TextDecoder();let out='',bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>max)throw Error('Remote response exceeded its size limit.');out+=decoder.decode(value,{stream:true});}return out+decoder.decode();}finally{await reader.cancel().catch(()=>{});}
}
export function parseMcpResponse(text,type,id){
 let messages=[];
 if(type.includes('text/event-stream')){
  for(const event of text.split(/\r?\n\r?\n/)){const data=event.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data)messages.push(JSON.parse(data));}
 }else messages=[JSON.parse(text)];
 const result=messages.find(m=>m.jsonrpc==='2.0'&&m.id===id);if(!result)throw Error('MCP response did not match the request.');
 if(result.error)throw Error('MCP returned a protocol error.');if(!('result' in result))throw Error('Missing MCP result.');return result.result;
}
// Fail closed on unsupported JSON Schema constructs. No server-defined code runs.
export function validateArguments(value,schema,depth=0){
 if(depth>16||!schema||typeof schema!=='object')throw Error('Unsupported tool schema.');
 const supported=new Set(['type','properties','required','additionalProperties','items','enum','const','description','title','$schema','minimum','maximum','minLength','maxLength','minItems','maxItems','default','examples']);
 if(Object.keys(schema).some(k=>!supported.has(k)))throw Error('Tool schema requires an unsupported validator feature.');
 const type=Array.isArray(value)?'array':value===null?'null':typeof value;
 if(schema.type&&!(schema.type==='integer'?Number.isInteger(value):schema.type===type))throw Error('Tool argument type mismatch.');
 if(schema.enum&&!schema.enum.some(v=>JSON.stringify(v)===JSON.stringify(value)))throw Error('Tool argument is outside its enum.');
 if('const' in schema&&JSON.stringify(value)!==JSON.stringify(schema.const))throw Error('Tool argument differs from its constant.');
 if(type==='object'){
  for(const k of schema.required||[])if(!Object.hasOwn(value,k))throw Error('Missing required tool argument.');
  for(const [k,v] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(k))throw Error('Invalid argument key.');if(schema.properties?.[k])validateArguments(v,schema.properties[k],depth+1);else if(schema.additionalProperties===false)throw Error('Unexpected tool argument.');else if(typeof schema.additionalProperties==='object')validateArguments(v,schema.additionalProperties,depth+1);}
 }
 if(type==='array'){if(value.length>(schema.maxItems??100)||value.length<(schema.minItems??0))throw Error('Tool array exceeds limits.');for(const v of value)validateArguments(v,schema.items||{},depth+1);}
 if(type==='string'&&(value.length>(schema.maxLength??20000)||value.length<(schema.minLength??0)))throw Error('Tool string exceeds limits.');
 if(type==='number'&&(!Number.isFinite(value)||value<(schema.minimum??-Infinity)||value>(schema.maximum??Infinity)))throw Error('Tool number exceeds limits.');return true;
}
export async function withMcp(server,env,operation,fetcher=fetch){
 let session=null,counter=0;const secret=server.tokenEnv?env[server.tokenEnv]:null;
 if(server.tokenEnv&&!secret)throw Error('MCP credential is not configured.');
 async function rpc(method,params,notify=false){
  const id=notify?undefined:++counter,headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream','MCP-Protocol-Version':MCP_VERSION};
  if(secret)headers.Authorization='Bearer '+secret;if(session)headers['Mcp-Session-Id']=session;
  const res=await fetcher(server.url,{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',...(notify?{}:{id}),method,params}),redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error('MCP request failed (HTTP '+res.status+').');
  if(method==='initialize')session=res.headers.get('mcp-session-id');
  let text=await boundedText(res);if(secret)text=text.split(secret).join('[redacted]');
  if(notify)return null;return parseMcpResponse(text,res.headers.get('content-type')||'',id);
 }
 try{
  const hello=await rpc('initialize',{protocolVersion:MCP_VERSION,capabilities:{},clientInfo:{name:'TriX',version:RELEASE.version}});
  if(hello.protocolVersion!==MCP_VERSION)throw Error('This adapter supports MCP 2025-11-25 only.');
  await rpc('notifications/initialized',{},true);return await operation(rpc);
 }finally{
  if(session){const headers={'Mcp-Session-Id':session,'MCP-Protocol-Version':MCP_VERSION};if(secret)headers.Authorization='Bearer '+secret;await fetcher(server.url,{method:'DELETE',headers,redirect:'error',signal:AbortSignal.timeout(3000)}).catch(()=>{});}
 }
}
export async function mcpDiscover(server,env,fetcher){return withMcp(server,env,async rpc=>{let cursor,tools=[];for(let i=0;i<4;i++){const r=await rpc('tools/list',cursor?{cursor}:{});if(!Array.isArray(r.tools))throw Error('Invalid MCP tools/list result.');tools.push(...r.tools);if(!r.nextCursor)return tools;cursor=r.nextCursor;}throw Error('MCP discovery exceeded its pagination limit.');},fetcher);}
export async function mcpCall(server,tool,args,env,fetcher,trace={}){
 return withMcp(server,env,async rpc=>{
  // Discover and validate against the live contract in this same session.
  const listed=await rpc('tools/list',{}),live=listed.tools?.find(t=>t.name===tool.name);
  if(!live)throw Error('Granted tool was not found on the server’s first tool page.');validateArguments(args,live.inputSchema);
  const result=await rpc('tools/call',{name:tool.name,arguments:args,_meta:{'dev.trix/task-id':trace.taskId||null,'dev.trix/effect-id':trace.effectId||null}});if(result.isError)throw Error('MCP tool reported an error.');return result;
 },fetcher);
}
