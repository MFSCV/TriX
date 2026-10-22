import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
import {defaults,validate,buildConfig,importConfig,presetNames,preset} from '../public/model.mjs';
import {examplePlan,executePlan} from '../public/reference-plan.mjs';
import {localIntent} from '../public/local-intent.mjs';
import {RELEASE} from '../public/release.mjs';
const state=defaults(),plan=examplePlan(),samples=300;
function measure(name,fn){for(let i=0;i<30;i++)fn();const values=[];for(let i=0;i<samples;i++){const began=performance.now();fn();values.push(performance.now()-began);}values.sort((a,b)=>a-b);return {name,samples,p50_ms:values[Math.floor(samples*.5)],p95_ms:values[Math.floor(samples*.95)],max_ms:values.at(-1)};}
const cases=JSON.parse(await readFile(new URL('../tests/fixtures/local-requests.json',import.meta.url))),routing=cases.map(c=>({...c,actual:localIntent(c.prompt)}));
const config=buildConfig(state),encoded=JSON.stringify(config),restored=importConfig(encoded),cpu=executePlan(plan);
assert.equal(cpu.status,'SUCCEEDED');assert.equal(cpu.outputs['task-result'],50);assert.equal(restored.name,state.name);assert.equal(restored.groups.length,state.groups.length);
const profiles=Object.keys(presetNames).map(name=>({name,errors:validate(preset(name)).errors,artifact:buildConfig(preset(name)).schema}));assert.ok(profiles.every(p=>p.errors===0));
const report={schema:'trix.benchmark/v1',version:RELEASE.version,created_at:new Date().toISOString(),environment:{node:process.version,platform:process.platform,arch:process.arch,cpu:cpus()[0]?.model||'unknown'},method:{warmup:30,samples,clock:'performance.now',scope:'Warm deterministic tools in this container; excludes browser rendering, network, live AI, MCP, R2 and external deployment. No production SLO is inferred.'},results:[measure('environment.validate',()=>validate(state)),measure('environment.generate',()=>buildConfig(state)),measure('reference.execute',()=>executePlan(plan)),measure('configuration.roundtrip',()=>importConfig(JSON.stringify(buildConfig(state)))),measure('configuration.sha256',()=>createHash('sha256').update(encoded).digest('hex'))],outputs:{cpu:{status:cpu.status,value:cpu.outputs['task-result'],operations:cpu.trace.length},configuration:{schema:config.schema,bytes:Buffer.byteLength(encoded),sha256:createHash('sha256').update(encoded).digest('hex'),roundtrip:true},profiles},routing:{scope:'Fixed synthetic local-command regression set; not a model quality evaluation',samples:routing.length,passed:routing.filter(r=>r.intent===r.actual).length,results:routing},unmeasured:['Live model latency and TTFT','Live MCP/target output quality','Hosted R2 and deployment latency','Load, concurrency and recovery SLOs']};
assert.equal(report.routing.passed,report.routing.samples);
await mkdir(new URL('../reports/',import.meta.url),{recursive:true});await writeFile(new URL('../reports/benchmark-v0.5.0.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({version:report.version,results:report.results,cpu:report.outputs.cpu,routing:{passed:report.routing.passed,samples:report.routing.samples}},null,2));
