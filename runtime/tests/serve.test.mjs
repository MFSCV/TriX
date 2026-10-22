import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
test('CLI server stores usable owner token privately and never prints credential bytes',async()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'trix-serve-'));const cli=fileURLToPath(new URL('../bin/trix.mjs',import.meta.url));
 const child=spawn(process.execPath,[cli,'serve','--state-dir',base,'--port','0','--output','json'],{env:{PATH:process.env.PATH},stdio:['ignore','pipe','pipe']});let output='',errors='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>errors+=b);
 try{const deadline=Date.now()+10000;while(!output.includes('\n')){if(Date.now()>deadline)throw Error('Startup failed: '+errors);await new Promise(r=>setTimeout(r,10));}const data=JSON.parse(output.trim()).result;const token=fs.readFileSync(data.token_file,'utf8').trim();assert.ok(token.length>=24);assert.ok(!output.includes(token));if(process.platform!=='win32')assert.equal(fs.statSync(data.token_file).mode&0o077,0);assert.equal((await fetch(data.url+'/api/v1/doctor')).status,401);const response=await fetch(data.url+'/api/v1/doctor',{headers:{authorization:'Bearer '+token}});assert.equal(response.status,200);assert.equal((await response.json()).data.profile,'single-user-local');}
 finally{child.kill('SIGTERM');await once(child,'exit');fs.rmSync(base,{recursive:true,force:true});}
});
