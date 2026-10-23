import {readFile,writeFile,mkdir,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),assets={};
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.zip':'application/zip'};
async function collect(dir){for(const e of await readdir(path.join(root,'public',dir),{withFileTypes:true})){const name=path.posix.join(dir,e.name);if(e.isDirectory())await collect(name);else{const ext=path.extname(name);if(!types[ext])throw Error('Unsupported public asset '+name);const binary=ext==='.zip';assets['/'+name]={type:types[ext],binary,content:await readFile(path.join(root,'public',name),binary?'base64':'utf8')};}}}
await collect('');
// This explicit dependency order keeps the no-dependency Worker bundle auditable.
const modules=['public/release.mjs','public/product-info.mjs','public/specialists.mjs','runtime/policy.mjs','runtime/mcp.mjs','runtime/supabase.mjs','runtime/orchestrator.mjs','worker/index.js'];
let source='const ASSETS='+JSON.stringify(assets)+';\n';
const strip=s=>s.replace(/^import .*;\n/gm,'').replace(/\bexport (?=(?:async )?function|const|class)/g,'');
source+='\nconst compatibilityDomain=(()=>{'+strip(await readFile(path.join(root,'public/compatibility.mjs'),'utf8'))+';return {architectures,operatingSystems,devices,backends,presetNames,sources,toYAML,defaults,preset,node,validate,assessGroup,buildConfig,markdown,importConfig};})();\n';
source+='\nconst environmentDomain=(()=>{const base=compatibilityDomain;'+strip(await readFile(path.join(root,'public/model.mjs'),'utf8'))+';return {envelope,importConfig,validate,buildConfig};})();\n';
source+='\nconst cpuDomain=(()=>{'+strip(await readFile(path.join(root,'public/reference-plan.mjs'),'utf8'))+';return {examplePlan,executePlan};})();\n';
modules.splice(5,0,'runtime/local-tools.mjs');
for(const file of modules){source+='\n// '+file+'\n'+strip(await readFile(path.join(root,file),'utf8'));}
await rm(path.join(root,'dist'),{recursive:true,force:true});await mkdir(path.join(root,'dist/server'),{recursive:true});await mkdir(path.join(root,'dist/.openai'),{recursive:true});await writeFile(path.join(root,'dist/server/index.js'),source);let hosting;try{hosting=await readFile(path.join(root,'.openai/hosting.json'),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;hosting=await readFile(path.join(root,'.openai/hosting.example.json'),'utf8');}await writeFile(path.join(root,'dist/.openai/hosting.json'),hosting);
console.log('Built single ESM Worker with '+Object.keys(assets).length+' embedded assets.');
