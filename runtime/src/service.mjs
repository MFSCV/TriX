import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {TriXError, createPlan, verifyPlan, digest} from './core.mjs';
import {executePlan, buildIntegrationFiles} from './executor.mjs';
import {createModelFromEnv, planWithModel} from './model.mjs';
import {createMcpConnection} from './mcp-client.mjs';
import {GitHubDelivery} from './github-delivery.mjs';
import {validate, buildConfig} from '../../environment-lab/dist/model.mjs';

const TERMINAL=new Set(['SUCCEEDED','FAILED','CANCELLED']);
const ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/;
const GENERATED=['trix.integration.json','trix.integration.mjs'];
const SKIP=new Set(['.git','node_modules','.trix','.venv','__pycache__']);
const parse=JSON.parse;
const now=()=>new Date().toISOString();
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const fail=(code,message,details={})=>{throw new TriXError(code,message,details);};
const within=(parent,child)=>child===parent||child.startsWith(parent+path.sep);

/** Single-user, stable-directory local profile; never an arbitrary-code sandbox. */
export class TriXService {
  constructor({stateDir=process.env.TRIX_STATE_DIR||path.join(os.homedir(),'.local','state','trix'),workspaceRoot,model,github}={}) {
    this.stateDir=path.resolve(stateDir);
    fs.mkdirSync(this.stateDir,{recursive:true,mode:0o700});
    if(fs.lstatSync(this.stateDir).isSymbolicLink())fail('PERMISSION_DENIED','State directory cannot be a symlink.');
    this.workspaceRoot=workspaceRoot?fs.realpathSync(workspaceRoot):null;
    this.db=new DatabaseSync(path.join(this.stateDir,'trix.sqlite'));
    fs.chmodSync(path.join(this.stateDir,'trix.sqlite'),0o600);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    this.db.exec(`CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,idem TEXT NOT NULL,payload TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL,UNIQUE(project_id,idem));
      CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,task_id TEXT NOT NULL,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY AUTOINCREMENT,previous_hash TEXT NOT NULL,entry_hash TEXT NOT NULL,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
    const version=this.db.prepare('SELECT value FROM meta WHERE key=?').get('schema');
    if(version&&version.value!=='1')fail('SCHEMA_UNSUPPORTED','State schema requires a compatible migration.');
    this.db.prepare('INSERT OR IGNORE INTO meta VALUES(?,?)').run('schema','1');
    this.model=this.db.prepare('SELECT value FROM meta WHERE key=?').get('model.revoked')?.value==='true'?null:(model===undefined?createModelFromEnv():model);
    this.pending=new Map();this.controllers=new Map();this.ownerId=crypto.randomUUID();this.closed=false;this.closing=false;
    this.github=github===undefined?null:github;
    if(github===undefined&&process.env.TRIX_GITHUB_REPOSITORY&&process.env.TRIX_GITHUB_TOKEN&&process.env.TRIX_GITHUB_PROJECT)this.github={projectId:process.env.TRIX_GITHUB_PROJECT,adapter:new GitHubDelivery({repository:process.env.TRIX_GITHUB_REPOSITORY,token:process.env.TRIX_GITHUB_TOKEN,assertAuthorized:()=>{if(this._project(process.env.TRIX_GITHUB_PROJECT).revoked||!this.auditVerify().valid)fail('PERMISSION_DENIED','Delivery authority was revoked before dispatch.');}})};
    this._audit('service.opened',{profile:'single-user-local',runtime_version:'0.2.0-alpha.1'});
  }
  _assertWritable(){if(this.closed||this.closing)fail('SERVICE_CLOSED','Service is closing or closed.');if(!this.auditVerify().valid)fail('AUDIT_UNAVAILABLE','Local audit integrity failed; new work is paused.');}
  _transaction(fn){if(this.closed)fail('SERVICE_CLOSED','Service is closed.');this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  _audit(action,data={}){const previous=this.db.prepare('SELECT entry_hash FROM audit ORDER BY seq DESC LIMIT 1').get()?.entry_hash||'0'.repeat(64);const raw=JSON.stringify({action,at:now(),...data});this.db.prepare('INSERT INTO audit(previous_hash,entry_hash,data) VALUES(?,?,?)').run(previous,hash(previous+raw),raw);}
  _event(id,kind,detail={}){const event={kind,task_id:id,at:now(),...detail};this.db.prepare('INSERT INTO events(task_id,data) VALUES(?,?)').run(id,JSON.stringify(event));this._audit(kind,{task_id:id,...detail});}
  _save(task,kind,detail={}){const version=task.version;task.version++;task.updated_at=now();const result=this.db.prepare('UPDATE tasks SET data=?,version=? WHERE id=? AND version=?').run(JSON.stringify(task),task.version,task.id,version);if(result.changes!==1)fail('REVISION_CONFLICT','Task changed concurrently.');this._event(task.id,kind,{lifecycle:task.lifecycle,version:task.version,...detail});}
  _project(id){
    if(this.closed)fail('SERVICE_CLOSED','Service is closed.');
    if(typeof id!=='string'||!ID.test(id))fail('INVALID_ARGUMENT','A valid project ID is required.');
    const row=this.db.prepare('SELECT data FROM projects WHERE id=?').get(id);if(!row)fail('NOT_FOUND','Project is not bound.');
    const project=parse(row.data),real=fs.realpathSync(project.root),stat=fs.statSync(real);
    if(real!==project.root||String(stat.dev)!==project.device||String(stat.ino)!==project.inode||(this.workspaceRoot&&!within(this.workspaceRoot,real)))fail('PERMISSION_DENIED','Bound project root identity changed.');
    return project;
  }
  projectBind({id,root}={}){
    this._assertWritable();if(typeof id!=='string'||!ID.test(id)||typeof root!=='string')fail('INVALID_ARGUMENT','Project ID and explicit root are required.');
    const resolved=path.resolve(root);if(fs.lstatSync(resolved).isSymbolicLink())fail('PERMISSION_DENIED','Project root cannot be a symlink.');
    const real=fs.realpathSync(resolved),stat=fs.statSync(real);if(!stat.isDirectory()||(this.workspaceRoot&&!within(this.workspaceRoot,real)))fail('PERMISSION_DENIED','Project must be within the authorized workspace root.');
    if(within(real,this.stateDir)&&!SKIP.has(path.relative(real,this.stateDir).split(path.sep)[0]))fail('INVALID_ARGUMENT','Put runtime state outside the project or inside excluded .trix.');
    const existing=this.db.prepare('SELECT data FROM projects WHERE id=?').get(id);if(existing&&parse(existing.data).root!==real)fail('REVISION_CONFLICT','Project ID is already bound to a different root.');
    const project={id,root:real,device:String(stat.dev),inode:String(stat.ino),bound_at:existing?parse(existing.data).bound_at:now(),revoked:false};
    this._transaction(()=>{this.db.prepare('INSERT INTO projects VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(id,JSON.stringify(project));this._audit('project.bound',{project_id:id});});return this.projectInspect(id);
  }
  projectList(){return this.db.prepare('SELECT data FROM projects ORDER BY id').all().map(r=>parse(r.data));}
  projectRevoke(id){const p=this._project(id);p.revoked=true;this._transaction(()=>{this.db.prepare('UPDATE projects SET data=? WHERE id=?').run(JSON.stringify(p),id);this._audit('project.revoked',{project_id:id});});return p;}
  _snapshot(project){
    const files=[];let total=0;
    const walk=(dir,prefix='')=>{
      for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
        if(SKIP.has(entry.name))continue;const relative=prefix?`${prefix}/${entry.name}`:entry.name,full=path.join(dir,entry.name),stat=fs.lstatSync(full);
        if(stat.isSymbolicLink()){files.push([relative,'symlink',hash(fs.readlinkSync(full))]);continue;}
        if(stat.isDirectory()){walk(full,relative);continue;}
        if(!stat.isFile())fail('PERMISSION_DENIED','Special project files are outside this execution profile.');
        if(stat.size>8*1024*1024||(total+=stat.size)>32*1024*1024||files.length>=5000)fail('QUOTA_EXCEEDED','Project snapshot exceeds this local profile (8 MiB/file, 32 MiB/5000 files).');
        const fd=fs.openSync(full,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
        try{const before=fs.fstatSync(fd);if(before.size>8*1024*1024)fail('QUOTA_EXCEEDED','Snapshot file grew beyond its limit.');const bytes=Buffer.alloc(Math.min(before.size+1,8*1024*1024+1));let used=0,n=0;while(used<bytes.length&&(n=fs.readSync(fd,bytes,used,bytes.length-used,null))>0)used+=n;const after=fs.fstatSync(fd);if(used!==stat.size||before.ino!==stat.ino||before.size!==stat.size||before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs)fail('REVISION_CONFLICT','Project changed during bounded snapshot.');files.push([relative,hash(bytes.subarray(0,used)),stat.mode&0o777]);}finally{fs.closeSync(fd);}
      }
    };walk(project.root);return{source_revision:digest(files),files};
  }
  projectInspect(id){const p=this._project(id);return{...p,...this._snapshot(p)};}
  configValidate(scenario){return validate(scenario);}
  configGenerate(scenario){return buildConfig(scenario);}
  planCreate({projectId,input,operation,options,goal,sourceRevision,target}={}){this._assertWritable();const p=this.projectInspect(projectId);if(p.revoked)fail('PERMISSION_DENIED','Project grant is revoked.');if(sourceRevision&&sourceRevision!==p.source_revision)fail('REVISION_CONFLICT','Source snapshot changed.');return createPlan({projectId,input,operation,options,goal,sourceRevision:p.source_revision,target});}
  async planFromPrompt({projectId,prompt,input,signal}={}){this._assertWritable();const p=this.projectInspect(projectId);if(p.revoked)fail('PERMISSION_DENIED','Project grant is revoked.');if(this.db.prepare('SELECT value FROM meta WHERE key=?').get('model.revoked')?.value==='true')this.model=null;const proposed=await planWithModel({projectId,prompt,input,sourceRevision:p.source_revision,model:this.model,signal});return this.planCreate({projectId,input,...proposed,sourceRevision:p.source_revision});}
  planValidate(plan){return verifyPlan(plan);}
  taskSubmit({projectId,plan,apply=false,idempotencyKey}={}){
    this._assertWritable();const verified=verifyPlan(plan);if(!verified.valid)fail('INVALID_PLAN','Plan failed deterministic verification.',verified.diagnostics);
    if(typeof apply!=='boolean'||projectId!==plan.project_id)fail('INVALID_ARGUMENT','Project/plan identity or apply flag is invalid.');
    idempotencyKey??=crypto.randomUUID();if(typeof idempotencyKey!=='string'||!/^[A-Za-z0-9._:-]{1,160}$/.test(idempotencyKey))fail('INVALID_ARGUMENT','Invalid idempotency key.');
    const payload=digest({projectId,plan,apply});let task,fresh=false;
    this._transaction(()=>{const old=this.db.prepare('SELECT * FROM tasks WHERE project_id=? AND idem=?').get(projectId,idempotencyKey);if(old){if(old.payload!==payload)fail('REVISION_CONFLICT','Idempotency key was reused with a different payload.');task=parse(old.data);return;}
      const p=this.projectInspect(projectId);if(p.revoked)fail('PERMISSION_DENIED','Project grant is revoked.');if(p.source_revision!==plan.source_revision)fail('REVISION_CONFLICT','Project changed after planning.');
      task={id:crypto.randomUUID(),project_id:projectId,plan_id:plan.id,plan,apply,completion_mode:apply?'LOCAL_VERIFIED':'BUNDLE_READY',lifecycle:'QUEUED',version:1,attempt:{execution:'NOT_STARTED',knowledge:'CONFIRMED'},effects:[],cancellation_requested:false,created_at:now(),updated_at:now(),grant:{project_id:projectId,plan_id:plan.id,source_revision:plan.source_revision,apply},owner_pid:null};
      this.db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?)').run(task.id,projectId,idempotencyKey,payload,JSON.stringify(task),1);this._event(task.id,'task.accepted',{lifecycle:'QUEUED',completion_mode:task.completion_mode});fresh=true;});
    if(fresh)this._schedule(task.id);return structuredClone(task);
  }
  taskGet(id){if(this.closed)fail('SERVICE_CLOSED','Service is closed.');if(typeof id!=='string'||id.length>128)fail('INVALID_ARGUMENT','Invalid task ID.');const row=this.db.prepare('SELECT data FROM tasks WHERE id=?').get(id);if(!row)fail('NOT_FOUND','Task not found.');return parse(row.data);}
  taskList(){return this.db.prepare('SELECT data FROM tasks ORDER BY rowid DESC LIMIT 1000').all().map(r=>parse(r.data));}
  taskEvents(id,{after=0}={}){this.taskGet(id);if(!Number.isSafeInteger(after)||after<0)fail('INVALID_ARGUMENT','Invalid event cursor.');return this.db.prepare('SELECT seq,data FROM events WHERE task_id=? AND seq>? ORDER BY seq LIMIT 1000').all(id,after).map(r=>({...parse(r.data),seq:r.seq}));}
  _schedule(id){if(this.pending.has(id))return;const work=Promise.resolve().then(()=>this._run(id)).catch(()=>{}).finally(()=>this.pending.delete(id));this.pending.set(id,work);}
  _authorized(task,expectedRevision){if(!this.auditVerify().valid)fail('AUDIT_UNAVAILABLE','Local audit integrity failed; protected effects are paused.');if(!verifyPlan(task.plan).valid)fail('INVALID_PLAN','Persisted plan no longer verifies.');const p=this.projectInspect(task.project_id);if(p.revoked||task.cancellation_requested||task.grant.plan_id!==task.plan.id)fail('PERMISSION_DENIED','Task authority expired, revoked or cancelled.');if(expectedRevision&&p.source_revision!==expectedRevision)fail('REVISION_CONFLICT','Project changed after planning or application.');return p;}
  async _run(id){
    let claimed=false;try{this._transaction(()=>{const t=this.taskGet(id);if(t.lifecycle!=='QUEUED')return;this._authorized(t,t.plan.source_revision);t.lifecycle='RUNNING';t.owner_pid=process.pid;t.owner_id=this.ownerId;t.attempt={execution:'ACTIVE',knowledge:'CONFIRMED',observed_at:now()};this._save(t,'task.running');claimed=true;});}catch(e){this._transaction(()=>{const t=this.taskGet(id);if(t.lifecycle!=='QUEUED')return;t.lifecycle='FAILED';t.error={code:e.code||'JOB_FAILED',message:e instanceof TriXError?e.message:'Admission failed.'};this._save(t,'task.admission_failed');});return;}
    if(!claimed)return;const controller=new AbortController();this.controllers.set(id,controller);
    try{let task=this.taskGet(id);const result=await executePlan(task.plan,{signal:controller.signal,timeoutMs:5000});task=this.taskGet(id);if(task.cancellation_requested)fail('CANCELLED','Cancellation requested.');this._authorized(task,task.plan.source_revision);const files=buildIntegrationFiles(task.plan,result);
      this._transaction(()=>{task=this.taskGet(id);task.result=result;task.bundle={schema_version:'trix.bundle/v1',plan_id:task.plan.id,source_revision:task.plan.source_revision,files,file_hashes:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,hash(v)])),qualification:'reviewed-template-cpu-only'};this._save(task,'task.bundle_ready');});
      if(task.apply)await this._apply(id);
      this._transaction(()=>{task=this.taskGet(id);if(task.cancellation_requested)fail('CANCELLED','Cancellation requested.');if(task.effects.some(e=>e.outcome==='UNKNOWN'))fail('EFFECT_UNKNOWN','An effect is unresolved.');task.lifecycle='SUCCEEDED';task.owner_pid=null;task.attempt={execution:'STOPPED',knowledge:'CONFIRMED',observed_at:now()};task.terminal_evidence={completion_mode:task.completion_mode,output_sha256:result.evidence.output_sha256,verification:task.verification||{kind:'computed-and-bundle-hashes',verified:true},at:now()};this._save(task,'task.succeeded');});
    }catch(e){this._transaction(()=>{const t=this.taskGet(id),unknown=t.effects.some(x=>x.outcome==='UNKNOWN');t.lifecycle=unknown?'RECONCILING':(e.code==='CANCELLED'||t.cancellation_requested)?'CANCELLED':'FAILED';t.error={code:e.code||'JOB_FAILED',message:e instanceof TriXError?e.message:'Controlled execution failed.'};t.owner_pid=null;t.attempt={execution:'STOPPED',knowledge:unknown?'UNKNOWN':'CONFIRMED',observed_at:now()};this._save(t,'task.stopped');});}finally{this.controllers.delete(id);}
  }
  async _apply(id){
    let t=this.taskGet(id);const p=this._authorized(t,t.plan.source_revision);if(!t.grant.apply)fail('APPROVAL_REQUIRED','A concrete local-apply grant is required.');
    if(!t.bundle||Object.keys(t.bundle.files).some(n=>!GENERATED.includes(n)))fail('INVALID_PLAN','Unsupported bundle file.');
    for(const[name,bytes]of Object.entries(t.bundle.files)){const full=path.join(p.root,name);if(fs.existsSync(full)||fs.existsSync(path.join(p.root,'.'+name+'.trix-tmp')))fail('REVISION_CONFLICT','Generated output already exists; user files are preserved.');const effect={id:`${id}:${name}`,path:name,payload_sha256:hash(bytes),outcome:'NOT_DISPATCHED'};this._transaction(()=>{t=this.taskGet(id);t.effects.push(effect);this._save(t,'effect.prepared',{effect_id:effect.id});});}
    for(const name of Object.keys(t.bundle.files)){t=this.taskGet(id);this._authorized(t);const full=path.join(p.root,name),tmp=path.join(p.root,'.'+name+'.trix-tmp');this._transaction(()=>{t=this.taskGet(id);t.effects.find(e=>e.path===name).outcome='UNKNOWN';this._save(t,'effect.dispatching',{path:name});});
      const fd=fs.openSync(tmp,fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_WRONLY,0o600);try{fs.writeFileSync(fd,t.bundle.files[name]);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}this._authorized(this.taskGet(id));fs.linkSync(tmp,full);fs.unlinkSync(tmp);if(hash(fs.readFileSync(full))!==t.bundle.file_hashes[name])fail('EFFECT_UNKNOWN','Readback did not match prepared output.');this._transaction(()=>{t=this.taskGet(id);t.effects.find(e=>e.path===name).outcome='APPLIED';this._save(t,'effect.applied',{path:name});});
    }
    const verified=await this._verifyFiles(this.taskGet(id));this._transaction(()=>{t=this.taskGet(id);t.applied_revision=this.projectInspect(t.project_id).source_revision;t.verification=verified;this._save(t,'delivery.verified');});
  }
  async _verifyFiles(task){
    const p=this._authorized(task);if(digest(p.files.filter(([name])=>!GENERATED.includes(name)))!==task.plan.source_revision)fail('REVISION_CONFLICT','Other project sources changed after planning.');
    const expected=buildIntegrationFiles(task.plan,task.result),captured={};
    for(const[name,h]of Object.entries(task.bundle.file_hashes)){const f=path.join(p.root,name);if(!GENERATED.includes(name)||hash(expected[name])!==h||!fs.existsSync(f)||fs.lstatSync(f).isSymbolicLink())fail('EVIDENCE_MISMATCH','Installed output is not a reviewed template artifact.');const fd=fs.openSync(f,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));try{const before=fs.fstatSync(fd);captured[name]=fs.readFileSync(fd);const after=fs.fstatSync(fd);if(before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs||hash(captured[name])!==h)fail('EVIDENCE_MISMATCH','Installed bytes changed during readback.');}finally{fs.closeSync(fd);}}
    if(Object.keys(captured).length!==GENERATED.length)fail('EVIDENCE_MISMATCH','Incomplete integration bundle.');
    // Never import mutable project code. A unique private root contains only
    // captured, hash-checked reviewed bytes and avoids stale ESM config caches.
    const dir=fs.mkdtempSync(path.join(this.stateDir,'verify-'));let observed;
    try{fs.chmodSync(dir,0o700);for(const[name,bytes]of Object.entries(captured))fs.writeFileSync(path.join(dir,name),bytes,{mode:0o600,flag:'wx'});const module=await import(pathToFileURL(path.join(dir,'trix.integration.mjs')).href);observed=await module.execute({input:task.plan.input});}finally{fs.rmSync(dir,{recursive:true,force:true});}
    if(observed!==task.result.output)fail('EVIDENCE_MISMATCH','Installed callable operation failed independent output readback.');const after=this._authorized(this.taskGet(task.id));if(after.source_revision!==p.source_revision)fail('REVISION_CONFLICT','Installed project changed while verification was running.');return{kind:'installed-callable-readback',verified:true,output_sha256:hash(observed),file_hashes:structuredClone(task.bundle.file_hashes),at:now()};
  }
  async taskWait(id,{timeoutMs=30000}={}){const start=Date.now();while(true){const t=this.taskGet(id);if(TERMINAL.has(t.lifecycle)||t.lifecycle==='RECONCILING')return t;if(Date.now()-start>timeoutMs)fail('WAIT_TIMEOUT','Observation timed out; task was not cancelled.',{task_id:id});await new Promise(r=>setTimeout(r,15));}}
  taskCancel(id){let result;this._transaction(()=>{const t=this.taskGet(id);if(TERMINAL.has(t.lifecycle)){result=t;return;}t.cancellation_requested=true;if(t.lifecycle==='QUEUED'){t.lifecycle='CANCELLED';t.attempt={execution:'STOPPED',knowledge:'CONFIRMED'};}else if(t.lifecycle==='RUNNING')t.lifecycle='CANCELLING';this._save(t,'task.cancel_requested');result=t;});this.controllers.get(id)?.abort();return result;}
  async taskResume(id){
    const task=this.taskGet(id);if(TERMINAL.has(task.lifecycle)||task.cancellation_requested)fail('REVISION_CONFLICT','Terminal or cancelled tasks cannot be reopened; submit linked new work.');
    if(task.owner_pid&&task.owner_pid!==process.pid){try{process.kill(task.owner_pid,0);fail('REVISION_CONFLICT','Another local controller still owns this task.');}catch(e){if(e.code!=='ESRCH')throw e;}}
    if(this.pending.has(id))return task;if(task.owner_pid===process.pid&&task.owner_id&&task.owner_id!==this.ownerId)fail('REVISION_CONFLICT','Another local service instance owns this active task.');
    this._transaction(()=>{const t=this.taskGet(id),p=this._project(t.project_id);let uncertain=false;
      for(const effect of t.effects){if(effect.outcome!=='UNKNOWN')continue;const f=path.join(p.root,effect.path);if(fs.existsSync(f)&&!fs.lstatSync(f).isSymbolicLink()&&hash(fs.readFileSync(f))===effect.payload_sha256){effect.outcome='APPLIED';const tmp=path.join(p.root,'.'+effect.path+'.trix-tmp');if(fs.existsSync(tmp)&&!fs.lstatSync(tmp).isSymbolicLink()&&hash(fs.readFileSync(tmp))===effect.payload_sha256){this._authorized(t);fs.unlinkSync(tmp);}}else uncertain=true;}
      if(uncertain||t.effects.some(e=>e.outcome==='APPLIED')){t.lifecycle='RECONCILING';t.owner_pid=null;this._save(t,'task.reconciled');return;}this._authorized(t,t.plan.source_revision);t.lifecycle='QUEUED';t.owner_pid=null;this._save(t,'task.resumed');});
    let resumed=this.taskGet(id);
    if(resumed.lifecycle==='RECONCILING'&&resumed.bundle&&resumed.effects.length===Object.keys(resumed.bundle.files).length&&resumed.effects.every(e=>e.outcome==='APPLIED')){const verification=await this._verifyFiles(resumed);this._transaction(()=>{const t=this.taskGet(id);t.verification=verification;t.applied_revision=this.projectInspect(t.project_id).source_revision;t.lifecycle='SUCCEEDED';t.attempt={execution:'STOPPED',knowledge:'CONFIRMED',observed_at:now()};t.terminal_evidence={completion_mode:t.completion_mode,verification,at:now(),reconciled:true};this._save(t,'task.reconciled_verified');});resumed=this.taskGet(id);}
    if(resumed.lifecycle==='QUEUED')this._schedule(id);return resumed;
  }
  async changeApply(id){const t=this.taskGet(id);if(t.lifecycle!=='SUCCEEDED'||t.completion_mode!=='BUNDLE_READY')fail('REVISION_CONFLICT','Apply requires a successful staged bundle.');return this.taskSubmit({projectId:t.project_id,plan:t.plan,apply:true,idempotencyKey:'apply:'+t.id});}
  async changeVerify(id){const t=this.taskGet(id);if(!t.bundle||!t.effects.some(e=>e.outcome==='APPLIED'))fail('CAPABILITY_UNAVAILABLE','No installed result is available to verify.');return this._verifyFiles(t);}
  changeRecover(id){
    this._assertWritable();let t=this.taskGet(id);const p=this._project(t.project_id);if(p.revoked)fail('PERMISSION_DENIED','Project grant is revoked.');if(this.pending.has(id)||['RUNNING','CANCELLING','QUEUED'].includes(t.lifecycle))fail('REVISION_CONFLICT','Stop and reconcile active work before recovery.');if(!t.bundle)fail('CAPABILITY_UNAVAILABLE','No local delivery bundle exists.');
    for(const e of t.effects){const f=path.join(p.root,e.path);if(fs.existsSync(f)&&(fs.lstatSync(f).isSymbolicLink()||hash(fs.readFileSync(f))!==e.payload_sha256))fail('REVISION_CONFLICT','Recovery preserves changed user files.');}
    const recoveryId=crypto.randomUUID();this._transaction(()=>{t=this.taskGet(id);t.recovery={id:recoveryId,status:'RUNNING',effects:[],at:now()};this._save(t,'recovery.started');});
    for(const e of t.effects){const f=path.join(p.root,e.path);if(fs.existsSync(f))fs.unlinkSync(f);const tmp=path.join(p.root,'.'+e.path+'.trix-tmp');if(fs.existsSync(tmp)&&!fs.lstatSync(tmp).isSymbolicLink()&&hash(fs.readFileSync(tmp))===e.payload_sha256)fs.unlinkSync(tmp);}
    this._transaction(()=>{t=this.taskGet(id);t.recovery.status='RECOVERED';t.recovery.verified=t.effects.every(e=>!fs.existsSync(path.join(p.root,e.path)));t.reliance_blocked=true;if(t.verification)t.verification={...t.verification,verified:false,disposition:'OUTPUTS_REMOVED_BY_RECOVERY'};this._save(t,'recovery.verified');});return this.taskGet(id).recovery;
  }
  artifactGet(id){const t=this.taskGet(id);if(!t.bundle)fail('CAPABILITY_UNAVAILABLE','Bundle not yet available.');return structuredClone(t.bundle);}
  evidenceGet(id){const t=this.taskGet(id);return{task_id:t.id,plan_id:t.plan_id,completion_mode:t.completion_mode,lifecycle:t.lifecycle,execution:t.result?.evidence||null,verification:t.verification||null,effects:t.effects,recovery:t.recovery||null,delivery:t.delivery||null,events:this.taskEvents(id)};}
  doctor(){return{schema_version:'trix.doctor/v1',runtime_version:'0.2.0-alpha.1',node:process.versions.node,platform:process.platform,arch:process.arch,profile:'single-user-local',model_configured:this.connectionGet('model').configured,state:'sqlite-wal',operations:['text.normalize','json.transform'],project_delivery:'new trusted-template files only',arbitrary_code_execution:false,os_sandbox_qualified:false,independent_audit_qualified:false,mcp:'experimental 2026-07-28 subset',acp:'experimental v1 planning subset',hardware_qualified:[],tested_operations:['text.normalize','json.transform'],limitations:['No arbitrary shell or project build scripts','No GPU/cluster qualification','No remote deployment; Git draft delivery requires explicit project credentials and live qualification','Local audit is not independent of host administrator']};}
  skillList(){return[{id:'environment-planner',status:'active',kind:'reviewed deterministic operation',permissions:['config:read']},{id:'cpu-transform',status:'active',kind:'reviewed built-in data operation',permissions:['cpu:execute']},{id:'consolidate-preproduction',status:'not-installed',kind:'external instruction skill'},{id:'security-audit',status:'not-installed',kind:'external instruction skill'}];}
  skillGet(id){const s=this.skillList().find(s=>s.id===id);if(!s)fail('NOT_FOUND','Skill is not registered.');return s;}
  connectionList(){return[{id:'model',configured:!!this.model&&this.db.prepare('SELECT value FROM meta WHERE key=?').get('model.revoked')?.value!=='true',capability:'typed-plan-proposal',secret_values_exposed:false},...this.db.prepare("SELECT value FROM meta WHERE key LIKE 'mcp.connection.%'").all().map(r=>{const c=parse(r.value);return{id:c.id,kind:'mcp-http',configured:!c.revoked,url:c.url,allowedTools:c.allowedTools,protocolVersion:'2026-07-28',secret_values_exposed:false};})];}
  connectionGet(id){const c=this.connectionList().find(c=>c.id===id);if(!c)fail('NOT_FOUND','Connection is not registered.');return c;}
  async connectionTest(id){const c=this.connectionGet(id);if(c.kind==='mcp-http'){const discovery=await this._mcp(id).discover();return{...c,status:'discovery-observed',live_request_performed:true,discovery};}return{...c,status:c.configured?'configured-not-live-tested':'not-configured',live_request_performed:false};}
  connectionConfigure(value={}){
    this._assertWritable();if(value.id==='model'){if(value.enabled!==true||Object.keys(value).some(k=>!['id','enabled'].includes(k)))fail('INVALID_ARGUMENT','Model configuration accepts only explicit enabled:true.');const adapter=createModelFromEnv();if(!adapter)fail('MODEL_NOT_CONFIGURED','Configure an approved model endpoint and identity first.');this._transaction(()=>{this.db.prepare('DELETE FROM meta WHERE key=?').run('model.revoked');this._audit('connection.enabled',{connection_id:'model'});});this.model=adapter;return this.connectionGet('model');}
    if(typeof value.id!=='string'||!ID.test(value.id)||Object.keys(value).some(k=>!['id','url','allowedTools','allowPrivate','tokenEnv'].includes(k)))fail('INVALID_ARGUMENT','Invalid explicit MCP connection configuration.');
    if(value.tokenEnv!==undefined&&(typeof value.tokenEnv!=='string'||!/^TRIX_[A-Z0-9_]{1,64}$/.test(value.tokenEnv)))fail('INVALID_ARGUMENT','Credential reference must be a named TRIX_ environment variable.');
    const c={...value,allowPrivate:value.allowPrivate===true,revoked:false};createMcpConnection({url:c.url,allowedTools:c.allowedTools,allowPrivate:c.allowPrivate,token:c.tokenEnv?process.env[c.tokenEnv]:undefined});this._transaction(()=>{this.db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('mcp.connection.'+c.id,JSON.stringify(c));this._audit('connection.configured',{connection_id:c.id,kind:'mcp-http'});});return this.connectionGet(c.id);
  }
  _mcp(id){const row=this.db.prepare('SELECT value FROM meta WHERE key=?').get('mcp.connection.'+id);if(!row)fail('NOT_FOUND','MCP connection not found.');const c=parse(row.value);if(c.revoked)fail('PERMISSION_DENIED','MCP connection revoked.');return createMcpConnection({url:c.url,allowedTools:c.allowedTools,allowPrivate:c.allowPrivate,token:c.tokenEnv?process.env[c.tokenEnv]:undefined,assertAuthorized:()=>{if(parse(this.db.prepare('SELECT value FROM meta WHERE key=?').get('mcp.connection.'+id).value).revoked)fail('PERMISSION_DENIED','MCP connection was revoked before dispatch.');}});}
  async connectionCall(id,value={}){
    this._assertWritable();if(typeof value.tool!=='string'||Object.keys(value).some(k=>!['tool','arguments'].includes(k)))fail('INVALID_ARGUMENT','Use a named allowlisted tool and structured arguments.');const client=this._mcp(id);if(!client.describe().allowed_tools.includes(value.tool))fail('PERMISSION_DENIED','Tool is not allowlisted for this connection.');const invocationId=crypto.randomUUID(),intent={id:invocationId,connection_id:id,tool:value.tool,input_digest:digest(value.arguments||{}),outcome:'UNKNOWN'};
    this._transaction(()=>{this.db.prepare('INSERT INTO meta(key,value) VALUES(?,?)').run('external.effect.'+invocationId,JSON.stringify(intent));this._audit('mcp.call.intent',{invocation_id:invocationId,connection_id:id,tool:value.tool});});
    try{const result=await client.callTool(value.tool,value.arguments||{});this._transaction(()=>{this.db.prepare('UPDATE meta SET value=? WHERE key=?').run(JSON.stringify({...intent,outcome:'UNKNOWN',response_received:true,result_digest:digest(result)}),'external.effect.'+invocationId);this._audit('mcp.call.observed',{invocation_id:invocationId});});return{invocation_id:invocationId,outcome:'UNKNOWN',response_received:true,verification_required:true,tool_error:result?.isError===true,result};}catch(e){fail('EFFECT_UNKNOWN','MCP invocation did not yield a confirmed result; it was not automatically retried.',{invocation_id:invocationId,cause_code:e.code||'CONNECTION_FAILED'});}
  }
  connectionRevoke(id){this._assertWritable();this.connectionGet(id);this._transaction(()=>{if(id==='model'){this.db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('model.revoked','true');this.model=null;}else{const c=parse(this.db.prepare('SELECT value FROM meta WHERE key=?').get('mcp.connection.'+id).value);c.revoked=true;this.db.prepare('UPDATE meta SET value=? WHERE key=?').run(JSON.stringify(c),'mcp.connection.'+id);}this._audit('connection.revoked',{connection_id:id});});return this.connectionGet(id);}
  auditVerify(){let previous='0'.repeat(64);for(const r of this.db.prepare('SELECT * FROM audit ORDER BY seq').all()){if(r.previous_hash!==previous||r.entry_hash!==hash(previous+r.data))return{valid:false,seq:r.seq};previous=r.entry_hash;}return{valid:true,head:previous};}
  auditGet(){return{external_effects:this.db.prepare("SELECT value FROM meta WHERE key LIKE 'external.effect.%'").all().map(r=>parse(r.value)),profile:'local-hash-chain-not-independent-audit',verification:this.auditVerify(),records:this.db.prepare('SELECT seq,entry_hash,data FROM audit ORDER BY seq DESC LIMIT 1000').all().map(r=>({seq:r.seq,entry_hash:r.entry_hash,...parse(r.data)}))};}
  _deliveryTask(id){this._assertWritable();const task=this.taskGet(id);if(!this.github||this.github.projectId!==task.project_id)fail('CAPABILITY_UNAVAILABLE','Configure an explicit GitHub repository, credential and matching project binding.');if(task.lifecycle!=='SUCCEEDED'||!task.bundle||task.reliance_blocked)fail('REVISION_CONFLICT','Delivery requires a current verified bundle.');this._authorized(task,task.applied_revision||task.plan.source_revision);return task;}
  async deliveryPreview(id,{baseBranch='main'}={}){const task=this._deliveryTask(id);const preview=await this.github.adapter.preview(task.bundle,{branch:'trix/'+task.id,baseBranch});this._authorized(this.taskGet(id),task.applied_revision||task.plan.source_revision);this._transaction(()=>{const t=this.taskGet(id);t.delivery_preview=preview;this._save(t,'delivery.remote_previewed',{request_hash:preview.request_hash});});return preview;}
  async deliverySubmit(id,{baseBranch='main',expectedBaseSha}={}){
    const task=this._deliveryTask(id);
    if(task.delivery?.outcome==='UNKNOWN')fail('EFFECT_UNKNOWN','Prior delivery is unresolved; reconcile it before any further write.',{delivery_id:task.delivery.id});
    if(task.delivery?.outcome==='APPLIED')return task.delivery.receipt;
    if(!task.delivery_preview||task.delivery_preview.base_sha!==expectedBaseSha||task.delivery_preview.base_branch!==baseBranch)fail('APPROVAL_REQUIRED','Inspect the exact destination/base revision with delivery preview first.');
    const intent={id:'delivery:'+task.id,request_hash:task.delivery_preview.request_hash,repository:task.delivery_preview.repository,base_sha:expectedBaseSha,base_branch:baseBranch,outcome:'UNKNOWN',stage:'DISPATCHING',at:now()};
    this._transaction(()=>{const t=this.taskGet(id);t.delivery=intent;this._save(t,'delivery.remote_dispatching');});
    try{const receipt=await this.github.adapter.deliver(task.bundle,{branch:'trix/'+task.id,baseBranch,expectedBaseSha,taskId:task.id});if(receipt.verified!==true||receipt.request_hash!==intent.request_hash)fail('EFFECT_UNKNOWN','Remote delivery evidence does not match the approved request.');this._transaction(()=>{const t=this.taskGet(id);t.delivery={...intent,outcome:'APPLIED',stage:'VERIFIED',receipt};this._save(t,'delivery.remote_verified');});return receipt;}catch(e){this._transaction(()=>{const t=this.taskGet(id);t.delivery={...intent,outcome:e.code==='EFFECT_UNKNOWN'?'UNKNOWN':'NOT_APPLIED',stage:'STOPPED',error:{code:e.code||'DEPENDENCY_UNAVAILABLE'},evidence:e.details||{}};this._save(t,'delivery.remote_stopped');});throw e;}
  }
  async deliveryReconcile(id,{baseBranch='main'}={}){const task=this._deliveryTask(id);if(!task.delivery)fail('NOT_FOUND','No remote delivery intent exists.');const observed=await this.github.adapter.preview(task.bundle,{branch:'trix/'+task.id,baseBranch});if(!observed.existing_pull_request||observed.request_hash!==task.delivery.request_hash)return{delivery_id:task.delivery.id,outcome:'UNKNOWN',observed,manual_reconciliation_required:true};const receipt={...observed,verified:true,pull_request:observed.existing_pull_request,completion_mode:'REVIEW_REQUEST_OPEN',reconciled:true};this._transaction(()=>{const t=this.taskGet(id);t.delivery={...t.delivery,outcome:'APPLIED',stage:'VERIFIED',receipt};this._save(t,'delivery.remote_reconciled');});return receipt;}
  async close(){if(this.closed)return;if(this.closePromise)return this.closePromise;this.closing=true;this.closePromise=(async()=>{while(this.pending.size)await Promise.allSettled([...this.pending.values()]);this.db.close();this.closed=true;})();return this.closePromise;}
}
