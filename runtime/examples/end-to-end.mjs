import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {TriXService} from '../src/service.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'trix-demo-'));
const project=path.join(root,'consumer');fs.mkdirSync(project);fs.writeFileSync(path.join(project,'README.md'),'Disposable TriX consumer: existing files are preserved.\n');
const service=new TriXService({stateDir:path.join(root,'state'),workspaceRoot:root});
try{service.projectBind({id:'demo',root:project});const input='  Hello TriX\r\n',model=service.doctor().model_configured;const plan=model?await service.planFromPrompt({projectId:'demo',prompt:'Trim whitespace and convert the input to uppercase.',input}):service.planCreate({projectId:'demo',input,operation:'text.normalize',options:{trim:true,case:'upper'}});const accepted=service.taskSubmit({projectId:'demo',plan,apply:true,idempotencyKey:'demo-local'}),result=await service.taskWait(accepted.id);console.log(JSON.stringify({schema_version:'trix.demo/v1',planning:model?'configured-model':'explicit-typed-plan-no-model',task_id:result.id,lifecycle:result.lifecycle,completion_mode:result.completion_mode,output:result.result?.output,verification:result.verification,effects:result.effects,error:result.error,fixture_retained:process.argv.includes('--keep'),fixture:process.argv.includes('--keep')?project:undefined},null,2));if(result.lifecycle!=='SUCCEEDED')process.exitCode=1;}finally{await service.close();if(!process.argv.includes('--keep'))fs.rmSync(root,{recursive:true,force:true});}
