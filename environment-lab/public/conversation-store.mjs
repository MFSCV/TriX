import {SURFACES} from './specialists.mjs';
const text=(v,max)=>typeof v==='string'&&v.length<=max;
export function parseConversationStore(raw){
 if(new TextEncoder().encode(raw).length>3000000)throw Error('Saved conversation history exceeds 3 MB.');
 const p=JSON.parse(raw),ids=new Set();
 if(!p||!Number.isInteger(p.version)||p.version<0||!Array.isArray(p.tasks)||p.tasks.length>40)throw Error('Previous conversation data could not be restored.');
 for(const t of p.tasks){
  if(!t||!text(t.id,120)||ids.has(t.id)||!text(t.title,120)||!text(t.status,40)||!Number.isFinite(Date.parse(t.updated)))throw Error('Invalid saved conversation identity.');ids.add(t.id);
  if(!Array.isArray(t.messages)||t.messages.length>100||t.messages.some(m=>!m||!text(m.id,120)||!['user','assistant'].includes(m.role)||!text(m.text,14000)))throw Error('Invalid saved conversation message.');
  if(!Array.isArray(t.context)||t.context.length>8||t.context.some(c=>!c||!text(c.name,120)||!text(c.content,100000)||new TextEncoder().encode(c.content).length>100000)||new Set(t.context.map(c=>c.name)).size!==t.context.length)throw Error('Invalid saved conversation context.');
  if(!Array.isArray(t.surfaces)||t.surfaces.length>200||t.surfaces.some(s=>!s||!text(s.id,120)||![...SURFACES,'about'].includes(s.type)||!text(s.reason,1000)||s.content!==undefined&&!text(s.content,500000)))throw Error('Invalid saved contextual result.');
  if(!Array.isArray(t.events)||t.events.length>250||t.events.some(e=>!e||!text(e.text,14000)||!text(e.kind,120)))throw Error('Invalid saved activity.');
  if(t.delegations!==undefined&&(!Array.isArray(t.delegations)||t.delegations.length>12||t.delegations.some(d=>!d||!text(d.specialist,120)||!text(d.status,40)||!text(d.assignment,14000))))throw Error('Invalid saved delegation.');
  if(t.measurements!==undefined&&(!Array.isArray(t.measurements)||t.measurements.length>200||t.measurements.some(m=>!m||!text(m.operation,120)||!Number.isFinite(m.duration_ms)||m.duration_ms<0||!text(m.scope,1000))))throw Error('Invalid saved measurement.');
 }
 return p;
}
