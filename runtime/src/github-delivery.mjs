import { createHash } from 'node:crypto';
import { TriXError, digest, contentDigest, parseDataJSON, canonicalize, createPlan, transformInput } from './core.mjs';
import { buildIntegrationFiles } from './executor.mjs';

const FILES=['trix.integration.json','trix.integration.mjs'];
const SHA=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const MAX_RESPONSE=2*1024*1024;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=(code,message,details={})=>{throw new TriXError(code,message,details);};
const validSha=sha=>{if(typeof sha!=='string'||!SHA.test(sha))fail('EVIDENCE_MISMATCH','GitHub returned an invalid Git object identity.');return sha;};
const gitBlob=text=>{const bytes=Buffer.from(text);return createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');};
const pathRef=branch=>branch.split('/').map(encodeURIComponent).join('/');
function baseName(value){if(typeof value!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_./-]{0,199}$/.test(value)||value.includes('..')||value.includes('//')||value.endsWith('/')||value.endsWith('.')||value.split('/').some(p=>p.startsWith('.')||p.endsWith('.lock')))fail('INVALID_ARGUMENT','A bounded explicit base branch is required.');return value;}
function branchName(value){if(typeof value!=='string'||!/^trix\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(value))fail('INVALID_ARGUMENT','Delivery branch must be trix/<stable-task-id>.');return value;}
function inspectBundle(bundle){
  if(!plain(bundle)||bundle.schema_version!=='trix.bundle/v1'||bundle.qualification!=='reviewed-template-cpu-only'||!HASH.test(bundle.plan_id)||!HASH.test(bundle.source_revision)||!plain(bundle.files)||!plain(bundle.file_hashes))fail('INVALID_ARGUMENT','A verified trusted-template bundle is required.');
  if(Object.keys(bundle.files).sort().join('|')!==FILES.join('|')||Object.keys(bundle.file_hashes).sort().join('|')!==FILES.join('|'))fail('INVALID_ARGUMENT','Only the two reviewed integration files can be delivered.');
  let bytes=0;for(const name of FILES){const content=bundle.files[name];if(typeof content!=='string'||!content.isWellFormed()||(bytes+=Buffer.byteLength(content))>4*1024*1024||contentDigest(content)!==bundle.file_hashes[name])fail('EVIDENCE_MISMATCH','Bundle bytes do not match their bounded manifest.');}
  const config=parseDataJSON(bundle.files[FILES[0]]),keys=['schema_version','plan_id','source_revision','operation','options','input','expected_output_sha256'];
  if(Object.keys(config).sort().join('|')!==keys.sort().join('|')||config.schema_version!=='trix.integration/v1'||config.plan_id!==bundle.plan_id||config.source_revision!==bundle.source_revision||!HASH.test(config.expected_output_sha256)||canonicalize(config)+'\n'!==bundle.files[FILES[0]])fail('EVIDENCE_MISMATCH','Integration identity does not match the reviewed bundle.');
  const check=createPlan({projectId:'template-verification',sourceRevision:config.source_revision,operation:config.operation,options:config.options,input:config.input});
  const output=transformInput(check.operation,check.input,check.options);
  if(contentDigest(output)!==config.expected_output_sha256)fail('EVIDENCE_MISMATCH','The registered operation does not support the expected output hash.');
  const template=buildIntegrationFiles(check,{output,evidence:{plan_digest:check.id,output_sha256:contentDigest(output)}});
  if(template[FILES[1]]!==bundle.files[FILES[1]])fail('EVIDENCE_MISMATCH','A forged label cannot authorize a modified executable template.');
  return{bundleHash:digest({schema_version:bundle.schema_version,plan_id:bundle.plan_id,source_revision:bundle.source_revision,file_hashes:bundle.file_hashes}),blobs:Object.fromEntries(FILES.map(name=>[name,gitBlob(bundle.files[name])]))};
}

/** GitHub REST contracts inspected 2026-10-22:
 * https://docs.github.com/en/rest/git/refs
 * https://docs.github.com/en/rest/git/trees
 * https://docs.github.com/en/rest/git/commits
 * https://docs.github.com/en/rest/pulls/pulls
 * Narrow draft-review delivery only. The trusted caller selects repository,
 * stores dispatch intent and enforces grants; model output cannot configure it.
 * No mutation is retried internally. Persist/reconcile EFFECT_UNKNOWN before a
 * caller attempts any further write. Live GitHub interoperability is unqualified.
 */
export class GitHubDelivery{
  #token;#fetch;#api;#authorize;
  constructor({repository,token,fetchImpl=globalThis.fetch,apiUrl='https://api.github.com',assertAuthorized=()=>{}}={}){
    if(typeof repository!=='string'||!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(repository)||repository.endsWith('.git'))fail('INVALID_ARGUMENT','An explicit owner/repository binding is required.');
    if(typeof token!=='string'||!token||/[\r\n]/.test(token)||token.length>8192)fail('AUTHENTICATION_REQUIRED','A scoped GitHub credential is required.');
    let url;try{url=new URL(apiUrl);}catch{fail('INVALID_ARGUMENT','Invalid GitHub API origin.');}
    if(url.username||url.password||url.hash||url.search||url.pathname!=='/'||!(url.origin==='https://api.github.com'||(url.protocol==='http:'&&['127.0.0.1','[::1]'].includes(url.hostname))))fail('INVALID_ARGUMENT','Only GitHub API or an explicit test-loopback origin is supported.');
    if(typeof fetchImpl!=='function')fail('INVALID_ARGUMENT','A fetch implementation is required.');
    if(typeof assertAuthorized!=='function')fail('INVALID_ARGUMENT','Authorization boundary must be a function.');this.#authorize=assertAuthorized;this.repository=repository;this.owner=repository.split('/')[0];this.#token=token;this.#fetch=fetchImpl;this.#api=url.origin;
  }
  async #request(method,suffix,body,context={},optional=false){
    const mutation=method!=='GET',effect=mutation&&context.effects?{stage:context.stage,method,request_hash:digest(body),outcome:'UNKNOWN'}:null;
    if(effect)context.effects.push(effect);
    try{
      this.#authorize();const response=await this.#fetch(`${this.#api}/repos/${this.repository}${suffix}`,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{accept:'application/vnd.github+json',authorization:`Bearer ${this.#token}`,'x-github-api-version':'2026-03-10','user-agent':'TriX/0.2.0-alpha.1',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      if(optional&&response.status===404){await response.body?.cancel();return null;}
      if(!response.ok){await response.body?.cancel();if(effect&&response.status<500)effect.outcome='NOT_APPLIED';if([401,403].includes(response.status))fail('PERMISSION_DENIED','GitHub denied the configured repository operation.',{http_status:response.status,stage:context.stage});if(mutation&&response.status>=500)fail('EFFECT_UNKNOWN','GitHub mutation outcome is uncertain.',{...context,repository:this.repository,needs_reconciliation:true});fail(response.status===404?'NOT_FOUND':[409,422].includes(response.status)?'REVISION_CONFLICT':'DEPENDENCY_UNAVAILABLE','GitHub did not accept the operation.',{http_status:response.status,stage:context.stage});}
      const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>MAX_RESPONSE)fail('EVIDENCE_MISMATCH','GitHub response exceeds the evidence size limit.');chunks.push(Buffer.from(chunk));}
      const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(effect){effect.outcome='ACKNOWLEDGED';if(SHA.test(value?.sha))effect.object_sha=value.sha;if(Number.isSafeInteger(value?.number))effect.pull_number=value.number;}
      return value;
    }catch(error){if(error instanceof TriXError)throw error;fail(mutation?'EFFECT_UNKNOWN':'DEPENDENCY_UNAVAILABLE',mutation?'Mutation acknowledgement was not confirmed. Reconcile before repeating it.':'GitHub repository evidence is unavailable.',{stage:context.stage,branch:context.branch,request_hash:context.request_hash,repository:this.repository,...(mutation?{needs_reconciliation:true}:{})});}
  }
  async #ref(branch,optional=false){const value=await this.#request('GET',`/git/ref/heads/${pathRef(branch)}`,undefined,{stage:'inspect_ref'},optional);if(!value)return null;if(value.ref!==`refs/heads/${branch}`||value.object?.type!=='commit')fail('EVIDENCE_MISMATCH','Reference readback does not match the branch.');return validSha(value.object.sha);}
  async #commit(sha){const value=await this.#request('GET',`/git/commits/${validSha(sha)}`,undefined,{stage:'inspect_commit'});if(value.sha!==sha||!Array.isArray(value.parents))fail('EVIDENCE_MISMATCH','Commit readback does not match its identity.');validSha(value.tree?.sha);return value;}
  async #tree(sha){const value=await this.#request('GET',`/git/trees/${validSha(sha)}`,undefined,{stage:'inspect_tree'});if(value.sha!==sha||value.truncated||!Array.isArray(value.tree)||value.tree.length>10000)fail('EVIDENCE_MISMATCH','Complete bounded root-tree evidence is required.');const entries=Object.create(null);for(const entry of value.tree){if(!entry||typeof entry.path!=='string'||!entry.path||entry.path.includes('/')||['.','..'].includes(entry.path)||Object.hasOwn(entries,entry.path)||!['100644','100755','040000','160000','120000'].includes(entry.mode)||!['blob','tree','commit'].includes(entry.type))fail('EVIDENCE_MISMATCH','Invalid Git root-tree entry.');entries[entry.path]={mode:entry.mode,type:entry.type,sha:validSha(entry.sha)};}return entries;}
  #expected(base,checked){return{...base,...Object.fromEntries(FILES.map(name=>[name,{mode:'100644',type:'blob',sha:checked.blobs[name]}]))};}
  async #verifyCommit(sha,baseSha,expected,requestHash){const commit=await this.#commit(sha);if(commit.parents.length!==1||commit.parents[0].sha!==baseSha||!String(commit.message).split('\n').includes(`TriX-Request-SHA256: ${requestHash}`))fail('REVISION_CONFLICT','Existing branch is not the prepared TriX change set.');if(digest(await this.#tree(commit.tree.sha))!==digest(expected))fail('EVIDENCE_MISMATCH','Delivery commit contains unexpected files/content.');return commit;}
  async #pulls(branch,baseBranch){const query=new URLSearchParams({state:'all',head:`${this.owner}:${branch}`,base:baseBranch,per_page:'100'});const values=await this.#request('GET',`/pulls?${query}`,undefined,{stage:'inspect_pull_requests'});if(!Array.isArray(values)||values.length>=100)fail('EVIDENCE_MISMATCH','Complete bounded pull-request lookup is required.');const relevant=values.filter(pr=>pr.head?.ref===branch&&pr.base?.ref===baseBranch&&pr.head?.repo?.full_name?.toLowerCase()===this.repository.toLowerCase());if(relevant.length>1)fail('REVISION_CONFLICT','Delivery branch has ambiguous review history.');return relevant[0]||null;}
  async #verifyPull(pr,branch,baseBranch,sha,requestHash){if(!Number.isSafeInteger(pr?.number)||pr.number<1)fail('EVIDENCE_MISMATCH','Invalid pull-request identity.');const observed=await this.#request('GET',`/pulls/${pr.number}`,undefined,{stage:'verify_pull_request'});if(observed.number!==pr.number||observed.state!=='open'||observed.draft!==true||observed.head?.ref!==branch||observed.head?.sha!==sha||observed.head?.repo?.full_name?.toLowerCase()!==this.repository.toLowerCase()||observed.base?.ref!==baseBranch||!String(observed.body).split('\n').includes(`TriX-Request-SHA256: ${requestHash}`))fail('REVISION_CONFLICT','Observed draft review does not match the prepared delivery.');return{number:observed.number,url:`https://github.com/${this.repository}/pull/${observed.number}`,state:'open',draft:true,head_sha:sha};}
  async preview(bundle,{branch,baseBranch='main'}={}){
    branch=branchName(branch);baseBranch=baseName(baseBranch);const checked=inspectBundle(bundle),baseSha=await this.#ref(baseBranch),baseCommit=await this.#commit(baseSha),tree=await this.#tree(baseCommit.tree.sha);
    const collisions=FILES.filter(name=>Object.hasOwn(tree,name));if(collisions.length)fail('REVISION_CONFLICT','Existing base integration files will not be overwritten.',{repository:this.repository,files:collisions,base_sha:baseSha});
    const requestHash=digest({repository:this.repository,branch,base_branch:baseBranch,base_sha:baseSha,bundle_hash:checked.bundleHash}),existingSha=await this.#ref(branch,true);
    if(existingSha)await this.#verifyCommit(existingSha,baseSha,this.#expected(tree,checked),requestHash);
    const existing=await this.#pulls(branch,baseBranch);if(existing&&!existingSha)fail('REVISION_CONFLICT','Review exists without a matching branch.');
    const pull=existing?await this.#verifyPull(existing,branch,baseBranch,existingSha,requestHash):null;
    return{schema_version:'trix.github-preview/v1',repository:this.repository,branch,base_branch:baseBranch,base_sha:baseSha,base_tree_sha:baseCommit.tree.sha,bundle_hash:checked.bundleHash,request_hash:requestHash,file_hashes:{...bundle.file_hashes},existing_branch_sha:existingSha,existing_pull_request:pull,writes:0,completion_mode:'REVIEW_REQUEST_OPEN',limitations:['Draft review delivery only; no merge, deployment or remote CI success claim','Caller persists intent and reconciles uncertain effects']};
  }
  async deliver(bundle,options={}){const effects=[];try{const receipt=await this.#deliver(bundle,options,effects);return{...receipt,effects:effects.map(e=>({...e,outcome:'APPLIED'}))};}catch(error){if(effects.some(e=>e.outcome!=='NOT_APPLIED'))fail('EFFECT_UNKNOWN','Delivery stopped after dispatched effects. Reconcile retained objects, branch and review before repeating it.',{repository:this.repository,branch:options.branch,expected_base_sha:options.expectedBaseSha,task_id:options.taskId,cause_code:error.code||'DEPENDENCY_UNAVAILABLE',effects,needs_reconciliation:true});throw error;}}
  async #deliver(bundle,{branch,baseBranch='main',expectedBaseSha,taskId}={},effects){
    branch=branchName(branch);baseBranch=baseName(baseBranch);if(typeof taskId!=='string'||branch!==`trix/${taskId}`)fail('INVALID_ARGUMENT','Delivery branch must match the stable task identity.');if(typeof expectedBaseSha!=='string'||!SHA.test(expectedBaseSha))fail('INVALID_ARGUMENT','Explicit reviewed base SHA is required.');
    const preview=await this.preview(bundle,{branch,baseBranch});if(preview.base_sha!==expectedBaseSha)fail('REVISION_CONFLICT','Remote base changed after review.',{expected_base_sha:expectedBaseSha,observed_base_sha:preview.base_sha,writes:0});
    if(preview.existing_pull_request)return{...preview,schema_version:'trix.github-delivery/v1',verified:true,reused:true,pull_request:preview.existing_pull_request};
    const context={task_id:taskId,branch,base_sha:expectedBaseSha,request_hash:preview.request_hash,effects};let commitSha=preview.existing_branch_sha;
    if(!commitSha){const checked=inspectBundle(bundle),baseTree=await this.#tree(preview.base_tree_sha);const tree=await this.#request('POST','/git/trees',{base_tree:preview.base_tree_sha,tree:FILES.map(name=>({path:name,mode:'100644',type:'blob',content:bundle.files[name]}))},{...context,stage:'create_tree'});const treeSha=validSha(tree.sha);if(digest(await this.#tree(treeSha))!==digest(this.#expected(baseTree,checked)))fail('EVIDENCE_MISMATCH','Created tree does not match the reviewed files.');const commit=await this.#request('POST','/git/commits',{message:`Add verified TriX integration\n\nTriX-Request-SHA256: ${preview.request_hash}\nTriX-Plan-SHA256: ${bundle.plan_id}`,tree:treeSha,parents:[expectedBaseSha]},{...context,stage:'create_commit',tree_sha:treeSha});commitSha=validSha(commit.sha);await this.#verifyCommit(commitSha,expectedBaseSha,this.#expected(baseTree,checked),preview.request_hash);if(await this.#ref(baseBranch)!==expectedBaseSha)fail('REVISION_CONFLICT','Base changed before branch creation.');await this.#request('POST','/git/refs',{ref:`refs/heads/${branch}`,sha:commitSha},{...context,stage:'create_branch',commit_sha:commitSha});}
    if(await this.#ref(branch)!==commitSha)fail('EVIDENCE_MISMATCH','Branch readback did not confirm the prepared commit.');if(await this.#ref(baseBranch)!==expectedBaseSha)fail('REVISION_CONFLICT','Base changed before draft review creation.');
    const pull=await this.#request('POST','/pulls',{title:'TriX verified CPU integration',head:branch,base:baseBranch,draft:true,maintainer_can_modify:false,body:`Prepared by TriX for review. Only reviewed integration files are included. Remote CI, merge and deployment have not been performed.\n\nTriX-Request-SHA256: ${preview.request_hash}\nTriX-Plan-SHA256: ${bundle.plan_id}\nTriX-Bundle-SHA256: ${preview.bundle_hash}`},{...context,stage:'create_pull_request',commit_sha:commitSha});
    const observed=await this.#verifyPull(pull,branch,baseBranch,commitSha,preview.request_hash);return{...preview,schema_version:'trix.github-delivery/v1',verified:true,reused:Boolean(preview.existing_branch_sha),commit_sha:commitSha,pull_request:observed,completion_mode:'REVIEW_REQUEST_OPEN'};
  }
}
