import {cp,mkdir,readdir,readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
const root=resolve(new URL('../',import.meta.url).pathname),target=process.argv[2];if(!target)throw new Error('Usage: npm run export:public -- /absolute/new-directory');
const out=resolve(target);if(out===root||relative(root,out).startsWith('..')===false)throw new Error('Choose a new directory outside the working tree.');
try{await stat(out);throw new Error('Export directory already exists; choose a new directory.');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(out,{recursive:true});const app=resolve(out,'environment-lab');await mkdir(app);
const copied=[];
async function copy(path){const src=resolve(root,path),dest=resolve(app,path),s=await stat(src);if(s.isDirectory()){for(const entry of await readdir(src))await copy(path+'/'+entry);return;}if(path.endsWith('.jpg'))return;await mkdir(resolve(dest,'..'),{recursive:true});await cp(src,dest);copied.push('environment-lab/'+path);}
for(const path of ['public','runtime','worker','supabase','scripts','tests','examples','docs','reports','repository','README.md','CHANGELOG.md','package.json','version.json','.gitignore','.env.example','.openai/hosting.example.json'])await copy(path);
await cp(resolve(root,'repository/README.md'),resolve(out,'README.md'));await mkdir(resolve(out,'docs'));await cp(resolve(root,'repository/CURRENT_STATUS.md'),resolve(out,'docs/CURRENT_STATUS.md'));
for(const path of copied){const body=await readFile(resolve(out,path));if(/appgprj_[a-z0-9]{20,}|appgdep_[a-z0-9]{20,}|libfile_[a-z0-9]{20,}|https?:\/\/git\.chatgpt-team\.site/.test(body.toString('utf8')))throw new Error('Private identifier in '+path);if(/\.env(\.|$)/.test(path)&&!path.endsWith('.env.example'))throw new Error('Unexpected environment file');}
console.log(JSON.stringify({directory:out,files:copied.length+2,excluded:['owner hosting identity','credentials','user records','generated dist','screenshots'],preserveExistingOutside:['environment-lab/','README.md','docs/CURRENT_STATUS.md']}));
