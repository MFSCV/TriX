#!/usr/bin/env node
import {pathToFileURL} from 'node:url';
const MAX_BYTES=1024*1024,documents=new Map();
const range={start:{line:0,character:0},end:{line:0,character:1}};
const diagnostic=(code,message,severity=1)=>({range,severity,code,source:'TriX',message});
export async function diagnosticsFor(text){
 if(typeof text!=='string'||Buffer.byteLength(text)>MAX_BYTES)return[diagnostic('INPUT_LIMIT','Document exceeds the 1 MiB limit.')];
 let value;try{value=JSON.parse(text);}catch{return[diagnostic('INVALID_JSON','Expected valid JSON.')];}
 if(!value||typeof value!=='object'||Array.isArray(value))return[diagnostic('INVALID_DOCUMENT','Expected a JSON object.')];
 if(value.schema_version==='trix.plan/v1'){try{const{verifyPlan}=await import('../../runtime/src/core.mjs');return verifyPlan(value).diagnostics.map(item=>diagnostic(item.code||'INVALID_PLAN',item.message||'Invalid plan.',item.severity==='warning'?2:1));}catch(error){return[diagnostic(error.code||'PLAN_VERIFICATION_UNAVAILABLE',error.code?error.message:'Matching verifier unavailable.')];}}
 if(value.schema_version&&value.schema_version!=='trix.environment-planning/v1')return[diagnostic('UNSUPPORTED_LANGUAGE_PROFILE','Declared language profile is not implemented.',2)];return[];
}
export async function handleLsp(request,notify=()=>{}){
 const response=result=>({jsonrpc:'2.0',id:request.id,result});
 if(!request||request.jsonrpc!=='2.0'||typeof request.method!=='string')return{jsonrpc:'2.0',id:request?.id??null,error:{code:-32600,message:'Invalid request'}};
 const params=request.params||{};
 if(request.method==='initialize')return response({capabilities:{textDocumentSync:{openClose:true,change:1}},serverInfo:{name:'TriX config and plan language server',version:'0.1.0'}});
 if(['initialized','$/cancelRequest','$/setTrace'].includes(request.method))return null;
 if(request.method==='shutdown'){documents.clear();return response(null);}
 if(['textDocument/didOpen','textDocument/didChange'].includes(request.method)){
  const doc=params.textDocument,text=request.method==='textDocument/didOpen'?doc?.text:params.contentChanges?.at(-1)?.text;
  if(!doc||typeof doc.uri!=='string'||!Number.isSafeInteger(doc.version)||typeof text!=='string')return null;
  const existing=documents.get(doc.uri);if(!existing&&documents.size>=256){notify({jsonrpc:'2.0',method:'textDocument/publishDiagnostics',params:{uri:doc.uri,version:doc.version,diagnostics:[diagnostic('DOCUMENT_LIMIT','At most 256 open documents are supported.')]}});return null;}
  if(existing&&doc.version<=existing.version)return null;const entry={version:doc.version};documents.set(doc.uri,entry);const diagnostics=await diagnosticsFor(text);if(documents.get(doc.uri)===entry)notify({jsonrpc:'2.0',method:'textDocument/publishDiagnostics',params:{uri:doc.uri,version:doc.version,diagnostics}});return null;
 }
 if(request.method==='textDocument/didClose'){const uri=params.textDocument?.uri;documents.delete(uri);if(typeof uri==='string')notify({jsonrpc:'2.0',method:'textDocument/publishDiagnostics',params:{uri,diagnostics:[]}});return null;}
 if(request.method==='exit'||!Object.hasOwn(request,'id'))return null;return{jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'Method not implemented by this language profile'}};
}
export function startLsp({input=process.stdin,output=process.stdout,stderr=process.stderr,onExit=()=>{}}={}){
 let buffer=Buffer.alloc(0),expected=null,stopped=false,processing=Promise.resolve(),wasShutdown=false;
 const write=message=>{const body=Buffer.from(JSON.stringify(message));output.write(`Content-Length: ${body.length}\r\n\r\n`);output.write(body);};
 const fail=()=>{stopped=true;input.pause();stderr.write('TriX LSP: invalid or oversized protocol frame.\n');};
 input.on('data',chunk=>{if(stopped)return;buffer=Buffer.concat([buffer,chunk]);while(!stopped){if(expected===null){const end=buffer.indexOf('\r\n\r\n');if(end<0){if(buffer.length>8192)fail();break;}const headers=buffer.subarray(0,end).toString('ascii'),matches=[...headers.matchAll(/^Content-Length:\s*(\d+)\s*$/gim)];if(matches.length!==1||!Number.isSafeInteger(Number(matches[0][1]))||Number(matches[0][1])>MAX_BYTES){fail();break;}expected=Number(matches[0][1]);buffer=buffer.subarray(end+4);}if(buffer.length<expected)break;const frame=buffer.subarray(0,expected);buffer=buffer.subarray(expected);expected=null;processing=processing.then(async()=>{let request;try{request=JSON.parse(frame.toString('utf8'));}catch{write({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});return;}if(request.method==='exit'){stopped=true;input.pause();onExit(wasShutdown?0:1);return;}const result=await handleLsp(request,write);if(result)write(result);if(request.method==='shutdown')wasShutdown=true;}).catch(()=>write({jsonrpc:'2.0',id:null,error:{code:-32603,message:'Language service error'}}));}});
 return{finished:()=>processing};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)startLsp({onExit:code=>{process.exitCode=code;process.stdin.destroy();}});
