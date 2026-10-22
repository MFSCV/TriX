import {preset,presetNames,validate,buildConfig} from './model.mjs';
export const skills = [
 {id:'environment-planner',status:'active',kind:'Local deterministic tool',scope:'Prepare profiles and apply explicit planning constraints.'},
 {id:'compatibility-validator',status:'active',kind:'Local deterministic tool',scope:'Run the existing compatibility engine and preserve qualification gates.'},
 {id:'configuration-writer',status:'active',kind:'Local deterministic tool',scope:'Generate the validated planning envelope; no deployment.'},
 {id:'consolidate-preproduction',status:'available-in-assistant',kind:'Authoring skill',scope:'Available to the development assistant; not installed in this static application.'},
 {id:'security-audit',status:'available-in-assistant',kind:'Audit skill',scope:'Available to the development assistant; requires an isolated audit runner and independent verification.'},
 {id:'SkillSpector',status:'not-verified',kind:'External integration candidate',scope:'Separate DrClick package identified; TriX installation and execution have not been verified.'},
 {id:'Ghidra',status:'not-integrated',kind:'Binary analysis adapter',scope:'Requires a sandboxed headless runner, pinned artifacts, resource limits and audit receipts.'},
 {id:'NemoClaw / OpenShell',status:'not-integrated',kind:'Sandbox adapter',scope:'Requires runtime policy enforcement and qualification for TriX.'},
 {id:'Security Workflows',status:'not-verified',kind:'CI integration',scope:'Prior integration reported elsewhere; no workflow files in this Site checkout.'},
 {id:'AFOA / TensorRT-RTX',status:'not-integrated',kind:'Infrastructure / inference adapters',scope:'External packages do not establish TriX runtime integration or GPU qualification.'}
];
export function respond(prompt,current){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2000)return {status:'clarify',message:'Enter a request between 1 and 2,000 characters.'};
 const input=prompt.trim(), p=input.toLowerCase();
 if(/^(help|\/help)$/.test(p))return {status:'info',message:'Use “profile cpu”, “profile apple”, “profile nvidia”, “profile amd”, “offline on”, “offline off”, “validate”, “generate”, or “skills”. Profile requests replace the scenario after you apply the preview. Other requests need the future model-backed runtime.'};
 if(/^(skills|\/skills)$/.test(p))return {status:'info',message:skills.map(s=>`${s.id}: ${s.status}`).join('\n')};
 if(/^(validate|check compatibility|\/validate)$/.test(p)){const r=validate(current);return {status:'validated',agent:'compatibility-validator',message:`Validation completed: ${r.errors} blockers, ${r.warnings} conditions. Physical qualification is still required.`,issues:r.issues};}
 if(/^(generate|export configuration|\/generate)$/.test(p)){const r=validate(current);if(r.errors)return {status:'blocked',agent:'configuration-writer',message:`Generation blocked by ${r.errors} compatibility errors. Resolve them in Configure environment.`,issues:r.issues};return {status:'generated',agent:'configuration-writer',message:'Validated planning configuration generated. Use Technical configuration to export JSON, YAML or Markdown.',configuration:buildConfig(current)};}
 const profile=p.match(/^(?:\/profile|profile|use|configure)\s+(.+)$/);
 if(profile){const key=Object.keys(presetNames).find(k=>profile[1]===k||profile[1]===presetNames[k].toLowerCase());if(!key)return {status:'clarify',message:`Choose a profile: ${Object.keys(presetNames).join(', ')}.`};const scenario=preset(key),r=validate(scenario);return {status:'proposed',agent:'environment-planner',message:`Prepared ${presetNames[key]}. Applying replaces the current scenario. ${r.errors} blockers and ${r.warnings} conditions remain.`,scenario};}
 const offline=p.match(/^(?:\/offline|offline)\s+(on|off)$/);
 if(offline){const scenario=structuredClone(current);scenario.offline=offline[1]==='on';const r=validate(scenario);return {status:'proposed',agent:'environment-planner',message:`Prepared offline=${scenario.offline}. ${r.errors} blockers and ${r.warnings} conditions remain.`,scenario};}
 return {status:'clarify',message:'I cannot reliably interpret this request in local command mode. Choose a profile below or type “help”. General natural-language reasoning and external execution require the future authenticated model/runtime integration. No change was made.'};
}
export function applyProposal(proposal,current){if(!proposal||proposal.status!=='proposed'||!proposal.scenario)throw Error('No pending scenario proposal');if(JSON.stringify(current)!==proposal.base)throw Error('Scenario changed. Submit the request again before applying.');return structuredClone(proposal.scenario);}
