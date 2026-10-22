import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {Readable,Writable} from 'node:stream';
import {createModelFromEnv,planWithModel,validateModelPlan,parseStrictJson} from '../src/model.mjs';
import {handleMcp,runStdio,MCP_PROTOCOL_VERSION} from '../src/mcp.mjs';
import {handleAcp,createAcpContext,runAcp} from '../src/acp.mjs';
import {createMcpConnection} from '../src/mcp-client.mjs';
const ctx={projectId:'fixture',prompt:'Uppercase and trim the payload.',input:' hello ',sourceRevision:'snapshot-1'};
const proposal={operation:'text.normalize',options:{trim:true,case:'upper'},goal:'Normalize the supplied text.'};
const rpc=(method,params={},id=1)=>({jsonrpc:'2.0',id,method,params});
const meta={'io.modelcontextprotocol/protocolVersion':MCP_PROTOCOL_VERSION,'io.modelcontextprotocol/clientCapabilities':{}};
const mcp=(method,params={},id=1)=>rpc(method,{...params,_meta:meta},id);
async function provider(t,handler){const s=createServer(handler);await new Promise(r=>s.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{s.closeAllConnections();s.close(r);}));return `http://127.0.0.1:${s.address().port}/v1/chat/completions`;}
async function body(req){let text='';for await(const c of req)text+=c;return JSON.parse(text);}
function json(res,value){res.setHeader('content-type','application/json');res.end(JSON.stringify(value));}
const model=url=>createModelFromEnv({TRIX_MODEL_URL:url,TRIX_MODEL:'mock-fixture-v1'});
const connection=(url,extra={})=>createMcpConnection({url,allowedTools:['fixture_read'],allowPrivate:true,...extra});
const declaration={name:'fixture_read',inputSchema:{type:'object',properties:{}}};

test('model is not inferred from subscriptions or absent configuration',async()=>{
 assert.equal(createModelFromEnv({}),null);await assert.rejects(planWithModel(ctx),{code:'MODEL_NOT_CONFIGURED'});assert.throws(()=>createModelFromEnv({TRIX_MODEL:'name'}),{code:'MODEL_CONFIGURATION_INVALID'});
});
test('model outputs are bounded proposals, never code or grants',async()=>{
 assert.deepEqual(await planWithModel({...ctx,model:{plan:async()=>proposal}}),proposal);
 for(const v of [null,{...proposal,code:'process.exit()'},{...proposal,grant:'all'},{...proposal,operation:'execute_shell'},{...proposal,options:{trim:'yes'}},{...proposal,options:{case:'turkish'}},{...proposal,options:{newline:'crlf'}},{...proposal,goal:'x'.repeat(2001)},{operation:'json.transform',options:{pick:['x','x']},goal:'Pick x.'}])assert.throws(()=>validateModelPlan(v),{code:'MODEL_OUTPUT_INVALID'});
});
test('model inputs and cancellation are bounded before invocation',async()=>{
 let calls=0;const model={plan:async()=>{calls++;return proposal;}};
 for(const change of [{prompt:'x'.repeat(17000)},{input:'x'.repeat(1048577)},{input:'\ud800'},{projectId:'../other'}])await assert.rejects(planWithModel({...ctx,...change,model}),{code:'INVALID_ARGUMENT'});
 await assert.rejects(planWithModel({...ctx,signal:AbortSignal.abort(),model}),{code:'CANCELLED'});assert.equal(calls,0);
});
test('HTTP mock model receives structured limits; credential never returned',async t=>{
 const requests=[],secret='synthetic-model-secret';const url=await provider(t,async(req,res)=>{requests.push({headers:req.headers,body:await body(req)});json(res,{choices:[{finish_reason:'stop',message:{content:JSON.stringify(proposal)}}]});});
 const m=createModelFromEnv({TRIX_MODEL_URL:url,TRIX_MODEL:'mock',TRIX_MODEL_TOKEN:secret});assert.deepEqual(await planWithModel({...ctx,model:m}),proposal);assert.equal(requests[0].headers.authorization,'Bearer '+secret);assert.equal(requests[0].body.max_tokens,1024);assert.ok(requests[0].body.messages[1].content.includes(ctx.input));assert.ok(!JSON.stringify(m.describe()).includes(secret));
});
test('HTTP mock errors and redirects never leak secret response text',async t=>{
 const secret='synthetic-error-secret',url=await provider(t,(_req,res)=>{res.writeHead(401);res.end(secret);});await assert.rejects(planWithModel({...ctx,model:model(url)}),e=>e.code==='MODEL_UNAVAILABLE'&&!e.message.includes(secret));
 const redirect=await provider(t,(_req,res)=>{res.writeHead(302,{location:'http://127.0.0.1:1/private'});res.end();});await assert.rejects(planWithModel({...ctx,model:model(redirect)}),{code:'MODEL_UNAVAILABLE'});
});
test('HTTP model rejects tool calls, duplicate fields, truncation and oversized results',async t=>{
 for(const value of [{choices:[{finish_reason:'length',message:{content:JSON.stringify(proposal)}}]},{choices:[{message:{content:'{}',tool_calls:[{id:'injection'}]}}]},{choices:[{message:{content:'{"operation":"text.normalize","operation":"json.transform","options":{},"goal":"ambiguous"}'}}]},{choices:[{message:{content:'x'.repeat(70000)}}]}]){const url=await provider(t,(_req,res)=>json(res,value));await assert.rejects(planWithModel({...ctx,model:model(url)}),{code:'MODEL_OUTPUT_INVALID'});}
});
test('model endpoint policy distinguishes explicit private HTTP',()=>{
 for(const url of ['file:///tmp/private','http://169.254.169.254/metadata','https://user:secret@example.com/v1','https://example.com/v1?key=secret','http://remote.example/v1'])assert.throws(()=>createModelFromEnv({TRIX_MODEL_URL:url,TRIX_MODEL:'mock'}),{code:'MODEL_CONFIGURATION_INVALID'});
 assert.equal(createModelFromEnv({TRIX_MODEL_URL:'http://ollama.local:11434/v1',TRIX_MODEL:'local',TRIX_MODEL_ALLOW_HTTP:'true'}).describe().planning_only,true);
});
test('strict JSON rejects duplicate escaped keys, excessive depth, unsafe numbers and trailing input',()=>{
 assert.deepEqual(parseStrictJson('{"a":[true,null,{"x":1}]}'),{a:[true,null,{x:1}]});for(const text of ['{"a":1,"a":2}','{"a":1,"\\u0061":2}','['.repeat(35)+'0'+']'.repeat(35),'{}{}','[1,]','NaN','1e9999',''])assert.throws(()=>parseStrictJson(text));
});
test('MCP modern discovery is stateless and validates required version metadata',async()=>{
 const r=await handleMcp(mcp('server/discover'),{});assert.deepEqual(r.result.supportedVersions,[MCP_PROTOCOL_VERSION]);assert.equal(r.result.resultType,'complete');assert.equal((await handleMcp(rpc('tools/list'),{})).error.code,-32602);assert.equal((await handleMcp(rpc('initialize',{protocolVersion:'2025-11-25'}),{})).error.code,-32601);const wrong=mcp('tools/list');wrong.params._meta={...meta,'io.modelcontextprotocol/protocolVersion':'1900-01-01'};assert.equal((await handleMcp(wrong,{})).error.code,-32022);assert.equal(await handleMcp({jsonrpc:'2.0',method:'notifications/cancelled'},{}),null);
});
test('MCP bounded tools cannot bind projects, execute shell or grant apply',async()=>{
 const calls=[],service={taskSubmit:async v=>{calls.push(v);return{id:'task',lifecycle:'QUEUED'};}};assert.ok(!(await handleMcp(mcp('tools/list'),service)).result.tools.some(t=>/shell|apply|bind/.test(t.name)));const args={projectId:'fixture',plan:{id:'p'},idempotencyKey:'stable'};assert.equal((await handleMcp(mcp('tools/call',{name:'trix_task_submit',arguments:args}),service)).result.isError,false);assert.equal(calls[0].apply,false);assert.equal((await handleMcp(mcp('tools/call',{name:'trix_task_submit',arguments:{...args,apply:true}}),service)).error.code,-32602);assert.equal((await handleMcp(mcp('tools/call',{name:'execute_shell',arguments:{}}),service)).error.code,-32602);assert.equal((await handleMcp(mcp('unknown'),service)).error.code,-32601);
});
test('MCP service errors do not fabricate successful tasks',async()=>{
 const r=await handleMcp(mcp('tools/call',{name:'trix_task_status',arguments:{id:'other'}}),{taskGet(){throw Object.assign(new Error('Denied.'),{code:'PERMISSION_DENIED'});}});assert.equal(r.result.isError,true);assert.equal(JSON.parse(r.result.content[0].text).code,'PERMISSION_DENIED');
});
test('MCP stdio handles chunks with protocol-only stdout and duplicate-key rejection',async()=>{
 let output='';const sink=new Writable({write(c,_e,done){output+=c;done();}}),line=JSON.stringify(mcp('tools/list'))+'\n';await runStdio({},{input:Readable.from([line.slice(0,9),line.slice(9),'{bad}\n','{"jsonrpc":"2.0","id":3,"id":4,"method":"ping"}\n']),output:sink});const messages=output.trim().split('\n').map(JSON.parse);assert.equal(messages.length,3);assert.equal(messages.filter(v=>v.error?.code===-32700).length,2);assert.ok(messages.every(v=>v.jsonrpc==='2.0'));
});
test('ACP requires an initialized existing binding and rejects supplied MCP commands',async()=>{
 const c=createAcpContext(),s={projectList:()=>[{id:'fixture',root:'/bound/project'}]};assert.equal((await handleAcp(rpc('session/new',{cwd:'/bound/project'}),s,c)).error.code,-32000);assert.equal((await handleAcp(rpc('initialize',{protocolVersion:1}),s,c)).result.agentCapabilities.loadSession,false);assert.equal((await handleAcp(rpc('session/new',{cwd:'/bound/project',mcpServers:[{command:'/bin/sh'}]}),s,c)).error.code,-32602);assert.equal((await handleAcp(rpc('session/new',{cwd:'/other'}),s,c)).error.code,-32602);assert.match((await handleAcp(rpc('session/new',{cwd:'/bound/project',mcpServers:[]}),s,c)).result.sessionId,/^trix-acp-/);
});
test('ACP returns the staged plan without executing or applying it',async()=>{
 const c=createAcpContext(),updates=[],plans=[],s={projectList:()=>[{id:'fixture',root:'/bound/project'}],planFromPrompt:async v=>{plans.push(v);return{id:'plan-1'};}};await handleAcp(rpc('initialize',{protocolVersion:1}),s,c);const sessionId=(await handleAcp(rpc('session/new',{cwd:'/bound/project'}),s,c)).result.sessionId;const r=await handleAcp(rpc('session/prompt',{sessionId,prompt:[{type:'text',text:'Normalize.'}],_meta:{'io.trix/input':'payload'}}),s,c,v=>updates.push(v));assert.equal(r.result.stopReason,'end_turn');assert.equal(plans[0].projectId,'fixture');assert.equal(plans[0].input,'payload');assert.equal(JSON.parse(updates[0].params.update.content.text).applied,false);assert.equal((await handleAcp(rpc('session/load',{sessionId}),s,c)).error.code,-32601);
});
test('ACP cancellation prevents a late model response becoming accepted',async()=>{
 const c=createAcpContext();let complete;const s={projectList:()=>[{id:'fixture',root:'/bound/project'}],planFromPrompt:()=>new Promise(r=>{complete=r;})};await handleAcp(rpc('initialize',{protocolVersion:1}),s,c);const sessionId=(await handleAcp(rpc('session/new',{cwd:'/bound/project'}),s,c)).result.sessionId;const pending=handleAcp(rpc('session/prompt',{sessionId,prompt:[{type:'text',text:'Normalize.'}]}),s,c);await handleAcp({jsonrpc:'2.0',method:'session/cancel',params:{sessionId}},s,c);complete({id:'late'});assert.equal((await pending).result.stopReason,'cancelled');assert.equal(c.sessions.get(sessionId).lastPlan,null);
});
test('ACP unsupported major is not silently accepted and stdout is protocol only',async()=>{
 const c=createAcpContext();assert.equal((await handleAcp(rpc('initialize',{protocolVersion:2}),{},c)).result.protocolVersion,1);assert.equal(c.initialized,false);let output='';await runAcp({},{input:Readable.from([JSON.stringify(rpc('initialize',{protocolVersion:1}))+'\n']),output:new Writable({write(v,_e,done){output+=v;done();}})});assert.equal(JSON.parse(output).result.protocolVersion,1);
});
test('outbound MCP sends modern headers with its separate credential and only allowed tools',async t=>{
 const requests=[],secret='synthetic-downstream-only',url=await provider(t,async(req,res)=>{const b=await body(req);requests.push({headers:req.headers,body:b});json(res,{jsonrpc:'2.0',id:b.id,result:b.method==='server/discover'?{resultType:'complete',supportedVersions:[MCP_PROTOCOL_VERSION]}:b.method==='tools/list'?{resultType:'complete',tools:[declaration]}:{resultType:'complete',content:[{type:'text',text:'Observed mock result.'}],isError:false}});});const c=connection(url,{token:secret});assert.deepEqual((await c.discover()).supportedVersions,[MCP_PROTOCOL_VERSION]);assert.equal((await c.callTool('fixture_read',{name:'data'})).isError,false);assert.equal(requests[2].headers.authorization,'Bearer '+secret);assert.equal(requests[2].headers['mcp-method'],'tools/call');assert.equal(requests[2].headers['mcp-name'],'fixture_read');assert.equal(requests[2].body.params._meta['io.modelcontextprotocol/protocolVersion'],MCP_PROTOCOL_VERSION);assert.ok(!JSON.stringify(requests[2].body).includes(secret));assert.ok(!JSON.stringify(c.describe()).includes(secret));await assert.rejects(c.callTool('execute_shell',{}),{code:'PERMISSION_DENIED'});assert.equal(requests.length,3);
});
test('outbound connection refuses unsafe destinations and configuration authority expansion',()=>{
 for(const c of [{url:'http://127.0.0.1:99/mcp',allowedTools:[]},{url:'http://169.254.169.254/metadata',allowedTools:[],allowPrivate:true},{url:'https://169.254.169.254/metadata',allowedTools:[],allowPrivate:true},{url:'https://127.0.0.1/mcp',allowedTools:[]},{url:'https://example.com/mcp',allowedTools:['a'],headers:{authorization:'inbound'}},{url:'https://example.com/mcp',allowedTools:['a','a']},{url:'https://example.com/mcp',allowedTools:[],protocolVersion:'2025-11-25'},{url:'https://user:secret@example.com/mcp',allowedTools:[]},{url:'https://example.com/mcp?token=secret',allowedTools:[]}])assert.throws(()=>createMcpConnection(c));
});
test('outbound MCP refuses redirects, mismatched IDs and oversized results',async t=>{
 let redirected=false;const target=await provider(t,(_r,res)=>{redirected=true;res.end('{}');}),url=await provider(t,(_r,res)=>{res.writeHead(302,{location:target});res.end();});await assert.rejects(connection(url).discover(),{code:'CONNECTION_UNAVAILABLE'});assert.equal(redirected,false);const bad=await provider(t,(_r,res)=>json(res,{jsonrpc:'2.0',id:'other',result:{resultType:'complete'}}));await assert.rejects(connection(bad).discover(),{code:'PROTOCOL_INVALID'});const big=await provider(t,(_r,res)=>{res.setHeader('content-type','application/json');res.end(' '.repeat(300000));});await assert.rejects(connection(big).discover(),{code:'OUTPUT_LIMIT'});
});
test('outbound SSE consumes bounded progress and UTF-8 then final result before stream closes',async t=>{
 const url=await provider(t,async(req,res)=>{const b=await body(req);res.writeHead(200,{'content-type':'text/event-stream'});res.write(': mock keepalive\r\n\r\n');res.write('data: '+JSON.stringify({jsonrpc:'2.0',method:'notifications/progress',params:{progress:1}})+'\n\n');const data=Buffer.from('data: '+JSON.stringify({jsonrpc:'2.0',id:b.id,result:{resultType:'complete',supportedVersions:[MCP_PROTOCOL_VERSION],note:'ação'}})+'\n\n'),at=data.indexOf(Buffer.from('ç'))+1;res.write(data.subarray(0,at));res.write(data.subarray(at));});assert.equal((await connection(url).discover()).note,'ação');
});
test('outbound MCP rejects non-JSON arguments and response version mismatches',async t=>{
 let requests=0;const url=await provider(t,(_r,res)=>{requests++;res.setHeader('content-type','application/json');res.setHeader('mcp-protocol-version','2025-11-25');res.end('{}');}),c=connection(url);for(const args of [null,{nan:NaN},{fn(){}},{get unsafe(){throw new Error('must not run');}},new Date()])await assert.rejects(c.callTool('fixture_read',args),{code:'INVALID_ARGUMENT'});assert.equal(requests,0);await assert.rejects(c.discover(),{code:'PROTOCOL_UNSUPPORTED'});
});
test('MCP static parameter headers are encoded safely; unreachable annotation blocks effects',async t=>{
 let calls=0,schema={type:'object',properties:{nested:{type:'object',properties:{label:{type:'string','x-mcp-header':'Label'}}}}};const url=await provider(t,async(req,res)=>{const b=await body(req);if(b.method==='tools/list')json(res,{jsonrpc:'2.0',id:b.id,result:{resultType:'complete',tools:[{name:'fixture_read',inputSchema:schema}]}});else{calls++;json(res,{jsonrpc:'2.0',id:b.id,result:{resultType:'complete',header:req.headers['mcp-param-label']}});}}),c=connection(url),value=' ação\n';assert.equal((await c.callTool('fixture_read',{nested:{label:value}})).header,'=?base64?'+Buffer.from(value).toString('base64')+'?=');assert.equal(calls,1);schema={type:'object',anyOf:[{properties:{label:{type:'string','x-mcp-header':'Label'}}}]};await assert.rejects(c.callTool('fixture_read',{label:value}),{code:'PROTOCOL_INVALID'});assert.equal(calls,1);
});
test('MCP authorization recheck stops a revoked connection between discovery and tool dispatch',async t=>{
 let authorized=true,effects=0;const url=await provider(t,async(req,res)=>{const b=await body(req);if(b.method==='tools/list'){authorized=false;json(res,{jsonrpc:'2.0',id:b.id,result:{resultType:'complete',tools:[declaration]}});}else{effects++;res.end('{}');}}),c=connection(url,{assertAuthorized(){if(!authorized)throw Object.assign(new Error('Revoked.'),{code:'PERMISSION_DENIED'});}});await assert.rejects(c.callTool('fixture_read',{}),{code:'PERMISSION_DENIED'});assert.equal(effects,0);assert.throws(()=>connection(url,{assertAuthorized:'user-allow'}),{code:'INVALID_ARGUMENT'});
});
test('remote MCP tool error is not success and never exposes raw error body',async t=>{
 const secret='synthetic-remote-error',url=await provider(t,async(req,res)=>{const b=await body(req);json(res,{jsonrpc:'2.0',id:b.id,result:b.method==='tools/list'?{resultType:'complete',tools:[declaration]}:{resultType:'complete',isError:true,content:[{type:'text',text:secret}]}});});await assert.rejects(connection(url).callTool('fixture_read',{}),e=>e.code==='TOOL_FAILED'&&!e.message.includes(secret));
});
