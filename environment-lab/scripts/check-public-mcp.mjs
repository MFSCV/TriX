// Explicit opt-in live, read-only check. It sends only the fixed public query below.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {serverConfig} from '../runtime/policy.mjs';
import {mcpDiscover,mcpCall} from '../runtime/mcp.mjs';
import {RELEASE} from '../public/release.mjs';
if(!process.argv.includes('--live'))throw Error('This check contacts the public OpenAI documentation server. Run node scripts/check-public-mcp.mjs --live; add --record to update release evidence.');
const text=await readFile(new URL('../examples/mcp-openai-docs.json',import.meta.url),'utf8'),[server]=serverConfig({TRIX_MCP_SERVERS:text}),checks=[];
async function observe(name,fn,verify){const start=performance.now(),value=await fn();verify(value);checks.push({name,status:'passed',duration_ms:Number((performance.now()-start).toFixed(3)),serialized_sha256:createHash('sha256').update(JSON.stringify(value)).digest('hex')});return value;}
await observe('tools/list',()=>mcpDiscover(server,{}),tools=>assert.ok(server.tools.every(t=>tools.some(l=>l.name===t.name))));
await observe('search_openai_docs',()=>mcpCall(server,server.tools[0],{query:'Responses API function calling',limit:1},{}),r=>{const s=r.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');assert.match(s,/https:\/\/(developers|platform)\.openai\.com\//);});
await observe('fetch_openai_doc',()=>mcpCall(server,server.tools[1],{url:'https://developers.openai.com/api/docs/guides/function-calling',anchor:'#the-tool-calling-flow'},{}),r=>{const s=r.content.filter(c=>c.type==='text').map(c=>c.text).join('\n');assert.match(s,/tool.call/i);assert.match(s,/model/i);});
const report={schema:'trix.live-public-mcp-check/v1',version:RELEASE.version,created_at:new Date().toISOString(),node:process.version,server:server.url,grantedTools:server.tools.map(t=>t.name),samples:1,scope:'Live public read-only documentation server through the production MCP adapter, from this container. No model, private data, target implementation or independent audit is tested. Timings include session initialization/discovery/call/cleanup as applicable; no production SLO is inferred.',checks};
if(process.argv.includes('--record'))await writeFile(new URL('../reports/live-public-mcp-v0.5.0.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
