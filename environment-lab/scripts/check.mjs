import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readdir,readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {RELEASE} from '../public/release.mjs';
const root=new URL('../',import.meta.url),stages=[];
function command(name,args){const start=performance.now(),r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:10_000_000});if(r.status!==0){process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');throw new Error(name+' failed');}stages.push({name,status:'passed',duration_ms:Number((performance.now()-start).toFixed(3))});return r.stdout;}
for(const file of ['public/chat.mjs','public/app.js','public/workspace-ui.mjs','public/task-store.mjs','public/conversation-store.mjs','public/local-intent.mjs','public/product-info.mjs','worker/index.js'])command('syntax: '+file,['--check',file]);
const files=(await readdir(new URL('../tests/',import.meta.url))).filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'tests/'+f);
const tap=command('regression',['--test','--test-reporter=tap',...files]);
const count=name=>Number(tap.match(new RegExp('^# '+name+' (\\d+)$','m'))?.[1]??NaN);
const tests={tests:count('tests'),passed:count('pass'),failed:count('fail'),cancelled:count('cancelled'),skipped:count('skipped'),todo:count('todo')};assert.ok(tests.tests>0);assert.equal(tests.tests,tests.passed);assert.equal(tests.failed,0);
command('build',['scripts/build.mjs']);command('worker artifact',['scripts/validate-artifact.mjs']);
const docs=['README.md','CHANGELOG.md','docs/README.md','docs/product-guide.md','docs/implementation-baseline.md','docs/orchestrator-runtime.md','docs/agent-integration.md','docs/release-audit-v0.5.0.md','docs/activation-status.md'];
let links=0;for(const file of docs){const body=await readFile(new URL(file,root),'utf8');for(const match of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){const target=match[1].split('#')[0];if(!target||/^[a-z]+:/i.test(target))continue;const resolved=new URL(target,new URL(file,root));if(resolved.href!==new URL('reports/test-results-v0.5.0.json',root).href)await stat(resolved);links++;}}stages.push({name:'current documentation relative links',status:'passed',links});
const report={schema:'trix.check-results/v1',version:RELEASE.version,created_at:new Date().toISOString(),environment:{node:process.version,platform:process.platform},scope:'Source regression and build checks in the development container. Provider calls are simulated; no live service qualification is inferred.',tests,stages,testFiles:await Promise.all(files.map(async path=>({path,sha256:createHash('sha256').update(await readFile(new URL(path,root))).digest('hex')})))};
await mkdir(new URL('../reports/',import.meta.url),{recursive:true});await writeFile(new URL('../reports/test-results-v0.5.0.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({tests,stages},null,2));
