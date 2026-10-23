import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const strip=s=>s.replace(/^import .*;\n/gm,'').replace(/\bexport (?=(?:async )?function|const|class)/g,'');
let source='';
for(const [variable,path,returns] of [
 ['compatibilityDomain','public/compatibility.mjs','architectures,operatingSystems,devices,backends,presetNames,sources,toYAML,defaults,preset,node,validate,assessGroup,buildConfig,markdown,importConfig'],
 ['environmentDomain','public/model.mjs','envelope,importConfig,validate,buildConfig'],
 ['cpuDomain','public/reference-plan.mjs','examplePlan,executePlan']])source+='\nconst '+variable+'=(()=>{'+(variable==='environmentDomain'?'const base=compatibilityDomain;':'')+strip(await readFile(new URL(path,root),'utf8'))+';return {'+returns+'};})();\n';
const files=['public/release.mjs','public/product-info.mjs','public/specialists.mjs','runtime/policy.mjs','runtime/mcp.mjs','runtime/supabase.mjs','runtime/local-tools.mjs','runtime/orchestrator.mjs','runtime/backend.mjs','worker/index.js','runtime/jobs.mjs'];
for(const path of files){let text=await readFile(new URL(path,root),'utf8');if(path==='worker/index.js')text=text.slice(0,text.indexOf('export default'));source+='\n// '+path+'\n'+strip(text);}
source+='\nexport {createBackendHandler,createRpcClient,processQueue};\n';
await mkdir(new URL('dist/edge/',root),{recursive:true});await writeFile(new URL('dist/edge/runtime.mjs',root),source);await writeFile(new URL('dist/edge/index.ts',root),await readFile(new URL('supabase/functions/trix-backend/index.ts',root)));
console.log('Built bounded Edge backend from '+files.length+' source modules.');
