import {defaults,envelope,importConfig,LIMITS} from './model.mjs';
export const STORAGE_KEYS={current:'trix.environment.v2',previous:'trix.environment.previous.v2',comparisons:'trix.compare.v2',recovery:'trix.recovery.v2',legacy:'trix.environment.v1',legacyComparisons:'trix.compare.v1'};
export function loadWorkspace(storage) {
 const recovered=[],warnings=[];let state=defaults(),comparisons=[],restored=false;
 try {
  const archived=storage.getItem(STORAGE_KEYS.recovery);
  if(archived)try {const entries=JSON.parse(archived);if(!Array.isArray(entries)||entries.some(e=>typeof e.key!=='string'||typeof e.raw!=='string'||typeof e.error!=='string'))throw new Error('Invalid recovery archive.');recovered.push(...entries);}catch(e){recovered.push({key:'recovery-archive',raw:archived,error:e.message});}
  for(const key of [STORAGE_KEYS.current,STORAGE_KEYS.previous,STORAGE_KEYS.legacy]) {
   const raw=storage.getItem(key);if(!raw)continue;
   try {state=importConfig(raw);restored=true;break;} catch(e) {recovered.push({key,raw,error:e.message});warnings.push('A saved environment could not be restored. Its original data has been preserved.');}
  }
  const raw=storage.getItem(STORAGE_KEYS.comparisons)??storage.getItem(STORAGE_KEYS.legacyComparisons);
  if(raw) {
   try {const list=JSON.parse(raw);if(!Array.isArray(list))throw new Error('Comparison data must be a list.');for(const [index,item] of list.slice(0,LIMITS.snapshots).entries())try {comparisons.push(importConfig(JSON.stringify(item)));}catch(e){recovered.push({key:'comparison-'+index,raw:JSON.stringify(item),error:e.message});warnings.push('One comparison could not be restored; other comparisons were retained.');}}
   catch(e){recovered.push({key:'comparisons',raw,error:e.message});warnings.push('Comparison data could not be restored and has been preserved.');}
  }
 } catch(e) {warnings.push('Browser storage is unavailable. Export JSON to keep your work.');}
 const unique=[...new Map(recovered.map(e=>[e.key+'\u0000'+e.raw,e])).values()];
 if(unique.length&&!warnings.length)warnings.push('Previously damaged saved data is available as a recovery download.');
 return {state,comparisons,recovered:unique,warnings,restored};
}
export function saveWorkspace(storage,state,comparisons,recovered=[]) {
 try {
  const next=JSON.stringify(envelope(state));importConfig(next);
  const list=comparisons.map(s=>envelope(s));for(const item of list)importConfig(JSON.stringify(item));
  if(recovered.length)storage.setItem(STORAGE_KEYS.recovery,JSON.stringify(recovered));
  const old=storage.getItem(STORAGE_KEYS.current);
  if(old) {try{importConfig(old);storage.setItem(STORAGE_KEYS.previous,old);}catch{}}
  storage.setItem(STORAGE_KEYS.current,next);storage.setItem(STORAGE_KEYS.comparisons,JSON.stringify(list));
  return {saved:true};
 } catch(e) {return {saved:false,message:'Not saved: '+e.message+' The last saved environment is retained; export valid JSON to preserve changes.'};}
}
