import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {RELEASE} from '../public/release.mjs';
const root=new URL('../',import.meta.url),files=[];
async function walk(dir){for(const entry of await readdir(new URL(dir+'/',root),{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())await walk(path);else if(!path.endsWith('.jpg'))files.push(path);}}
for(const dir of ['public','runtime','worker','scripts','tests','docs','examples','repository'])await walk(dir);files.push('package.json','README.md','CHANGELOG.md','.openai/hosting.example.json','.env.example','.gitignore');files.sort();
const sourceFiles=await Promise.all(files.map(async path=>({path,sha256:createHash('sha256').update(await readFile(new URL(path,root))).digest('hex')})));
const evidencePaths=['reports/test-results-v0.5.0.json','reports/benchmark-v0.5.0.json','reports/baseline-v0.4.json','reports/routing-baseline-v0.4.json','reports/audit-v0.5.0.json','reports/browser-v0.5.0.json'];
const evidence=await Promise.all(evidencePaths.map(async path=>({path,sha256:createHash('sha256').update(await readFile(new URL(path,root))).digest('hex')})));
const manifest={schema:'trix.release/v1',...RELEASE,status:'experimental; local planning verified; live orchestration qualification open',sourceBaseline:'1ad05932260dea02b119873ae11929f730cf9193',publicRepository:'https://github.com/MFSCV/TriX',documentation:'docs/README.md',audit:'docs/release-audit-v0.5.0.md',sourceFiles,evidence,commitIdentity:'The containing Git commit identifies this release. Deployment and GitHub tracker link that commit; no self-referential commit hash is embedded.',unqualified:['Live model and MCP calls','Target implementation, audit independence and delivery','Physical accelerator/model backends','Production load, retention and recovery SLOs']};
await writeFile(new URL('../version.json',import.meta.url),JSON.stringify(manifest,null,2)+'\n');console.log('Version '+RELEASE.version+': '+sourceFiles.length+' source hashes, '+evidence.length+' evidence hashes.');
