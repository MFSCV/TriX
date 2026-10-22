// Declarative adapter contract: registration never loads executable code.
export const ADAPTER_SCHEMA='trix.adapter-profile/v0.1';
export const referenceAdapter={schema:ADAPTER_SCHEMA,id:'pure-cpu-reference',version:'0.1.0',lifecycle:'experimental',operations:['number.constant','number.add','number.multiply','numbers.sum','text.constant','text.uppercase'],effects:[],platforms:['browser CPU','Node.js CPU'],version_constraints:{runtime:'Not yet qualified; record the actual runtime version in evidence.'},capabilities:{cancellation:'between bounded operations',checkpoint:'whole completed pure-plan result only',distributed:false},maintainer:'TriX project — assignment pending',evidence_status:'implemented',qualification:'not-qualified'};
export function validateAdapter(p){
 const errors=[];const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
 if(!plain(p))return ['Adapter profile must be an object.'];
 const keys=Object.keys(referenceAdapter);
 if(keys.some(k=>!Object.hasOwn(p,k))||Object.keys(p).some(k=>!keys.includes(k)))errors.push('Missing or unknown adapter fields.');
 if(p.schema!==ADAPTER_SCHEMA||typeof p.id!=='string'||!/^[-a-z0-9]{1,80}$/.test(p.id)||typeof p.version!=='string'||!/^\d+\.\d+\.\d+$/.test(p.version))errors.push('Invalid adapter identity or revision.');
 if(!['planned','experimental','deprecated','unsupported'].includes(p.lifecycle)||p.qualification!=='not-qualified')errors.push('Registration cannot promote an adapter to qualified.');
 for(const k of ['operations','effects','platforms'])if(!Array.isArray(p[k])||p[k].length>128||p[k].some(v=>typeof v!=='string'||v.length>200)||new Set(p[k]).size!==p[k].length)errors.push('Invalid '+k+' list.');
 if(!plain(p.version_constraints)||!plain(p.capabilities)||typeof p.maintainer!=='string'||!['proposed','implemented'].includes(p.evidence_status))errors.push('Invalid capability or evidence declaration.');
 return errors;
}
